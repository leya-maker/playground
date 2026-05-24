// Time-tracker dashboard. Single page, three tabs (Today / Last 7 / Last 30).
// Reads data/dashboard.json (output of automations/time-tracker/rollup.py).

const CLIENT_PALETTE = [
  '#2a4d3e', '#4a6b5b', '#6c8a7c', '#93b09f', '#c8d8cf',
  '#5e3b8c', '#8466b3', '#c97a3f', '#d2a35a', '#b04a3a',
  '#4a6478', '#7d92a4', '#a8b8c6',
];
const INTERNAL_COLORS = {
  'Infrastructure': '#5e3b8c',
  'Business Development': '#c97a3f',
  'People Ops': '#d2a35a',
  'Finance Ops': '#4a6478',
  'Other internal': '#b8b6af',
};
const TASK_COLORS = {
  calendar_meeting: '#2a4d3e',
  calendar_heads_down: '#6c8a7c',
  claude_code: '#5e3b8c',
  gmail_estimated: '#c97a3f',
  drive_estimated: '#d2a35a',
  granola_extra: '#4a6478',
};
const TASK_LABELS = {
  calendar_meeting: 'Meetings',
  calendar_heads_down: 'Heads-down blocks',
  claude_code: 'Claude Code',
  gmail_estimated: 'Gmail (est.)',
  drive_estimated: 'Drive (est.)',
  granola_extra: 'Granola extra',
};

const root = document.getElementById('root');
const asOfEl = document.getElementById('as-of');
const generatedEl = document.getElementById('generated-at');
const tabs = document.querySelectorAll('.tab');

let DATA = null;
let charts = []; // Chart instances to destroy on view switch

function destroyCharts() {
  charts.forEach(c => c.destroy());
  charts = [];
}

function fmtMinutes(min) {
  if (!min || min < 1) return '0m';
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function fmtDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function pickClientColor(name, index) {
  return CLIENT_PALETTE[index % CLIENT_PALETTE.length];
}

function el(tag, props = {}, ...children) {
  const n = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => {
    if (k === 'className') n.className = v;
    else if (k === 'style') Object.assign(n.style, v);
    else if (k.startsWith('on')) n.addEventListener(k.slice(2).toLowerCase(), v);
    else n.setAttribute(k, v);
  });
  children.flat().forEach(c => {
    if (c == null) return;
    n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return n;
}

function kpiCard(label, value, sub) {
  return el('div', { className: 'kpi' },
    el('div', { className: 'kpi-label' }, label),
    el('div', { className: 'kpi-value' }, value),
    sub ? el('div', { className: 'kpi-sub' }, sub) : null,
  );
}

function renderRankedList(items, totalForBar) {
  const ul = el('ul', { className: 'ranked' });
  items.forEach(([name, minutes]) => {
    const pct = totalForBar ? (minutes / totalForBar) * 100 : 0;
    const li = el('li',
      {},
      el('span', { className: 'name' }, name),
      el('span', { className: 'value' }, fmtMinutes(minutes)),
      el('div', { className: 'bar' },
        el('div', { className: 'bar-fill', style: { width: `${pct.toFixed(1)}%` } }),
      ),
    );
    ul.appendChild(li);
  });
  return ul;
}

function chartContainer(id, tall) {
  return el('div', { className: tall ? 'chart-host-tall' : 'chart-host' },
    el('canvas', { id }),
  );
}

// ---------- Today view ----------

let currentDayIndex = null; // index into DATA.last_7.days; null = today (last)

function renderToday() {
  destroyCharts();
  root.innerHTML = '';

  // Determine the day to show: default to most recent in last_7
  const days = DATA.last_7.days;
  if (currentDayIndex === null || currentDayIndex >= days.length) {
    currentDayIndex = days.length - 1;
  }
  const day = days[currentDayIndex];
  const dayStr = day.date;

  // Date picker bar
  root.appendChild(buildDayPicker(days));

  const total = day.total_minutes || 0;
  const calendarEvents = day.calendar_events || [];
  const claudeBlocks = day.claude_blocks || [];

  // Compute wall-clock union of all activity (calendar + claude active)
  const wallMin = unionMinutes(
    [
      ...calendarEvents.map(e => [e.start, e.end]),
      ...claudeBlocks.map(b => [b.start, b.end]),
    ]
  );
  const meetingMin = calendarEvents.filter(e => e.kind === 'meeting').reduce((s, e) => s + (e.minutes || 0), 0);
  const headsDownMin = calendarEvents.filter(e => e.kind !== 'meeting').reduce((s, e) => s + (e.minutes || 0), 0);
  const claudeActiveMin = claudeBlocks.reduce((s, b) => s + (b.minutes || 0), 0);

  // KPIs row
  root.appendChild(el('div', { className: 'summary' },
    kpiCard('Active time', fmtMinutes(total), `tracked, deduped`),
    kpiCard('Wall-clock range', fmtMinutes(wallMin), `first signal → last signal`),
    kpiCard('Meetings', fmtMinutes(meetingMin),
      calendarEvents.length ? `${calendarEvents.filter(e => e.kind === 'meeting').length} on calendar` : null),
    kpiCard('Claude active', fmtMinutes(claudeActiveMin),
      `${claudeBlocks.length} block${claudeBlocks.length === 1 ? '' : 's'}`),
  ));

  if (total === 0 && claudeBlocks.length === 0 && calendarEvents.length === 0) {
    root.appendChild(el('p', { className: 'loading' },
      `No data captured for ${fmtDate(dayStr)} yet.`));
    return;
  }

  // Calendar-style vertical grid: hours down the left, blocks across the right
  root.appendChild(el('div', { className: 'card' },
    el('h3', {}, `Calendar view — ${fmtDate(dayStr)}`),
    buildCalendarGrid(dayStr, calendarEvents, claudeBlocks),
    buildCalendarLegend(),
  ));

  // Donuts
  root.appendChild(el('div', { className: 'grid' },
    el('div', { className: 'card' },
      el('h3', {}, 'By task'),
      chartContainer('today-task'),
    ),
    el('div', { className: 'card' },
      el('h3', {}, 'By client'),
      chartContainer('today-client'),
    ),
    el('div', { className: 'card' },
      el('h3', {}, 'Internal'),
      chartContainer('today-internal'),
    ),
  ));

  drawDonut('today-task', day.per_task, TASK_COLORS, TASK_LABELS);
  drawDonut('today-client', day.per_client, null, null);
  drawDonut('today-internal', day.per_internal, INTERNAL_COLORS, null);
}

function buildDayPicker(days) {
  const wrap = el('div', { className: 'day-picker' });
  days.forEach((d, i) => {
    const btn = el('button', {
      className: 'day-btn' + (i === currentDayIndex ? ' is-active' : '') + (d.missing || d.total_minutes === 0 ? ' is-empty' : ''),
      onclick: () => {
        currentDayIndex = i;
        renderToday();
      },
    },
      el('div', { className: 'day-btn-label' }, fmtDate(d.date).split(',')[0]),
      el('div', { className: 'day-btn-date' }, fmtDate(d.date).split(',')[1] || ''),
      el('div', { className: 'day-btn-hours' }, fmtMinutes(d.total_minutes)),
    );
    wrap.appendChild(btn);
  });
  return wrap;
}

// Minute-resolution union of intervals; returns total minutes covered
function unionMinutes(pairs) {
  const ranges = pairs
    .map(([a, b]) => [new Date(a).getTime(), new Date(b).getTime()])
    .filter(([a, b]) => !isNaN(a) && !isNaN(b) && b > a)
    .sort((p, q) => p[0] - q[0]);
  if (!ranges.length) return 0;
  const merged = [ranges[0]];
  for (let i = 1; i < ranges.length; i++) {
    const last = merged[merged.length - 1];
    if (ranges[i][0] <= last[1]) {
      last[1] = Math.max(last[1], ranges[i][1]);
    } else {
      merged.push([...ranges[i]]);
    }
  }
  return Math.round(merged.reduce((s, [a, b]) => s + (b - a) / 60000, 0));
}

function buildCalendarGrid(dayStr, events, claudeBlocks) {
  // Determine vertical extents: 6am to midnight by default; expand if signal beyond.
  let startH = 6, endH = 24;
  const probes = [
    ...events.map(e => [new Date(e.start), new Date(e.end)]),
    ...claudeBlocks.map(b => [new Date(b.start), new Date(b.end)]),
  ];
  probes.forEach(([s, e]) => {
    const sh = s.getHours() + s.getMinutes() / 60;
    const eh = e.getHours() + e.getMinutes() / 60;
    if (sh < startH) startH = Math.floor(sh);
    if (eh > endH) endH = Math.ceil(eh);
  });
  startH = Math.max(0, startH);
  endH = Math.min(24, Math.max(endH, startH + 6));
  const totalHours = endH - startH;

  const wrap = el('div', { className: 'calgrid' });
  const hoursCol = el('div', { className: 'calgrid-hours' });
  const tracksCol = el('div', { className: 'calgrid-tracks' });

  for (let h = startH; h <= endH; h++) {
    const top = ((h - startH) / totalHours) * 100;
    const label = h === 0 ? '12a' : h === 12 ? 'noon' : h < 12 ? `${h}a` : h === 24 ? '12a' : `${h - 12}p`;
    hoursCol.appendChild(el('div', { className: 'calgrid-hour', style: { top: `${top}%` } }, label));
    tracksCol.appendChild(el('div', { className: 'calgrid-line', style: { top: `${top}%` } }));
  }

  // Two tracks: left = Calendar, right = Claude
  const calTrack = el('div', { className: 'calgrid-track calgrid-track-cal' });
  const cTrack = el('div', { className: 'calgrid-track calgrid-track-claude' });

  function posPctFor(start, end) {
    const s = new Date(start);
    const e = new Date(end);
    const sh = s.getHours() + s.getMinutes() / 60;
    const eh = e.getHours() + e.getMinutes() / 60;
    const top = ((sh - startH) / totalHours) * 100;
    const height = ((eh - sh) / totalHours) * 100;
    return { top, height };
  }

  events.forEach(ev => {
    if (!ev.start || !ev.end) return;
    const { top, height } = posPctFor(ev.start, ev.end);
    if (height <= 0) return;
    const block = el('div', {
      className: 'cal-block ' + (ev.kind === 'meeting' ? 'is-meeting' : 'is-headsdown') + (ev.client && ev.client !== 'untagged' ? ' has-client' : ''),
      style: { top: `${top}%`, height: `${height}%` },
      title: `${ev.summary} — ${fmtMinutes(ev.minutes)}`,
    },
      el('div', { className: 'cal-block-time' },
        new Date(ev.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) +
        ' – ' +
        new Date(ev.end).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })),
      el('div', { className: 'cal-block-title' }, ev.summary || '(untitled)'),
      ev.client && ev.client !== 'untagged'
        ? el('div', { className: 'cal-block-meta' }, ev.client)
        : null,
    );
    calTrack.appendChild(block);
  });

  claudeBlocks.forEach(b => {
    if (!b.start || !b.end || b.minutes <= 0) return;
    const { top, height } = posPctFor(b.start, b.end);
    if (height <= 0) return;
    const startLabel = new Date(b.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const endLabel = new Date(b.end).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const block = el('div', {
      className: 'cal-block is-claude',
      style: { top: `${top}%`, height: `${height}%` },
      title: `Claude active ${startLabel} – ${endLabel} (${fmtMinutes(b.minutes)})`,
    },
      el('div', { className: 'cal-block-time' }, `${startLabel} – ${endLabel}`),
      el('div', { className: 'cal-block-title' }, 'Claude Code'),
      el('div', { className: 'cal-block-meta' }, fmtMinutes(b.minutes)),
    );
    cTrack.appendChild(block);
  });

  tracksCol.appendChild(calTrack);
  tracksCol.appendChild(cTrack);
  wrap.appendChild(hoursCol);
  wrap.appendChild(tracksCol);
  wrap.style.height = `${totalHours * 30}px`;
  return wrap;
}

function buildCalendarLegend() {
  return el('div', { className: 'legend' },
    el('span', { className: 'legend-item' },
      el('span', { className: 'legend-swatch', style: { background: '#2a4d3e' } }), 'Meeting'),
    el('span', { className: 'legend-item' },
      el('span', { className: 'legend-swatch', style: { background: '#6c8a7c' } }), 'Heads-down block'),
    el('span', { className: 'legend-item' },
      el('span', { className: 'legend-swatch', style: { background: '#5e3b8c' } }), 'Claude active'),
  );
}

// ---------- Last 7 / Last 30 view ----------

function renderWindow(view, label) {
  destroyCharts();
  root.innerHTML = '';

  const totals = view.totals || {};
  const days = view.days || [];
  const total = totals.minutes || 0;
  const clientPct = total ? Math.round((totals.client_minutes / total) * 100) : 0;
  const delRate = totals.delegation_rate;
  const delPct = delRate == null ? '—' : `${Math.round(delRate * 100)}%`;
  const avgPerDay = days.length ? total / days.length : 0;

  // Warnings if data is sparse / inflated
  const missingCount = days.filter(d => d.missing || d.total_minutes === 0).length;
  if (missingCount > 0) {
    root.appendChild(el('div', { className: 'warn-banner' },
      `${missingCount} of ${days.length} day${days.length === 1 ? '' : 's'} have no captured data yet (nightly backfill will fill them in).`));
  }

  // KPIs
  root.appendChild(el('div', { className: 'summary' },
    kpiCard('Total', fmtMinutes(total), `${label}`),
    kpiCard('Daily average', fmtMinutes(Math.round(avgPerDay)), null),
    kpiCard('On client work', fmtMinutes(totals.client_minutes), `${clientPct}%`),
    kpiCard('Delegation rate', delPct, `${totals.tier_invocations || 0} agent actions`),
  ));

  // Stacked bar chart per day
  root.appendChild(el('div', { className: 'card' },
    el('h3', {}, 'Per day, by task'),
    chartContainer('window-bar', true),
  ));

  // Three donuts
  root.appendChild(el('div', { className: 'grid' },
    el('div', { className: 'card' },
      el('h3', {}, 'Time by client'),
      chartContainer('window-client'),
    ),
    el('div', { className: 'card' },
      el('h3', {}, 'Internal time'),
      chartContainer('window-internal'),
    ),
    el('div', { className: 'card' },
      el('h3', {}, 'Tasks share'),
      chartContainer('window-task'),
    ),
  ));

  // Ranked tables under each donut
  root.appendChild(el('div', { className: 'grid' },
    el('div', { className: 'card card-tight' },
      el('h3', {}, 'Clients ranked'),
      renderRankedList(Object.entries(totals.per_client || {}), totals.client_minutes),
    ),
    el('div', { className: 'card card-tight' },
      el('h3', {}, 'Internal categories'),
      renderRankedList(Object.entries(totals.per_internal || {}), totals.internal_minutes),
    ),
    el('div', { className: 'card card-tight' },
      el('h3', {}, 'Tasks'),
      renderRankedList(Object.entries(totals.per_task || {}).map(([k, v]) => [TASK_LABELS[k] || k, v]), total),
    ),
  ));

  drawStackedBars('window-bar', days);
  drawDonut('window-client', totals.per_client, null, null);
  drawDonut('window-internal', totals.per_internal, INTERNAL_COLORS, null);
  drawDonut('window-task', totals.per_task, TASK_COLORS, TASK_LABELS);
}

function drawDonut(canvasId, data, fixedColors, labelMap) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const entries = Object.entries(data || {}).filter(([_, v]) => v > 0);
  if (!entries.length) {
    canvas.parentElement.innerHTML = '<p class="loading" style="padding:48px 0">No data.</p>';
    return;
  }
  const labels = entries.map(([k, _], i) => labelMap ? (labelMap[k] || k) : k);
  const values = entries.map(([_, v]) => v);
  const colors = entries.map(([k, _], i) =>
    fixedColors ? (fixedColors[k] || CLIENT_PALETTE[i % CLIENT_PALETTE.length]) : pickClientColor(k, i)
  );

  const chart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderColor: '#ffffff',
        borderWidth: 2,
        hoverOffset: 6,
      }],
    },
    options: {
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 10, boxHeight: 10, font: { size: 11 }, padding: 12 },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.label}: ${fmtMinutes(ctx.parsed)}`,
          },
        },
      },
    },
  });
  charts.push(chart);
}

function drawStackedBars(canvasId, days) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const taskKeys = ['calendar_meeting', 'calendar_heads_down', 'claude_code', 'gmail_estimated', 'drive_estimated', 'granola_extra'];
  const labels = days.map(d => fmtDate(d.date));
  const datasets = taskKeys.map(key => ({
    label: TASK_LABELS[key],
    data: days.map(d => (d.per_task || {})[key] || 0),
    backgroundColor: TASK_COLORS[key],
    borderWidth: 0,
    stack: 'task',
    barThickness: 'flex',
    maxBarThickness: 38,
  }));

  const chart = new Chart(canvas, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 10, boxHeight: 10, font: { size: 11 }, padding: 12 },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${fmtMinutes(ctx.parsed.y)}`,
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          grid: { display: false },
          ticks: { font: { size: 10 }, color: '#7d7c77' },
        },
        y: {
          stacked: true,
          grid: { color: '#eeece6' },
          ticks: {
            font: { size: 10 },
            color: '#7d7c77',
            callback: (v) => v >= 60 ? `${Math.round(v / 60)}h` : `${v}m`,
          },
        },
      },
    },
  });
  charts.push(chart);
}

// ---------- Boot ----------

async function boot() {
  try {
    const resp = await fetch('data/dashboard.json', { cache: 'no-store' });
    DATA = await resp.json();
  } catch (e) {
    root.innerHTML = `<p class="loading">Could not load dashboard.json (run <code>python automations/time-tracker/rollup.py</code>).</p>`;
    return;
  }

  asOfEl.textContent = `Through ${fmtDate(DATA.as_of)}`;
  if (DATA.generated_at) {
    const g = new Date(DATA.generated_at);
    generatedEl.textContent = `Updated ${g.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`;
  }

  switchTab('today');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      switchTab(tab.dataset.view);
    });
  });

  // Methodology dialog
  const dialog = document.getElementById('methodology');
  document.getElementById('show-methodology').addEventListener('click', (e) => {
    e.preventDefault(); dialog.showModal();
  });
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
}

function switchTab(view) {
  if (view === 'today') renderToday();
  else if (view === 'last_7') renderWindow(DATA.last_7, 'Last 7 days');
  else if (view === 'last_30') renderWindow(DATA.last_30, 'Last 30 days');
}

boot();

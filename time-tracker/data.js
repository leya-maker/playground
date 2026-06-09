// Fabricated sample data shaped like the real dashboard.json.
// Tuesday 26 May 2026 — a believable Leya workday.
// All numbers are minutes. Times in 24h local.
//
// Production note: in the real app this is loaded via fetch('data/dashboard.json').
// The shape below matches that file 1:1 — only `today` is filled in for this design.

window.DASHBOARD = {
  as_of: "2026-05-26",
  today: {
    date: "2026-05-26",
    weekday: "Tuesday",
    total_minutes: 496,
    wall_clock: { start: "07:45", end: "18:15" },
    per_task: [
      { key: "agent",    label: "Agent work",      minutes: 330, modeled: false },
      { key: "meetings", label: "Meetings",        minutes: 105, modeled: false },
      { key: "gmail",    label: "Gmail (est.)",    minutes: 28,  modeled: true  },
      { key: "drive",    label: "Drive (est.)",    minutes: 18,  modeled: true  },
      { key: "granola",  label: "Granola extra",   minutes: 15,  modeled: false },
    ],
    per_client: [
      { key: "NABU",             label: "NABU",            minutes: 105 },
      { key: "ALDF",             label: "ALDF",            minutes: 75  },
      { key: "Obama",            label: "Obama Foundation",minutes: 45  },
      { key: "HFNY",             label: "HFNY",            minutes: 45  },
      { key: "CreativeMornings", label: "CreativeMornings",minutes: 30  },
      { key: "CCC",              label: "CCC",             minutes: 15  },
      { key: "Internal",         label: "Internal",        minutes: 180 },
    ],
    per_internal: [
      { key: "BD",      label: "Business Development", minutes: 120 },
      { key: "Infra",   label: "Infrastructure",       minutes: 60  },
    ],
    calendar_events: [
      { id: "c1", start: "09:00", end: "09:30", title: "Kathleen weekly sync",
        kind: "sub-sync", client_split: ["NABU", "CCC", "ALDF"], attendees: 2 },
      { id: "c2", start: "10:00", end: "10:45", title: "ALDF · Q3 campaign brief",
        kind: "client", client: "ALDF", attendees: 4 },
      { id: "c3", start: "11:00", end: "11:30", title: "Draft NABU memo",
        kind: "solo", note: "reminder, not counted" },
      { id: "c4", start: "14:00", end: "14:45", title: "Obama Foundation · pipeline review",
        kind: "client", client: "Obama", attendees: 3 },
      { id: "c5", start: "16:00", end: "16:30", title: "CreativeMornings monthly",
        kind: "client", client: "CreativeMornings", attendees: 2 },
    ],
    claude_blocks: [
      { id: "a1", start: "07:45", end: "09:00", minutes: 75,
        category: "Internal", subcategory: "Infrastructure",
        label: "Agent infra · rollup pipeline" },
      { id: "a2", start: "09:30", end: "10:00", minutes: 30,
        category: "Internal", subcategory: "BD",
        label: "BD prep · Apex follow-up" },
      { id: "a3", start: "10:45", end: "12:15", minutes: 90,
        category: "NABU",
        label: "NABU · gala recap draft" },
      { id: "a4", start: "13:00", end: "13:45", minutes: 45,
        category: "ALDF",
        label: "ALDF · campaign brief build" },
      { id: "a5", start: "14:45", end: "15:30", minutes: 45,
        category: "HFNY",
        label: "HFNY · training deck outline" },
      { id: "a6", start: "16:30", end: "18:15", minutes: 105,
        category: "Internal", subcategory: "BD",
        label: "BD · proposal drafts + outreach" },
    ],
    sources: { gmail_count: 14, drive_count: 6, granola_meetings: 3 },
  },
  // 14-day strip for the date picker. minutes per day for the spark bar.
  // weekend flag drives the intent-check cue.
  recent_14: [
    { date: "2026-05-13", weekday: "Wed", minutes: 462, weekend: false },
    { date: "2026-05-14", weekday: "Thu", minutes: 510, weekend: false },
    { date: "2026-05-15", weekday: "Fri", minutes: 388, weekend: false },
    { date: "2026-05-16", weekday: "Sat", minutes: 95,  weekend: true  },
    { date: "2026-05-17", weekday: "Sun", minutes: 0,   weekend: true  },
    { date: "2026-05-18", weekday: "Mon", minutes: 502, weekend: false },
    { date: "2026-05-19", weekday: "Tue", minutes: 471, weekend: false },
    { date: "2026-05-20", weekday: "Wed", minutes: 433, weekend: false },
    { date: "2026-05-21", weekday: "Thu", minutes: 528, weekend: false },
    { date: "2026-05-22", weekday: "Fri", minutes: 354, weekend: false },
    { date: "2026-05-23", weekday: "Sat", minutes: 0,   weekend: true  },
    { date: "2026-05-24", weekday: "Sun", minutes: 0,   weekend: true  },
    { date: "2026-05-25", weekday: "Mon", minutes: 488, weekend: false },
    { date: "2026-05-26", weekday: "Tue", minutes: 496, weekend: false, is_today: true },
  ],
};

// ---------- 56-day extended window: Apr 1 → May 26 2026 ----------
// Deterministic generator so the prototype is stable; mirrors the shape the
// real rollup.py emits (per_task, per_client, per_internal, top_client, etc.).

function _mulberry32(seed) {
  return function() {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (((t ^ (t >>> 14)) >>> 0) / 4294967296);
  };
}

function _dow(dateStr) {
  return new Date(dateStr + "T12:00:00Z").getUTCDay(); // 0=Sun, 6=Sat
}

const _WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const _CLIENT_POOL = [
  // weighted picks — earlier entries more common
  "NABU", "ALDF", "NABU", "ALDF", "Obama", "HFNY",
  "CreativeMornings", "NABU", "ALDF", "CCC", "HFNY", "Apex", "Pratt",
];

function _generateDays() {
  const out = [];
  const start = new Date("2026-04-01T12:00:00Z");
  const end   = new Date("2026-05-26T12:00:00Z");

  for (let i = 0; ; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    if (d > end) break;
    const date = d.toISOString().slice(0, 10);
    const dow = _dow(date);
    const weekend = dow === 0 || dow === 6;
    const rng = _mulberry32(parseInt(date.replaceAll("-", ""), 10));

    // Total minutes
    let total;
    if (dow === 0) total = 0;
    else if (dow === 6) {
      // Saturday — mostly 0, two seeded breaches
      if (date === "2026-05-16") total = 95;
      else if (date === "2026-04-18") total = 110;
      else total = 0;
    } else {
      // Weekday: 360-560 (mid 460)
      total = Math.round(360 + rng() * 200);
      // Specific tagged day
      if (date === "2026-05-26") total = 496; // matches today.total
      if (date === "2026-05-14") total = 528;
      if (date === "2026-04-30") total = 612; // a big day
    }

    if (total === 0) {
      out.push({
        date, weekday: _WD[dow], dow, weekend,
        total_minutes: 0, per_task: [], per_client: [], per_internal: [],
        meeting_minutes: 0, agent_minutes: 0, gmail_minutes: 0, drive_minutes: 0,
        top_client: null, top_internal: null,
        wall_clock: null,
      });
      continue;
    }

    // Per-task distribution. Weekend mode shifts toward agent-only.
    const agentPct    = 0.55 + rng() * 0.18;
    const meetingsPct = weekend ? 0 : 0.10 + rng() * 0.20;
    const gmailPct    = weekend ? 0.02 : 0.04 + rng() * 0.05;
    const drivePct    = weekend ? 0.01 : 0.02 + rng() * 0.03;
    let granolaPct    = 1 - agentPct - meetingsPct - gmailPct - drivePct;
    if (granolaPct < 0) granolaPct = 0;

    const per_task = [
      { key: "agent",    label: "Agent work",    minutes: Math.round(total * agentPct) },
      { key: "meetings", label: "Meetings",      minutes: Math.round(total * meetingsPct) },
      { key: "gmail",    label: "Gmail (est.)",  minutes: Math.round(total * gmailPct),   modeled: true },
      { key: "drive",    label: "Drive (est.)",  minutes: Math.round(total * drivePct),   modeled: true },
      { key: "granola",  label: "Granola extra", minutes: Math.round(total * granolaPct) },
    ].filter((p) => p.minutes > 0);

    // Internal split
    const internalPct = weekend ? 1.0 : 0.18 + rng() * 0.18;
    const internalAmt = Math.round(total * internalPct);
    const clientAmt   = total - internalAmt;

    // Pick 2-4 clients
    const numClients = weekend ? 1 : (2 + Math.floor(rng() * 3));
    const pickedKeys = new Set();
    while (pickedKeys.size < numClients && pickedKeys.size < _CLIENT_POOL.length) {
      pickedKeys.add(_CLIENT_POOL[Math.floor(rng() * _CLIENT_POOL.length)]);
    }
    const picked = [...pickedKeys].map((k) => ({ key: k, label: k, minutes: 0 }));

    // Weight first pick higher
    let remaining = clientAmt;
    picked.forEach((c, idx) => {
      if (idx === picked.length - 1) c.minutes = Math.max(0, remaining);
      else {
        const share = idx === 0 ? 0.45 + rng() * 0.20 : 0.25 + rng() * 0.20;
        c.minutes = Math.round(clientAmt * share);
        remaining -= c.minutes;
      }
    });
    picked.sort((a, b) => b.minutes - a.minutes);

    // Internal subcategory split
    const bdPct = 0.35 + rng() * 0.45;
    const per_internal = [
      { key: "BD",             label: "Business Development", minutes: Math.round(internalAmt * bdPct) },
      { key: "Infrastructure", label: "Infrastructure",       minutes: Math.round(internalAmt * (1 - bdPct)) },
    ].filter((x) => x.minutes > 0);

    const per_client = [
      ...picked.filter((c) => c.minutes > 0),
      ...(internalAmt > 0 ? [{ key: "Internal", label: "Internal", minutes: internalAmt }] : []),
    ];

    // Wall clock window
    const startH = weekend ? (9 + Math.floor(rng() * 2)) : (7 + Math.floor(rng() * 2));
    const endH   = weekend ? (11 + Math.floor(rng() * 3)) : (17 + Math.floor(rng() * 3));

    out.push({
      date, weekday: _WD[dow], dow, weekend,
      total_minutes: total,
      per_task, per_client, per_internal,
      meeting_minutes: per_task.find((p) => p.key === "meetings")?.minutes || 0,
      agent_minutes:   per_task.find((p) => p.key === "agent")?.minutes    || 0,
      gmail_minutes:   per_task.find((p) => p.key === "gmail")?.minutes    || 0,
      drive_minutes:   per_task.find((p) => p.key === "drive")?.minutes    || 0,
      top_client:      picked.filter((c) => c.minutes > 0)[0] || null,
      top_internal:    per_internal[0] || null,
      wall_clock: {
        start: `${String(startH).padStart(2, "0")}:00`,
        end:   `${String(endH).padStart(2, "0")}:00`,
      },
    });
  }
  return out;
}

function _sumByKey(daysArr, field) {
  const map = new Map();
  daysArr.forEach((d) => {
    (d[field] || []).forEach((x) => {
      const prev = map.get(x.key);
      if (prev) prev.minutes += x.minutes;
      else map.set(x.key, { ...x, minutes: x.minutes });
    });
  });
  return [...map.values()].sort((a, b) => b.minutes - a.minutes);
}

(function buildExtended() {
  const days = _generateDays();
  const last7  = days.slice(-7);
  const last30 = days.slice(-30);

  function rollup(daysArr) {
    const total = daysArr.reduce((a, d) => a + d.total_minutes, 0);
    const weekdays = daysArr.filter((d) => !d.weekend);
    const weekends = daysArr.filter((d) => d.weekend);
    const weekdayActiveDays = weekdays.filter((d) => d.total_minutes > 0).length || 1;
    const weekdayAvg = Math.round(weekdays.reduce((a, d) => a + d.total_minutes, 0) / weekdayActiveDays);
    const weekendTotal = weekends.reduce((a, d) => a + d.total_minutes, 0);
    const heaviest = [...daysArr].sort((a, b) => b.total_minutes - a.total_minutes)[0];
    return {
      total, weekday_avg: weekdayAvg, weekend_total: weekendTotal,
      heaviest_day: heaviest,
      per_client:   _sumByKey(daysArr, "per_client"),
      per_internal: _sumByKey(daysArr, "per_internal"),
      per_task:     _sumByKey(daysArr, "per_task"),
    };
  }

  // group by month for Month review
  const byMonth = {};
  days.forEach((d) => {
    const m = d.date.slice(0, 7); // YYYY-MM
    (byMonth[m] = byMonth[m] || []).push(d);
  });
  const months = Object.entries(byMonth).map(([m, ds]) => ({
    month: m,
    label: new Date(m + "-01T12:00:00Z").toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
    days: ds,
    totals: rollup(ds),
  }));

  window.DASHBOARD.days     = days;
  window.DASHBOARD.last_7   = { totals: rollup(last7),  days: last7 };
  window.DASHBOARD.last_30  = { totals: rollup(last30), days: last30 };
  window.DASHBOARD.extended = { totals: rollup(days),   days, months };
})();

// Brand-aligned client color map. Cool spine extended with two warmer-leaning
// accents (mint-green for HFNY, a warmer purple/teal for CCC/Apex/Pratt) so
// 7+ clients are distinguishable side-by-side in a donut without drifting
// off-palette.
window.CLIENT_COLORS = {
  ALDF:             "#1E2C8F", // Blueberry-900 (deep navy)
  NABU:             "#717FEF", // Cornflower
  Obama:            "#384BCF", // Blueberry primary
  HFNY:             "#7BC57A", // mint-green (most distinct, on the warm edge of brand)
  CreativeMornings: "#C5CBFF", // Periwinkle
  CCC:              "#5B3FB0", // deeper violet
  Pratt:            "#8A97E8", // Blueberry-300
  Apex:             "#3FA5C0", // teal
  ParkCity:         "#2C7D9F",
  CaveCanem:        "#6B4F9C",
  KBC:              "#9DA6E0",
  // Real-data names that include spaces; mirror the no-space variants above.
  "NYU Langone":         "#2C5F8C", // deeper teal-blue, distinct from Apex
  "Cave Canem":          "#6B4F9C",
  "Park City Presents":  "#2C7D9F",
  Internal:         "#C5CBFF", // Periwinkle (non-client; filtered out of "By client" donut)
  // Internal subcategories
  BD:               "#B8E89A",
  Infrastructure:   "#D6DCFF",
  PeopleOps:        "#E0E5FF",
  FinanceOps:       "#E8ECFF",
  OtherInternal:    "#ECECE3",
};

// Task colors — same cool-spine logic.
window.TASK_COLORS = {
  agent:     "#384BCF",
  meetings:  "#717FEF",
  headsdown: "#8A97E8",
  gmail:     "#C5CBFF",
  drive:     "#D6DCFF",
  granola:   "#B8E89A",
};

// ============================================================
// Live-data adapter
// ------------------------------------------------------------
// Fetches data/dashboard.json (produced by automations/time-tracker/rollup.py)
// and reshapes it onto the prototype's contract. The prototype uses HH:MM time
// strings, arrays for per_task/per_client/per_internal, and short keys
// (meetings/agent/gmail/...). The rollup emits ISO timestamps, objects keyed
// by full names, and snake_case task keys. This adapter bridges the two.
//
// On success, window.DASHBOARD is replaced in place and a 'dashboard-loaded'
// event fires so App can re-render. On failure (no file, CORS, parse error)
// the fabricated fallback above keeps the prototype usable.
// ============================================================

(function setupLiveData() {
  const TASK_KEY = {
    calendar_meeting:    { key: "meetings",  label: "Meetings" },
    calendar_heads_down: { key: "headsdown", label: "Heads-down" },
    agent_work:          { key: "agent",     label: "Agent work" },
    gmail_estimated:     { key: "gmail",     label: "Gmail (est.)", modeled: true },
    drive_estimated:     { key: "drive",     label: "Drive (est.)", modeled: true },
    granola_extra:       { key: "granola",   label: "Granola extra" },
  };
  const INTERNAL_KEY = {
    "Business Development": { key: "BD",             label: "Business Development" },
    "Infrastructure":       { key: "Infrastructure", label: "Infrastructure" },
    "People Ops":           { key: "PeopleOps",      label: "People Ops" },
    "Finance Ops":          { key: "FinanceOps",     label: "Finance Ops" },
    "Other internal":       { key: "OtherInternal",  label: "Other internal" },
  };
  const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Grid range used by the Day view; blocks/events fully outside are dropped
  // and partial-overlap items are clipped to the edge so the grid stays clean.
  // Keep in sync with HOUR_START/HOUR_END in app.jsx.
  const GRID_START = "07:00";
  const GRID_END   = "19:00";
  function toMin(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  }
  function clipToGrid(startHHMM, endHHMM) {
    const a = toMin(startHHMM), b = toMin(endHHMM);
    const gA = toMin(GRID_START), gB = toMin(GRID_END);
    if (b <= gA || a >= gB) return null;       // entirely outside
    const start = a < gA ? GRID_START : startHHMM;
    const end   = b > gB ? GRID_END   : endHHMM;
    return { start, end };
  }

  // Pull HH:MM from any ISO timestamp the rollup emits. Calendar events carry a
  // local offset (..."-04:00"); Claude blocks are UTC. new Date(...) parses
  // both into a Date; getHours/getMinutes returns the browser's local wall
  // clock, which for Leya's NY laptop matches her calendar.
  function extractTime(isoStr) {
    if (!isoStr) return null;
    const d = new Date(isoStr);
    if (isNaN(d)) return null;
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return hh + ":" + mm;
  }

  function adaptEvent(e, i) {
    const rawStart = extractTime(e.start);
    const rawEnd   = extractTime(e.end);
    if (!rawStart || !rawEnd) return null;
    const clipped = clipToGrid(rawStart, rawEnd);
    if (!clipped) return null;
    const base = { id: "c" + (i + 1), start: clipped.start, end: clipped.end, title: e.summary || "(untitled)" };
    // Reminders and solo blocks both render as "reminder, not counted" in the
    // design; rollup tags them kind=reminder (or solo if Granola ever emits one).
    if (e.kind === "reminder" || e.kind === "solo") {
      return Object.assign(base, { kind: "solo", note: "reminder, not counted" });
    }
    if (e.client) {
      return Object.assign(base, {
        kind: "client",
        client: e.client,
        attendees: Array.isArray(e.attendees) ? e.attendees.length : 0,
      });
    }
    if (Array.isArray(e.client_assignments) && e.client_assignments.length > 1) {
      return Object.assign(base, {
        kind: "sub-sync",
        client_split: e.client_assignments,
        attendees: Array.isArray(e.attendees) ? e.attendees.length : 0,
      });
    }
    return Object.assign(base, {
      kind: "meeting",
      attendees: Array.isArray(e.attendees) ? e.attendees.length : 0,
    });
  }

  function adaptDay(rawDay) {
    const total = rawDay.total_minutes || 0;
    const dt    = new Date(rawDay.date + "T12:00:00Z");
    const dow   = dt.getUTCDay();
    const weekend = dow === 0 || dow === 6;

    const per_task = Object.entries(rawDay.per_task || {})
      .filter(([, m]) => m > 0)
      .map(([rk, m]) => Object.assign(
        { key: rk, label: rk, minutes: m },
        TASK_KEY[rk] || {},
        { minutes: m },
      ))
      .sort((a, b) => b.minutes - a.minutes);

    const per_client = Object.entries(rawDay.per_client || {})
      .filter(([, m]) => m > 0)
      .map(([name, m]) => ({
        key: name.replace(/\s+/g, ""),
        label: name,
        minutes: m,
      }))
      .sort((a, b) => b.minutes - a.minutes);

    const per_internal = Object.entries(rawDay.per_internal || {})
      .filter(([, m]) => m > 0)
      .map(([name, m]) => Object.assign(
        { key: name.replace(/\s+/g, ""), label: name, minutes: m },
        INTERNAL_KEY[name] || {},
        { minutes: m },
      ))
      .sort((a, b) => b.minutes - a.minutes);

    const calendar_events = (rawDay.calendar_events || rawDay.events || [])
      .filter((e) => e.kind !== "personal")
      .map((e, i) => adaptEvent(e, i))
      .filter(Boolean);

    const claude_blocks = (rawDay.claude_blocks || []).map((b, i) => {
      const rawStart = extractTime(b.start);
      const rawEnd   = extractTime(b.end);
      if (!rawStart || !rawEnd) return null;
      const clipped = clipToGrid(rawStart, rawEnd);
      if (!clipped) return null;
      if (toMin(clipped.end) - toMin(clipped.start) < 5) return null;
      // Per-block attribution lands on the block as primary_label +
      // attribution_kind (set by claude_sessions.py). For "clients" kind the
      // label is a client name (NABU, ALDF, ...); for "internal" kind it's an
      // internal subcategory ("Business Development", "Infrastructure", ...).
      // Map the long internal name to its short key in CLIENT_COLORS so the
      // agent-lane Block component picks up the right palette swatch.
      // Older blocks without attribution fall back to the prior periwinkle
      // "Internal" treatment.
      const kind = b.attribution_kind;
      const label = b.primary_label;
      let category, subcategory, displayLabel;
      if (kind === "clients" && label) {
        category = label;
        displayLabel = label;
      } else if (kind === "internal" && label) {
        const shortKey = (INTERNAL_KEY[label] && INTERNAL_KEY[label].key)
                       || label.replace(/\s+/g, "");
        category = shortKey;
        subcategory = label;
        displayLabel = label;
      } else {
        category = "Internal";
        displayLabel = "Agent session";
      }
      return {
        id: "a" + (i + 1),
        start: clipped.start,
        end:   clipped.end,
        minutes: b.minutes,
        category,
        subcategory,
        label: displayLabel,
      };
    }).filter(Boolean);

    // Wall clock = first start to last end across both lanes.
    const times = [];
    calendar_events.forEach((e) => { times.push(e.start, e.end); });
    claude_blocks.forEach((b)   => { times.push(b.start, b.end); });
    const sorted = times.filter(Boolean).slice().sort();
    const wall_clock = sorted.length
      ? { start: sorted[0], end: sorted[sorted.length - 1] }
      : { start: "09:00", end: "17:00" };

    const meeting_minutes = (rawDay.per_task && rawDay.per_task.calendar_meeting) || 0;
    const agent_minutes   = (rawDay.per_task && rawDay.per_task.agent_work)       || 0;
    const gmail_minutes   = (rawDay.per_task && rawDay.per_task.gmail_estimated)  || 0;
    const drive_minutes   = (rawDay.per_task && rawDay.per_task.drive_estimated)  || 0;

    return {
      date: rawDay.date,
      weekday: WD[dow],
      dow,
      weekend,
      total_minutes: total,
      per_task, per_client, per_internal,
      meeting_minutes, agent_minutes, gmail_minutes, drive_minutes,
      top_client:   per_client.find((c) => c.label !== "Internal") || per_client[0] || null,
      top_internal: per_internal[0] || null,
      wall_clock,
      calendar_events,
      claude_blocks,
      sources: {
        gmail_count: Math.round(gmail_minutes / 2),
        drive_count: Math.round(drive_minutes / 3),
        granola_meetings: Math.round((rawDay.per_task && rawDay.per_task.granola_extra || 0) / 30),
      },
    };
  }

  function _sumByKey(daysArr, field) {
    const map = new Map();
    daysArr.forEach((d) => {
      (d[field] || []).forEach((x) => {
        const prev = map.get(x.key);
        if (prev) prev.minutes += x.minutes;
        else map.set(x.key, Object.assign({}, x));
      });
    });
    return [...map.values()].sort((a, b) => b.minutes - a.minutes);
  }

  function rollup(days) {
    const total = days.reduce((a, d) => a + d.total_minutes, 0);
    const weekdays = days.filter((d) => !d.weekend);
    const weekends = days.filter((d) => d.weekend);
    const wdActive = weekdays.filter((d) => d.total_minutes > 0).length || 1;
    const weekdayAvg = Math.round(
      weekdays.reduce((a, d) => a + d.total_minutes, 0) / wdActive,
    );
    const weekendTotal = weekends.reduce((a, d) => a + d.total_minutes, 0);
    const heaviest = [...days].sort((a, b) => b.total_minutes - a.total_minutes)[0];
    return {
      total, weekday_avg: weekdayAvg, weekend_total: weekendTotal,
      heaviest_day: heaviest,
      per_client:   _sumByKey(days, "per_client"),
      per_internal: _sumByKey(days, "per_internal"),
      per_task:     _sumByKey(days, "per_task"),
    };
  }

  function adaptDashboard(raw) {
    const asOf = raw.as_of;
    const allDays = (raw.extended && raw.extended.days || []).map(adaptDay);
    if (!allDays.length) return null;

    const todayDay = allDays.find((d) => d.date === asOf)
                   || allDays[allDays.length - 1];

    const last7Days  = allDays.slice(-7);
    const last30Days = allDays.slice(-30);
    const recent14   = allDays.slice(-14).map((d) => ({
      date: d.date,
      weekday: d.weekday,
      minutes: d.total_minutes,
      weekend: d.weekend,
      is_today: d.date === asOf || undefined,
    }));

    // Months for Month review.
    const byMonth = {};
    allDays.forEach((d) => {
      const m = d.date.slice(0, 7);
      (byMonth[m] = byMonth[m] || []).push(d);
    });
    const months = Object.entries(byMonth)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([m, ds]) => ({
        month: m,
        label: new Date(m + "-01T12:00:00Z").toLocaleString("en-US", {
          month: "long", year: "numeric", timeZone: "UTC",
        }),
        days: ds,
        totals: rollup(ds),
      }));

    return {
      as_of: asOf,
      today: todayDay,
      recent_14: recent14,
      days: allDays,
      last_7:   { totals: rollup(last7Days),  days: last7Days },
      last_30:  { totals: rollup(last30Days), days: last30Days },
      extended: { totals: rollup(allDays),    days: allDays, months },
      __source: "live",
    };
  }

  // Expose for debugging / tests.
  window.adaptDashboard = adaptDashboard;

  // When the page is built and StaticCrypt-encrypted for deployment, the real
  // dashboard payload is baked into the page as window.BAKED_DASHBOARD_RAW (so
  // the raw JSON never has to be served publicly). Prefer it when present;
  // otherwise fall back to fetching data/dashboard.json (local dev), and on any
  // failure the fabricated sample data above is used.
  const _bakedRaw = (typeof window !== "undefined" && window.BAKED_DASHBOARD_RAW) || null;
  window.LIVE_DASHBOARD_PROMISE = (_bakedRaw
    ? Promise.resolve(_bakedRaw)
    : fetch("data/dashboard.json", { cache: "no-store" }).then((res) => {
        if (!res.ok) throw new Error("http " + res.status);
        return res.json();
      }))
    .then((raw) => {
      const live = adaptDashboard(raw);
      if (!live) throw new Error("adapter returned null");
      window.DASHBOARD = live;
      window.dispatchEvent(new CustomEvent("dashboard-loaded"));
      console.info("[time-tracker] live data loaded:", live.as_of,
                   live.days.length + " days,",
                   live.today.total_minutes + " min today");
      return live;
    })
    .catch((e) => {
      console.warn("[time-tracker] using fabricated data:", e.message);
      window.DASHBOARD.__source = "fabricated";
      window.dispatchEvent(new CustomEvent("dashboard-loaded"));
      return null;
    });
})();

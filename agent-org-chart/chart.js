/* LPM Agent Org Chart - renderer + lens-driven accountability.
   Renders the tree from data.json. Click a card → slide-over panel.
   Click a shared-skill chip OR a matrix row → enter "lens" mode: dim
   everything not involved, ring the source + targets, draw ONE clean
   dotted line per consumer. Exit on click-out / Esc / button. */

(function () {
  'use strict';

  /* ---------- helpers ---------- */

  const el = (tag, attrs = {}, children = []) => {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') node.className = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k === 'text') node.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    });
    (Array.isArray(children) ? children : [children]).forEach((c) => {
      if (c === null || c === undefined || c === false) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  };

  const cssEscape = (s) => (window.CSS && CSS.escape ? CSS.escape(s) : String(s).replace(/(["\\])/g, '\\$1'));
  const escapeHtml = (s) => (s || '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const truncate = (s, n) => (s && s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s || '');
  const stripInline = (s) =>
    (s || '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1')
      .replace(/`(.+?)`/g, '$1').replace(/\[\[(.+?)\]\]/g, '$1');
  const linkifyMd = (raw) => {
    let s = escapeHtml(raw || '');
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/`(.+?)`/g, '<code>$1</code>');
    s = s.replace(/\[\[(.+?)\]\]/g, '<em>$1</em>');
    s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
    return s;
  };

  const labelFromSlug = (s) =>
    (s || '').replace(/-agent$/, '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  /* ---------- phase chip ---------- */

  const PHASE_CLASS = {
    pre2wk: 'phase-pre2wk', '2wk': 'phase-2wk', '30day': 'phase-30day',
    '60day': 'phase-60day', '90day': 'phase-90day', graduated: 'phase-graduated',
  };
  const phaseChip = (phase) => {
    if (!phase) return null;
    const cls = PHASE_CLASS[phase] || 'phase-unknown';
    return el('span', { class: `chip phase-chip ${cls}` }, phase);
  };

  /* ---------- status read (live from manager reviews) ---------- */

  const STATUS_CLASS = {
    'on track': 'status--ontrack',
    'needs attention': 'status--watch',
    'quiet': 'status--quiet',
  };
  const STATUS_LABEL = {
    'on track': 'On track', 'needs attention': 'Needs attention', 'quiet': 'Quiet',
  };
  // A small colored dot for cards. Tooltip carries the manager's note.
  const statusDot = (agent) => {
    const read = agent && agent.status_read;
    if (!read) return null;
    const cls = STATUS_CLASS[read] || 'status--quiet';
    const tip = (STATUS_LABEL[read] || read) + (agent.status_note ? ` — ${agent.status_note}` : '');
    return el('span', { class: `status-dot ${cls}`, title: tip, 'aria-label': tip });
  };
  // A full pill for the panel header.
  const statusPill = (agent) => {
    const read = agent && agent.status_read;
    if (!read) return null;
    const cls = STATUS_CLASS[read] || 'status--quiet';
    return el('span', { class: `chip status-read-pill ${cls}` }, [
      el('span', { class: `status-dot ${cls}` }),
      STATUS_LABEL[read] || read,
    ]);
  };
  // Split a markdown text block into top-level bullet strings (for "Right now").
  const bulletsFromBlock = (text, max) => {
    if (!text) return [];
    const out = [];
    text.split('\n').forEach((ln) => {
      const m = ln.match(/^\s*[-*]\s+(.*)$/);
      if (m && m[1].trim()) out.push(stripInline(m[1].trim()));
    });
    // If there were no markdown bullets, fall back to the first sentence/line.
    if (!out.length) {
      const first = stripInline((text.split('\n').find((l) => l.trim()) || '').trim());
      if (first) out.push(first);
    }
    return typeof max === 'number' ? out.slice(0, max) : out;
  };

  /* ---------- skill chip (shared-aware) ---------- */

  const skillChip = (skill, ownerSlug) => {
    const isShared = !!(skill.shared_with && skill.shared_with.length);
    const cls = 'skill-pill' + (isShared ? ' skill-pill--shared' : '');
    const tooltip = (skill.summary || skill.name) +
      (isShared ? `\n→ also used by: ${skill.shared_with.join(', ')}` : '');
    const children = [skill.name];
    if (isShared) {
      children.push(el('span', { class: 'shared-glyph' }, '↗'));
      children.push(el('span', { class: 'shared-count' }, String(skill.shared_with.length)));
    }
    return el('span', {
      class: cls,
      title: tooltip,
      'data-skill': skill.name,
      'data-skill-owner': ownerSlug,
      'data-skill-shared-with': isShared ? skill.shared_with.join(',') : '',
      role: isShared ? 'button' : null,
      tabindex: isShared ? '0' : null,
    }, children);
  };

  const skillStrip = (skills, ownerSlug) => {
    if (!skills || !skills.length) return null;
    const strip = el('div', { class: 'skill-strip' });
    skills.forEach((s) => strip.appendChild(skillChip(s, ownerSlug)));
    return strip;
  };

  /* ---------- card builders ---------- */

  const buildCeoCard = (ceo) =>
    el('div', { class: 'card card--ceo', 'data-agent-slug': 'leya', tabindex: '-1' }, [
      el('div', { class: 'card-name', text: ceo.name }),
      el('div', { class: 'card-role', text: ceo.title }),
    ]);

  const buildCosCard = (agent, def) => {
    const card = el('button', {
      class: 'card card--cos', type: 'button',
      'data-slug': agent.slug,
      'data-agent-slug': agent.slug,
      'aria-label': `Open ${agent.name} detail panel`,
    }, [
      el('div', { class: 'card-name', text: agent.name }),
      el('div', { class: 'card-role', text: agent.role || def.title }),
      (agent.phase || agent.status_read) ? el('div', { class: 'card-row' }, [phaseChip(agent.phase), statusDot(agent)]) : null,
      skillStrip(def.skills, agent.slug),
    ]);
    card.addEventListener('click', (e) => {
      if (e.target.closest('.skill-pill')) return;
      openPanel(agent);
    });
    return card;
  };

  const buildExecCard = (agent, def) => {
    const card = el('button', {
      class: 'card card--exec', type: 'button',
      'data-slug': agent.slug,
      'data-agent-slug': agent.slug,
      'aria-label': `Open ${agent.name} detail panel`,
    }, [
      el('div', { class: 'card-name', text: def.short || agent.name }),
      el('div', { class: 'card-role', text: 'Executive' }),
      el('div', { class: 'card-row' }, [
        phaseChip(agent.phase),
        statusDot(agent),
        agent.status && agent.status !== 'draft' ? el('span', { class: 'chip status-chip', text: agent.status }) : null,
      ]),
      skillStrip(def.skills, agent.slug),
    ]);
    card.addEventListener('click', (e) => {
      if (e.target.closest('.skill-pill')) return;
      openPanel(agent);
    });
    return card;
  };

  const buildAgentCard = (agent, def, opts = {}) => {
    const kindCls = opts.kindCls ? ' ' + opts.kindCls : '';
    const card = el('button', {
      class: 'card card--agent' + kindCls, type: 'button',
      'data-slug': agent.slug,
      'data-agent-slug': agent.slug,
      'aria-label': `Open ${agent.name} detail panel`,
    }, [
      el('div', { class: 'card-name', text: agent.name }),
      agent.role ? el('div', { class: 'card-role', text: truncate(agent.role, 60) }) : null,
      el('div', { class: 'card-row' }, [
        phaseChip(agent.phase),
        statusDot(agent),
      ]),
      def && def.skills ? skillStrip(def.skills, agent.slug) : null,
    ]);
    card.addEventListener('click', (e) => {
      if (e.target.closest('.skill-pill')) return;
      openPanel(agent);
    });
    return card;
  };

  const buildPersonalCard = (agent, def) => {
    const card = el('button', {
      class: 'card card--personal card--agent', type: 'button',
      'data-slug': agent.slug,
      'data-agent-slug': agent.slug,
      'aria-label': `Open ${agent.name} detail panel`,
    }, [
      el('div', { class: 'card-name', text: agent.name }),
      agent.role ? el('div', { class: 'card-role', text: truncate(agent.role, 40) }) : null,
    ]);
    card.addEventListener('click', () => openPanel(agent));
    return card;
  };

  const buildBenchCard = (bench) =>
    el('div', { class: 'card card--bench', 'data-agent-slug': bench.slug || 'human-bench', tabindex: '-1' }, [
      el('div', { class: 'card-name', text: bench.name }),
      el('ul', {}, bench.members.map((m) =>
        el('li', {}, [el('strong', { text: m.name }), document.createTextNode(' - ' + m.engagements)])
      )),
    ]);

  /* ---------- fan-out connector (CSS-grid based) ---------- */

  const buildFanout = (count) => {
    const wrap = el('div', { class: 'exec-fanout' });
    wrap.appendChild(el('div', { class: 'exec-fanout-trunk' }));
    const drops = el('div', { class: 'exec-fanout-drops' });
    for (let i = 0; i < count; i++) drops.appendChild(el('i'));
    wrap.appendChild(drops);
    return wrap;
  };

  /* ---------- tree assembly ---------- */

  const buildTree = (data) => {
    const chart = document.getElementById('chart');
    chart.innerHTML = '';

    // Tier 1: CEO + personal branch beside
    const leyaTier = el('div', { class: 'tier tier--leya' }, [
      el('div', { class: 'filler' }),
      el('div', { class: 'leya-slot' }, [buildCeoCard(data.spine.ceo)]),
      el('div', { class: 'personal-slot' }, [
        el('span', { class: 'personal-slot-label', text: 'Personal' }),
        ...(data.spine.personal_reports || [])
          .map((p) => {
            const a = data.agents[p.slug];
            return a ? buildPersonalCard(a, p) : null;
          })
          .filter(Boolean),
      ]),
    ]);
    chart.appendChild(leyaTier);

    chart.appendChild(el('div', { class: 'connector-v' }));

    // Tier 2: Rose centered, with ops as a side satellite (mirrors Leya/Personal)
    const rose = data.agents[data.spine.chief_of_staff.slug];
    const opsDefs = data.spine.chief_of_staff.ops_reports || [];
    if (rose) {
      const opsBranch = opsDefs.length ? el('div', { class: 'ops-branch' }, [
        el('span', { class: 'ops-branch-label' }, [
          el('strong', { text: "Rose's ops" }),
        ]),
        ...opsDefs.map((op) => {
          const a = data.agents[op.slug];
          return a ? buildAgentCard(a, op, { kindCls: 'card--ops' }) : null;
        }).filter(Boolean),
      ]) : null;

      const roseTier = el('div', { class: 'tier tier--rose' }, [
        el('div', { class: 'filler' }),
        el('div', { class: 'rose-slot' }, [buildCosCard(rose, data.spine.chief_of_staff)]),
        el('div', { class: 'ops-slot' }, opsBranch ? [opsBranch] : []),
      ]);
      chart.appendChild(roseTier);
    }

    // Fan-out to execs - flows directly from Rose
    chart.appendChild(el('div', { class: 'connector-v connector-v--long' }));
    chart.appendChild(buildFanout(data.spine.executives.length));

    // Tier 3+4: exec columns
    const execGrid = el('div', { class: 'tier--execs' });
    data.spine.executives.forEach((execDef) => {
      const execAgent = data.agents[execDef.slug] || {
        name: execDef.name, slug: execDef.slug, phase: 'unknown',
      };
      const col = el('div', { class: 'exec-column' });
      col.appendChild(buildExecCard(execAgent, execDef));

      if (execDef.direct_reports.length) {
        const reports = el('div', { class: 'exec-reports' });
        execDef.direct_reports.forEach((dr) => {
          if (dr.kind === 'agent') {
            const a = data.agents[dr.slug];
            if (a) reports.appendChild(buildAgentCard(a, dr));
          } else if (dr.kind === 'bench') {
            reports.appendChild(buildBenchCard(dr));
          }
        });
        col.appendChild(reports);
      }
      execGrid.appendChild(col);
    });
    chart.appendChild(execGrid);

    // Matrix view + tally
    buildMatrix(data);
    populateTally(data);

    // Layer-overlay sizing
    requestAnimationFrame(() => requestAnimationFrame(redrawOverlay));
  };

  /* ---------- matrix view ---------- */

  const buildMatrix = (data) => {
    const grid = document.getElementById('matrix-grid');
    grid.innerHTML = '';
    (data.shared_services || []).forEach((s) => {
      const row = el('div', {
        class: 'matrix-row',
        'data-skill': s.skill,
        'data-owner': s.primary_owner_slug,
        'data-consumers': s.shared_with.join(','),
        tabindex: '0',
        role: 'button',
        'aria-label': `Activate lens for skill ${s.skill}`,
      }, [
        el('div', {}, [
          el('span', { class: 'matrix-skill' }, [
            document.createTextNode(s.skill),
            el('span', { class: 'shared-glyph', text: '↗' }),
          ]),
        ]),
        el('div', { class: 'matrix-owner' }, [
          el('span', { class: 'ow-label', text: 'Owned by' }),
          el('code', { text: s.primary_owner_label || labelFromSlug(s.primary_owner_slug) }),
        ]),
        el('div', { class: 'matrix-consumers' },
          s.shared_with.map((c) =>
            el('span', { class: 'matrix-consumer', text: labelFromSlug(c) }))),
      ]);
      row.addEventListener('click', () => activateLens(s.skill, s.primary_owner_slug));
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activateLens(s.skill, s.primary_owner_slug);
        }
      });
      grid.appendChild(row);
    });
  };

  const populateTally = (data) => {
    const agents = Object.values(data.agents).filter((a) => a && a.exists !== false);
    document.getElementById('tally-agents').textContent = agents.length;
    // count distinct skills across spine
    const skills = new Set();
    const walk = (defs) => defs && defs.forEach((d) => (d.skills || []).forEach((s) => skills.add(s.name)));
    walk(data.spine.chief_of_staff && [data.spine.chief_of_staff]);
    walk(data.spine.chief_of_staff && data.spine.chief_of_staff.ops_reports);
    (data.spine.executives || []).forEach((e) => {
      walk([e]);
      walk(e.direct_reports);
    });
    document.getElementById('tally-skills').textContent = skills.size;
    document.getElementById('tally-shared').textContent = (data.shared_services || []).length;
  };

  /* ---------- accountability lens ---------- */

  let lensActive = false;
  let currentLens = null; // { skill, ownerSlug }
  let lensData = [];

  const lensToggleBtn = () => document.getElementById('lens-toggle');
  const lensHintBanner = () => document.getElementById('lens-hint');

  const setLensMode = (on) => {
    lensActive = on;
    const btn = lensToggleBtn();
    btn.setAttribute('aria-pressed', String(on));
    btn.querySelector('.lens-hint').textContent = on ? 'on' : 'off';
    btn.querySelector('.lens-label').textContent = on ? 'Accountability lens' : 'Accountability lens';
    if (on) {
      lensHintBanner().hidden = false;
    } else {
      lensHintBanner().hidden = true;
      clearLens();
    }
  };

  const clearLens = () => {
    currentLens = null;
    const chart = document.getElementById('chart');
    chart.classList.remove('lens-focused');
    chart.querySelectorAll('.is-source, .is-target').forEach((n) => {
      n.classList.remove('is-source', 'is-target');
    });
    chart.querySelectorAll('.is-active-pill').forEach((n) => n.classList.remove('is-active-pill'));
    document.querySelectorAll('.matrix-row.is-active').forEach((n) => n.classList.remove('is-active'));
    redrawOverlay();
  };

  const activateLens = (skillName, ownerSlug) => {
    if (!lensActive) setLensMode(true);
    const skill = lensData.find((s) => s.skill === skillName);
    if (!skill) return;
    currentLens = { skill: skillName, ownerSlug };

    const chart = document.getElementById('chart');
    chart.classList.add('lens-focused');
    chart.querySelectorAll('.is-source, .is-target').forEach((n) =>
      n.classList.remove('is-source', 'is-target'));
    chart.querySelectorAll('.is-active-pill').forEach((n) => n.classList.remove('is-active-pill'));

    // Mark source (owner) card
    const ownerCard = document.querySelector(`.card[data-agent-slug="${cssEscape(ownerSlug)}"]`);
    if (ownerCard) ownerCard.classList.add('is-source');

    // Mark target (consumer) cards
    skill.shared_with.forEach((consumerSlug) => {
      const c = document.querySelector(`.card[data-agent-slug="${cssEscape(consumerSlug)}"]`);
      if (c) c.classList.add('is-target');
    });

    // Mark active pill (the one Lime moment)
    const pill = document.querySelector(
      `.skill-pill[data-skill="${cssEscape(skillName)}"][data-skill-owner="${cssEscape(ownerSlug)}"]`
    );
    if (pill) pill.classList.add('is-active-pill');

    // Matrix row sync
    document.querySelectorAll('.matrix-row').forEach((r) => {
      r.classList.toggle('is-active', r.getAttribute('data-skill') === skillName);
    });

    redrawOverlay();
    lensHintBanner().hidden = true;
  };

  /* ---------- overlay drawing ---------- */

  const redrawOverlay = () => {
    const overlay = document.getElementById('dotted-overlay');
    const wrap = document.getElementById('chart-wrap');
    if (!overlay || !wrap) return;

    const wrapRect = wrap.getBoundingClientRect();
    overlay.setAttribute('width', wrapRect.width);
    overlay.setAttribute('height', wrapRect.height);
    overlay.setAttribute('viewBox', `0 0 ${wrapRect.width} ${wrapRect.height}`);
    overlay.innerHTML = '';

    if (!currentLens) return;
    const skill = lensData.find((s) => s.skill === currentLens.skill);
    if (!skill) return;

    const fromPill = document.querySelector(
      `.skill-pill[data-skill="${cssEscape(currentLens.skill)}"][data-skill-owner="${cssEscape(currentLens.ownerSlug)}"]`
    );
    const from = anchorOf(fromPill, wrapRect, 'bottom') ||
                 anchorOf(document.querySelector(`.card[data-agent-slug="${cssEscape(currentLens.ownerSlug)}"]`), wrapRect, 'bottom');
    if (!from) return;

    skill.shared_with.forEach((consumerSlug) => {
      const card = document.querySelector(`.card[data-agent-slug="${cssEscape(consumerSlug)}"]`);
      const to = anchorOf(card, wrapRect, 'top');
      if (!to) return;
      const path = orthArc(from, to);
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', path);
      p.setAttribute('class', 'is-active');
      overlay.appendChild(p);
    });
  };

  const anchorOf = (node, wrapRect, side) => {
    if (!node) return null;
    const r = node.getBoundingClientRect();
    const x = r.left - wrapRect.left + r.width / 2;
    let y;
    if (side === 'top') y = r.top - wrapRect.top;
    else if (side === 'bottom') y = r.bottom - wrapRect.top;
    else y = r.top - wrapRect.top + r.height / 2;
    return { x, y };
  };

  // Smooth gentle bezier from a to b with vertical bias
  const orthArc = (a, b) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    // Pull control points downward off the source, upward toward the target
    const drop = Math.max(36, Math.min(Math.abs(dy) * 0.6, 180));
    const c1x = a.x + dx * 0.05;
    const c1y = a.y + drop;
    const c2x = b.x - dx * 0.05;
    const c2y = b.y - drop;
    return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  };

  /* ---------- wiring ---------- */

  const wireLensControls = () => {
    document.getElementById('lens-toggle').addEventListener('click', () => {
      setLensMode(!lensActive);
    });
    document.getElementById('lens-clear').addEventListener('click', () => setLensMode(false));

    // Click on any shared skill pill in the chart
    document.getElementById('chart').addEventListener('click', (e) => {
      const pill = e.target.closest('.skill-pill--shared');
      if (pill) {
        e.stopPropagation();
        const skill = pill.getAttribute('data-skill');
        const owner = pill.getAttribute('data-skill-owner');
        activateLens(skill, owner);
      }
    });

    // Esc clears lens (panel handler takes priority below)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const panel = document.getElementById('panel');
        if (panel.getAttribute('aria-hidden') === 'false') return;
        if (currentLens) { clearLens(); document.getElementById('lens-hint').hidden = !lensActive; }
        else if (lensActive) setLensMode(false);
      }
    });

    // Matrix toggle
    document.getElementById('matrix-toggle').addEventListener('click', () => {
      const sec = document.getElementById('matrix-section');
      const btn = document.getElementById('matrix-toggle');
      const show = sec.hidden;
      sec.hidden = !show;
      btn.setAttribute('aria-pressed', String(show));
      btn.querySelector('span').textContent = show ? 'Hide matrix view' : 'Show matrix view';
      if (show) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  /* ---------- slide-over panel ---------- */

  const panel = () => document.getElementById('panel');
  const panelContent = () => document.getElementById('panel-content');
  const panelHead = () => document.getElementById('panel-head-inner');

  const openPanel = (agent) => {
    panelHead().innerHTML = '';
    panelContent().innerHTML = '';
    panelHead().appendChild(renderPanelHead(agent));
    panelContent().appendChild(renderPanelBody(agent));
    panel().setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(() => panel().querySelector('.panel-close').focus(), 320);
  };
  const closePanel = () => {
    panel().setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  const renderPanelHead = (agent) => {
    const frag = document.createDocumentFragment();
    if (agent.reports_to) {
      frag.appendChild(el('div', { class: 'panel-head-eyebrow' }, [
        document.createTextNode('Reports to '),
        el('span', { class: 'reports-to-name', text: agent.reports_to }),
      ]));
    }
    frag.appendChild(el('h2', { class: 'panel-head-name', id: 'panel-title', text: agent.name }));
    if (agent.role) frag.appendChild(el('p', { class: 'panel-head-role', text: agent.role }));
    const chips = el('div', { class: 'panel-head-chips' });
    const sp = statusPill(agent); if (sp) chips.appendChild(sp);
    const ph = phaseChip(agent.phase); if (ph) chips.appendChild(ph);
    if (agent.status) chips.appendChild(el('span', { class: 'chip status-chip', text: agent.status }));
    if (agent.hire_date) chips.appendChild(el('span', { class: 'chip status-chip', text: 'hired ' + agent.hire_date }));
    frag.appendChild(chips);
    return frag;
  };

  // "Right now" — the status-board headline: what this agent is on this week.
  // Focus (current project / owned number), in-flight (open loops), recently
  // shipped (wins), and the manager's read. Sourced from the latest review +
  // the manager team_health, so it degrades gracefully when either is absent.
  const renderRightNow = (agent) => {
    const r = agent.latest_review || {};
    const inFlight = bulletsFromBlock(r.open_loops, 5);
    const shipped = bulletsFromBlock(r.wins, 3);
    const focus = stripInline(agent.first_project || agent.owned_number || agent.role || '');
    if (!agent.status_read && !inFlight.length && !shipped.length && !focus) return null;

    const body = el('div', { class: 'right-now-card' });

    if (agent.status_read) {
      const cls = STATUS_CLASS[agent.status_read] || 'status--quiet';
      body.appendChild(el('div', { class: `right-now-status ${cls}` }, [
        el('span', { class: `status-dot ${cls}` }),
        el('span', { class: 'rn-status-label', text: STATUS_LABEL[agent.status_read] || agent.status_read }),
        agent.status_note ? el('span', { class: 'rn-status-note', text: agent.status_note }) : null,
      ]));
    }
    if (focus) {
      body.appendChild(el('div', { class: 'rn-block' }, [
        el('div', { class: 'rn-label', text: 'Focus' }),
        el('div', { class: 'rn-focus', html: linkifyMd(truncate(focus, 240)) }),
      ]));
    }
    if (inFlight.length) {
      body.appendChild(el('div', { class: 'rn-block' }, [
        el('div', { class: 'rn-label', text: 'In flight' }),
        el('ul', { class: 'rn-list' }, inFlight.map((x) => el('li', { text: x }))),
      ]));
    }
    if (shipped.length) {
      body.appendChild(el('div', { class: 'rn-block' }, [
        el('div', { class: 'rn-label', text: 'Recently shipped' }),
        el('ul', { class: 'rn-list rn-list--shipped' }, shipped.map((x) => el('li', { text: x }))),
      ]));
    }
    const wk = r.week_ending ? `as of week ending ${r.week_ending}` : 'no review on file yet';
    body.appendChild(el('div', { class: 'rn-asof', text: wk }));
    return section('Right now', body);
  };

  const renderPanelBody = (agent) => {
    const frag = document.createDocumentFragment();

    const rn = renderRightNow(agent);
    if (rn) frag.appendChild(rn);

    if (agent.mission) frag.appendChild(section('Mission', el('p', { text: agent.mission })));

    if (agent.owned_number) {
      frag.appendChild(section('The one number', el('div', { class: 'owned-number-card' }, [
        el('div', { class: 'label', text: 'Owned number' }),
        el('div', { class: 'num', html: linkifyMd(agent.owned_number) }),
      ])));
    }
    if (agent.first_project) {
      frag.appendChild(section('Current project',
        el('div', { class: 'first-project-card', html: linkifyMd(agent.first_project) })));
    }

    if (agent.scope && (agent.scope.owns.length || agent.scope.doesnt.length)) {
      frag.appendChild(section('Scope', el('div', { class: 'scope-grid' }, [
        el('div', { class: 'scope-col scope-col--owns' }, [
          el('h4', { text: 'Owns' }),
          el('ul', {}, (agent.scope.owns || []).map((x) => el('li', { html: linkifyMd(x) }))),
        ]),
        el('div', { class: 'scope-col scope-col--doesnt' }, [
          el('h4', { text: "Doesn't own" }),
          el('ul', {}, (agent.scope.doesnt || []).map((x) => el('li', { html: linkifyMd(x) }))),
        ]),
      ])));
    }

    if (agent.authority && (agent.authority.t1 || agent.authority.t2 || agent.authority.t3)) {
      const stack = el('div', { class: 'auth-stack' });
      ['t1', 't2', 't3'].forEach((t) => {
        if (agent.authority[t]) {
          stack.appendChild(el('div', { class: `auth-row ${t}` }, [
            el('div', { class: 'auth-tier', text: t.toUpperCase() }),
            el('div', { class: 'auth-desc', html: linkifyMd(agent.authority[t]) }),
          ]));
        }
      });
      frag.appendChild(section('Authority', stack));
    }

    if (agent.escalation_rules && agent.escalation_rules.length) {
      frag.appendChild(section('Escalation rules',
        el('ul', { class: 'bullets' }, agent.escalation_rules.map((x) => el('li', { html: linkifyMd(x) })))));
    }
    if (agent.success_metrics && agent.success_metrics.length) {
      frag.appendChild(section('Success metrics',
        el('ul', { class: 'bullets' }, agent.success_metrics.map((x) => el('li', { html: linkifyMd(x) })))));
    }

    if (agent.next_milestone) {
      const m = agent.next_milestone;
      frag.appendChild(section('Next milestone', el('div', { class: 'milestone-card' }, [
        el('div', { class: 'milestone-head' }, [
          el('span', { class: 'ms-phase', text: m.phase }),
          el('span', { class: 'ms-date', text: m.target_date }),
        ]),
        el('p', { text: m.notes }),
      ])));
    }

    if (agent.latest_review && agent.latest_review.misses) {
      const r = agent.latest_review;
      // Wins and open loops now live in "Right now"; this section carries the
      // honest other half: what fell short this week.
      frag.appendChild(section('Misses and corrections',
        el('div', { class: 'review-card' }, [
          el('div', { class: 'review-head' }, [
            el('span', { class: 'review-week', text: 'Week ending ' + (r.week_ending || 'unknown') }),
            el('span', { class: 'review-sub', text: r.phase ? `${r.phase} phase` : '' }),
          ]),
          el('div', { class: 'review-section s-misses' }, [
            el('h4', { text: 'Misses' }), el('div', { class: 'content', text: r.misses })]),
        ])));
    }

    const footer = el('div', { class: 'panel-footer' }, [
      agent.last_updated ? el('div', { text: `Last updated: ${agent.last_updated}` }) : null,
      agent.source_path ? el('div', {}, [document.createTextNode('Source: '), el('code', { text: agent.source_path })]) : null,
    ]);
    frag.appendChild(footer);

    return frag;
  };

  const section = (title, contentNode) => {
    const s = el('section', { class: 'panel-section' });
    s.appendChild(el('h3', { text: title }));
    s.appendChild(contentNode);
    return s;
  };

  /* ---------- meta ---------- */

  const formatGenerated = (iso) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit',
      });
    } catch (e) { return iso; }
  };

  /* ---------- resize handling ---------- */

  window.addEventListener('resize', () => {
    clearTimeout(window.__chartResize);
    window.__chartResize = setTimeout(redrawOverlay, 120);
  });

  /* ---------- boot ---------- */

  document.querySelectorAll('[data-close-panel]').forEach((b) =>
    b.addEventListener('click', closePanel));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('panel').getAttribute('aria-hidden') === 'false') {
      closePanel();
    }
  });

  fetch('data.json', { cache: 'no-cache' })
    .then((r) => { if (!r.ok) throw new Error('data.json fetch failed: ' + r.status); return r.json(); })
    .then((data) => {
      lensData = data.shared_services || [];
      document.getElementById('meta-generated').textContent = formatGenerated(data.generated_at);
      buildTree(data);
      wireLensControls();
    })
    .catch((err) => {
      console.error(err);
      document.getElementById('chart').innerHTML =
        `<div class="loading" style="color:#B45309">Failed to load data.json: ${escapeHtml(err.message)}</div>`;
    });

})();

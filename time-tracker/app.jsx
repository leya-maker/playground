// LPM Time Tracker — Day View
// React app rendering Day view with structure/treatment/density/etc. tweaks.
// Production stack is vanilla JS — this prototype maps 1:1 onto a vanilla rewrite.

const { useState, useEffect, useMemo, useRef } = React;

// ---------- helpers ----------

const HOUR_START = 7;   // 7am
const HOUR_END   = 19;  // 7pm
const HOURS      = HOUR_END - HOUR_START;

function tmin(hhmm) {            // "09:30" -> 9.5
  const [h, m] = hhmm.split(":").map(Number);
  return h + m / 60;
}
function durMin(start, end) {
  return (tmin(end) - tmin(start)) * 60;
}
function fmtMin(min) {           // 105 -> "1h 45m"
  if (!min) return "0m";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (!h) return `${m}m`;
  if (!m) return `${h}h`;
  return `${h}h ${m}m`;
}
function fmtTime(hhmm) {         // "09:30" -> "9:30a"
  const [h, m] = hhmm.split(":").map(Number);
  const am = h < 12;
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}${m ? ":" + String(m).padStart(2, "0") : ""}${am ? "a" : "p"}`;
}
function blockStyle(start, end) {
  const top = (tmin(start) - HOUR_START) * 60;   // minutes from grid top
  const height = durMin(start, end);
  return {
    top: `calc(${top} / 60 * var(--grid-hour-px))`,
    height: `calc(${height} / 60 * var(--grid-hour-px))`,
  };
}

// luminance check — true if a color needs light text
function isDark(hex) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  // sRGB luma
  return (0.299 * r + 0.587 * g + 0.114 * b) < 150;
}

// ---------- Sub-components ----------

function Masthead({ asOf }) {
  return (
    <header className="masthead">
      <div className="masthead__lockup">
        <img src="assets/Long_Blue.png" alt="LPM Consulting" />
        <span className="masthead__eyebrow">· Time audit</span>
      </div>
      <div className="masthead__meta">
        Data as of {asOf} &nbsp;·&nbsp;
        <a href="#methodology">Methodology</a>
      </div>
    </header>
  );
}

function Nav({ activeTab, onTab, asOfShort, monthRange }) {
  const items = [
    { id: "day",   label: "Day",          count: "Today" },
    { id: "7d",    label: "Last 7 days",  count: "→ " + asOfShort },
    { id: "30d",   label: "Last 30 days", count: "→ " + asOfShort },
    { id: "month", label: "Month review", count: monthRange },
  ];
  return (
    <nav className="nav">
      {items.map((it) => (
        <button
          key={it.id}
          className={"nav__item" + (activeTab === it.id ? " nav__item--active" : "")}
          onClick={() => onTab(it.id)}
        >
          {it.label}
          <span className="nav__count">{it.count}</span>
        </button>
      ))}
    </nav>
  );
}

function DayHead({ today }) {
  const d = new Date(today.date + "T12:00:00");
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
  const monthDay = d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  const year = d.toLocaleDateString("en-US", { year: "numeric" });
  return (
    <section className="dayhead">
      <div>
        <div className="dayhead__eyebrow">Daily audit</div>
        <h1 className="dayhead__title">
          {weekday}, <em>{monthDay}</em>
        </h1>
      </div>
      <div className="dayhead__note">
        Every minute below is computed from calendar events, Granola transcripts,
        Gmail sent counts, Drive modifications, and Claude Code sessions. Nothing
        is self-reported.
      </div>
    </section>
  );
}

function DatePicker({ days, activeDate, onPick }) {
  const max = Math.max(...days.map((d) => d.minutes || 0));
  return (
    <div className="datepicker" role="tablist" aria-label="Recent 14 days">
      {days.map((d) => {
        const isToday  = !!d.is_today;
        const isActive = d.date === activeDate;
        const pct = max ? (d.minutes / max) * 100 : 0;
        return (
          <button
            key={d.date}
            className={
              "datepicker__cell" +
              (d.weekend ? " datepicker__cell--weekend" : "") +
              (isToday  ? " datepicker__cell--today"   : "") +
              (isActive ? " datepicker__cell--active"  : "")
            }
            onClick={() => onPick(d.date)}
            aria-label={`${d.weekday} ${d.date}, ${fmtMin(d.minutes)}`}
          >
            <span className="datepicker__wd">
              {d.weekday}{isToday && " · Today"}
            </span>
            <span className="datepicker__d">
              {parseInt(d.date.slice(-2), 10)}
            </span>
            <span
              className="datepicker__bar"
              style={{
                width: `${Math.max(8, pct * 0.4)}px`,
                opacity: d.minutes ? 1 : 0.18,
              }}
            />
          </button>
        );
      })}
      <button className="datepicker__more" title="Earlier dates (Apr 1 onward)">
        Earlier
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    </div>
  );
}

function Kpi({ label, value, sub, unit, accent, showArch }) {
  return (
    <div className={"kpi" + (accent ? " kpi--accent" : "")}>
      {showArch && (
        <svg className="kpi__arch" viewBox="0 0 100 120" fill="none" aria-hidden="true">
          <path d="M3 119 L3 53 A47 47 0 0 1 97 53 L97 119" stroke="#DFFF00" strokeWidth="3" />
        </svg>
      )}
      <span className="kpi__label">{label}</span>
      <div className="kpi__value">
        <span className="tabular">{value}</span>
        {unit && <sub>{unit}</sub>}
      </div>
      <div className="kpi__sub">{sub}</div>
    </div>
  );
}

function Kpis({ today, limeOn, recent14, isToday }) {
  const meetingEvents = today.calendar_events.filter((e) => e.kind !== "solo");
  const meetings = meetingEvents.reduce((acc, e) => acc + durMin(e.start, e.end), 0);
  const subSyncCount = meetingEvents.filter((e) => e.kind === "sub-sync").length;
  const agent = today.claude_blocks.reduce((acc, b) => acc + b.minutes, 0);
  const longestBlock = today.claude_blocks.length
    ? Math.max(...today.claude_blocks.map((b) => b.minutes))
    : 0;

  const wc = today.wall_clock || { start: "09:00", end: "17:00" };
  const wcStart = fmtTime(wc.start);
  const wcEnd   = fmtTime(wc.end);
  const wcMin   = durMin(wc.start, wc.end);

  // 14-day average for the delta. Skip today and zero days; if no history,
  // hide the delta line.
  const priorDays = (recent14 || []).filter((d) => !d.is_today && d.minutes > 0);
  const avg14 = priorDays.length
    ? Math.round(priorDays.reduce((a, d) => a + d.minutes, 0) / priorDays.length)
    : null;
  const delta = avg14 != null ? today.total_minutes - avg14 : null;
  let deltaLabel;
  if (!isToday) {
    deltaLabel = <span className="kpi__delta">audited from history</span>;
  } else if (delta == null) {
    deltaLabel = <span className="kpi__delta">{priorDays.length}-day average pending</span>;
  } else if (delta === 0) {
    deltaLabel = <span className="kpi__delta">on the 14-day average</span>;
  } else {
    deltaLabel = (
      <span className="kpi__delta">
        {delta > 0 ? "↑" : "↓"} {fmtMin(Math.abs(delta))} vs 14d avg
      </span>
    );
  }

  return (
    <section className="kpis">
      <Kpi
        label="Active time"
        value={fmtMin(today.total_minutes)}
        sub={deltaLabel}
        accent
        showArch={limeOn}
      />
      <Kpi
        label="Wall-clock range"
        value={`${wcStart}–${wcEnd}`}
        sub={<span><span className="tabular">{fmtMin(wcMin)}</span> &nbsp;door-to-door</span>}
      />
      <Kpi
        label="Meetings"
        value={fmtMin(meetings)}
        sub={
          <span>
            {meetingEvents.length} {meetingEvents.length === 1 ? "event" : "events"}
            {subSyncCount > 0 && (<>, &nbsp;{subSyncCount} sub-sync{subSyncCount === 1 ? "" : "s"}</>)}
          </span>
        }
      />
      <Kpi
        label="Agent active"
        value={fmtMin(agent)}
        sub={
          today.claude_blocks.length
            ? <span>
                {today.claude_blocks.length} {today.claude_blocks.length === 1 ? "block" : "blocks"}, longest{" "}
                <span className="tabular">{fmtMin(longestBlock)}</span>
              </span>
            : <span>no agent sessions today</span>
        }
      />
    </section>
  );
}

// ---------- Calendar grid ----------

function Block({ event, lane }) {
  const isSolo = event.kind === "solo";

  // Color resolution
  const clients = window.CLIENT_COLORS;
  let bg, fg, accent;
  if (lane === "calendar") {
    if (isSolo) {
      bg = "transparent"; fg = ""; accent = clients.Internal;
    } else if (event.kind === "sub-sync") {
      bg = clients.NABU; accent = clients.NABU;
    } else if (event.client) {
      bg = clients[event.client] || clients.ALDF;
      accent = bg;
    } else {
      bg = clients.ALDF; accent = bg;
    }
  } else {
    // agent lane
    const key = event.category;
    bg = clients[key] || clients.Internal;
    accent = bg;
  }
  fg = isDark(bg) ? "var(--color-gardenia)" : "var(--color-blueberry-900)";

  // Expose colors as CSS vars; CSS picks how to apply them per treatment.
  const style = {
    ...blockStyle(event.start, event.end),
    "--block-accent": accent,
    "--block-bg":     bg,
    "--block-fg":     fg,
  };

  const dur = durMin(event.start, event.end);
  const cls =
    "block" +
    (isSolo ? " block--solo" : "") +
    (!isDark(bg) ? " block--light" : "") +
    (dur < 60 ? " block--med"   : "") +
    (dur < 36 ? " block--short" : "") +
    (dur < 24 ? " block--tiny"  : "");

  // metadata line
  let meta = null;
  if (lane === "calendar") {
    if (isSolo) meta = "Reminder · not counted";
    else if (event.kind === "sub-sync")
      meta = `Sub-sync · split ${event.client_split.join(" · ")}`;
    else if (event.client) meta = event.client;
  } else {
    meta = event.subcategory
      ? `${event.category} · ${event.subcategory}`
      : event.category;
  }

  return (
    <div className={cls} style={style}>
      <div>
        <div className="block__time">
          {fmtTime(event.start)} – {fmtTime(event.end)}
          {isSolo && (
            <>
              {" · "}
              <span className="block__reminder">Reminder</span>
            </>
          )}
        </div>
        <div className="block__title">
          {event.title || event.label}
        </div>
      </div>
      {meta && <div className="block__meta">{meta}</div>}
    </div>
  );
}

function CalendarGrid({ today, nowTime }) {
  const hours = [];
  for (let h = HOUR_START; h <= HOUR_END; h++) hours.push(h);
  return (
    <div className="grid" style={{ minHeight: `calc(${HOURS} * var(--grid-hour-px) + 36px)` }}>
      {/* lane heads */}
      <div></div>
      <div className="grid__lane-head">
        Calendar <span>Google · Granola</span>
      </div>
      <div className="grid__lane-head">
        Agent / focus <span>Claude Code · transcripts</span>
      </div>

      {/* time rail */}
      <div className="grid__rail" style={{ height: `calc(${HOURS} * var(--grid-hour-px))` }}>
        {hours.map((h) => {
          const major = h % 3 === 1 || h === 12;
          const am = h < 12;
          const h12 = ((h + 11) % 12) + 1;
          return (
            <div
              key={h}
              className={"grid__rail-hour" + (major ? " grid__rail-hour--major" : "")}
              style={{ top: `calc(${h - HOUR_START} * var(--grid-hour-px))` }}
            >
              {h12}{am ? "a" : "p"}
            </div>
          );
        })}
      </div>

      {/* meetings lane */}
      <Lane>
        {today.calendar_events.map((e) => (
          <Block key={e.id} event={e} lane="calendar" />
        ))}
        {nowTime && <NowLine time={nowTime} />}
      </Lane>

      {/* agent lane */}
      <Lane>
        {today.claude_blocks.map((b) => (
          <Block key={b.id} event={b} lane="agent" />
        ))}
        {nowTime && <NowLine time={nowTime} />}
      </Lane>
    </div>
  );
}

function Lane({ children }) {
  return (
    <div className="grid__col">
      <div className="grid__lane" style={{ height: `calc(${HOURS} * var(--grid-hour-px))` }}>
        {/* hour lines */}
        {Array.from({ length: HOURS + 1 }).map((_, i) => (
          <React.Fragment key={i}>
            <div
              className="grid__hourline"
              style={{ top: `calc(${i} * var(--grid-hour-px))` }}
            />
            {i < HOURS && (
              <div
                className="grid__hourline grid__hourline--half"
                style={{ top: `calc(${i + 0.5} * var(--grid-hour-px))` }}
              />
            )}
          </React.Fragment>
        ))}
        {children}
      </div>
    </div>
  );
}

function NowLine({ time }) {
  const top = (tmin(time) - HOUR_START) * 60;
  return (
    <div
      className="grid__now"
      style={{ top: `calc(${top} / 60 * var(--grid-hour-px))` }}
    >
      <div className="grid__now-label">Now {fmtTime(time)}</div>
    </div>
  );
}

// ---------- Donut chart — defined in views.jsx (loaded first) ----------
// Access via window.DonutCard inside JSX.

// ---------- Unified "patterns" strip (visible in unified structure) ----------

function PatternsStrip({ days }) {
  const max = Math.max(...days.map((d) => d.minutes));
  const total7 = days.slice(-7).reduce((a, d) => a + d.minutes, 0);
  const avg7   = Math.round(total7 / 5);   // 5 weekdays
  const total30 = days.reduce((a, d) => a + d.minutes, 0) * 30 / days.length;

  // mini heatmap: build a fake 5-week grid (Sun-Sat) for May
  // 5 weeks × 7 days. Distribute the 14 recent days into right slots and faded earlier days.
  const cells = [];
  for (let w = 0; w < 5; w++) {
    for (let d = 0; d < 7; d++) {
      const idx = w * 7 + d;
      const isWeekend = d === 0 || d === 6;
      // pseudorandom levels for the design demo
      const seed = (idx * 31 + 7) % 11;
      const lvl = isWeekend && seed % 3 !== 0
        ? (seed % 2 === 0 ? 0 : 1)
        : (seed < 3 ? 1 : seed < 6 ? 2 : seed < 9 ? 3 : 4);
      cells.push({ idx, isWeekend, lvl: idx > 24 ? 0 : lvl });
    }
  }

  return (
    <section className="patterns-strip">
      <div className="pstrip__card">
        <div className="eyebrow">Last 7 days · pattern</div>
        <h3>Steady on weekdays. <br />Weekends quiet by design.</h3>
        <div className="sparkbar">
          {days.slice(-7).map((d) => (
            <div
              key={d.date}
              className={
                "sparkbar__cell" +
                (d.weekend ? " sparkbar__cell--weekend" : "") +
                (!d.minutes ? " sparkbar__cell--zero" : "")
              }
              style={{ height: `${Math.max(4, (d.minutes / max) * 100)}%` }}
              title={`${d.weekday} ${d.date}: ${fmtMin(d.minutes)}`}
            />
          ))}
        </div>
        <div className="pstrip__sub">
          {fmtMin(total7)} active &nbsp;·&nbsp; weekday avg <span className="tabular">{fmtMin(avg7)}</span>
        </div>
      </div>

      <div className="pstrip__card">
        <div className="eyebrow">Last 30 days · clients</div>
        <h3>NABU and ALDF lead. <br />Obama steady, HFNY rising.</h3>
        <div className="pstrip__num tabular">{fmtMin(Math.round(total30))}</div>
        <div className="pstrip__sub">Across 9 client codes &amp; 4 internal categories</div>
      </div>

      <div className="pstrip__card">
        <div className="eyebrow">May · daily heatmap</div>
        <h3>Two clear off-weekends. <br />One Saturday breach.</h3>
        <div className="heatmap">
          {cells.map((c) => (
            <div
              key={c.idx}
              className={"heatmap__cell" + (c.isWeekend ? " heatmap__cell--weekend" : "")}
              data-lvl={c.lvl}
              title={`Day ${c.idx}: level ${c.lvl}`}
            />
          ))}
        </div>
        <div className="pstrip__sub">Sat 16 May · 95 min on NABU gala draft</div>
      </div>
    </section>
  );
}

// ---------- Design notes ----------

function DesignNotes() {
  return (
    <section className="notes" id="design-notes">
      <div>
        <h2>How the system <em>extends.</em></h2>
        <p className="notes__sub">
          Day view is the canonical surface. Each note below describes how the same
          vocabulary applies to the other three views, and what changes when.
        </p>
      </div>
      <div className="notes__list">
        <div className="notes__item">
          <h3>Last 7 days &amp; Last 30 days</h3>
          <p>
            Same masthead, same date strip (collapses to a week-summary header).
            Replace the two-track grid with a stacked-bar chart in the same
            client palette: bar columns are days, stack segments are tasks.
            Bars use the conservative block treatment (rounded rect, no arch)
            so the eye reads <strong>density</strong>, not punctuation. KPI row
            shifts to <em>Total / Weekday avg / Weekend / Heaviest day.</em>
          </p>
        </div>
        <div className="notes__item">
          <h3>Month review</h3>
          <p>
            One section per calendar month. Each gets a King &amp; Queen month
            title, a 7-column Sun&ndash;Sat heatmap (using the heatmap ramp
            you pick in Tweaks), and a per-day table below in the editorial
            block treatment: mono timestamps, hairline rows, client
            colors as a 3px left rule. Heatmap and table share intensity
            scales so the table acts as a legend.
          </p>
        </div>
        <div className="notes__item">
          <h3>Weekend signal</h3>
          <p>
            The current red diagonal hatch is being replaced everywhere. Three
            calmer options are in Tweaks: <strong>Periwinkle wash</strong>{" "}
            (default, reads &ldquo;goal you set&rdquo;), <strong>Mint outline</strong>{" "}
            (reads &ldquo;positive&rdquo;, rest is the goal), and{" "}
            <strong>Silent dot</strong> (no fill, small Cornflower glyph;
            still legible at the heatmap scale).
          </p>
        </div>
        <div className="notes__item">
          <h3>Modeled vs measured</h3>
          <p>
            Gmail and Drive minutes are inferred (sent-count &times; 2 min,
            file-touch &times; 3 min). The donut legend marks them with a
            small hollow Cornflower dot, the same dot used in the
            methodology modal, so &ldquo;this is an estimate&rdquo;
            reads without shouting. Donut wedges for modeled tasks use the
            Periwinkle family so even color-only readers see them as softer.
          </p>
        </div>
        <div className="notes__item">
          <h3>Empty days</h3>
          <p>
            Zero-minute days never look like errors. In the date strip they
            render with the small Cornflower bar; in the heatmap they fall to
            the lightest ramp step (or Mint-50 if weekend mode is on Mint).
            No dotted patterns, no &ldquo;no data&rdquo; copy.
          </p>
        </div>
        <div className="notes__item">
          <h3>Lime is reserved</h3>
          <p>
            One Lime moment per piece. The default places it as an arch
            outline behind the <strong>Active time</strong> KPI, the one
            number Leya audits against memory. Tweak it to move to the
            <em> today</em> pip in the date strip, or under the active nav
            item. Never two at once.
          </p>
        </div>
        <div className="notes__item">
          <h3>Production port</h3>
          <p>
            This prototype is React for iteration speed. The underlying
            structure (date picker → KPIs → grid → donuts) is the same in
            vanilla JS: render functions returning template strings, one
            <code> renderDay(data) </code>per view. CSS is unchanged and
            already token-scoped. Chart.js can be removed; the donut here is
            ~30 lines of SVG and themes from the same client color map.
          </p>
        </div>
      </div>
    </section>
  );
}

// ---------- App ----------

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "structure": "tabs",
  "treatment": "editorial",
  "density":   "comfortable",
  "weekend":   "periwinkle",
  "heatramp":  "blueberry",
  "lime":      "today",
  "background":"gardenia"
}/*EDITMODE-END*/;

function DayView({ today, t, activeDate, setActiveDate, recent14, nowTime,
                   getClientColor, getTaskColor, getInternalColor }) {
  return (
    <>
      <DayHead today={today} />

      <DatePicker
        days={recent14}
        activeDate={activeDate}
        onPick={setActiveDate}
      />

      <Kpis today={today} limeOn={t.lime === "kpi"} recent14={recent14} isToday={today.date === window.DASHBOARD.today.date} />

      <section className="section">
        <header className="section__head">
          <span className="section__eyebrow">
            07:00 → 19:00 · {today.date === window.DASHBOARD.today.date ? "today" : today.date}
          </span>
          <h2 className="section__title">
            Two tracks, one <em>day.</em>
          </h2>
          <span className="section__meta">
            Calendar &nbsp;·&nbsp; Agent activity
          </span>
        </header>
        <CalendarGrid today={today} nowTime={nowTime} />
      </section>

      <section className="section">
        <header className="section__head">
          <span className="section__eyebrow">Where the time went</span>
          <h2 className="section__title">
            By task, by client, <em>by intent.</em>
          </h2>
        </header>
        <div className="donuts">
          <window.DonutCard
            title="By task"
            segments={today.per_task}
            getColor={getTaskColor}
            centerLabel="Active"
            modeledKeys={["gmail", "drive"]}
          />
          <window.DonutCard
            title="By client"
            segments={today.per_client.filter((c) => c.key !== "Internal")}
            getColor={getClientColor}
            centerLabel="Client work"
          />
          <window.DonutCard
            title="Internal categories"
            segments={today.per_internal}
            getColor={getInternalColor}
            centerLabel="Non-client"
          />
        </div>
      </section>

      {/* Unified-structure-only: pattern strip below day view */}
      <PatternsStrip days={recent14} />
    </>
  );
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Bumped when the live-data adapter swaps window.DASHBOARD in place.
  // Forces a re-read of dashboard fields after the async fetch completes.
  const [dataVersion, setDataVersion] = useState(0);
  useEffect(() => {
    const onLoaded = () => setDataVersion((v) => v + 1);
    window.addEventListener("dashboard-loaded", onLoaded);
    return () => window.removeEventListener("dashboard-loaded", onLoaded);
  }, []);

  const D = window.DASHBOARD;
  const today = D.today;
  const [activeTab, setActiveTab] = useState("day");
  const [activeDate, setActiveDate] = useState(today.date);
  // When live data lands and the date rolls over, follow it.
  useEffect(() => { setActiveDate(window.DASHBOARD.today.date); }, [dataVersion]);

  // "Now" line: only render on the live build when the viewed date is today
  // and the current wall time falls inside the grid range (07:00–19:00).
  const isLive = D.__source === "live";
  const liveNow = (() => {
    if (!isLive) return null;
    const n = new Date();
    const hh = n.getHours();
    if (hh < 7 || hh >= 19) return null;
    return String(hh).padStart(2, "0") + ":" + String(n.getMinutes()).padStart(2, "0");
  })();
  const isViewingToday = activeDate === D.today.date;
  const nowTime = isLive
    ? (isViewingToday ? liveNow : null)
    : "15:42";

  // mirror tweaks onto <body> for CSS-only variants
  useEffect(() => {
    const b = document.body;
    b.dataset.structure = t.structure;
    b.dataset.treatment = t.treatment;
    b.dataset.density   = t.density;
    b.dataset.weekend   = t.weekend;
    b.dataset.heatramp  = t.heatramp;
    b.dataset.lime      = t.lime;
    b.dataset.bg        = t.background;
    b.dataset.view      = activeTab;
  }, [t, activeTab]);

  // scroll to top on tab change
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [activeTab]);

  const getClientColor   = (s) => window.CLIENT_COLORS[s.key] || "var(--color-cornflower)";
  const getTaskColor     = (s) => window.TASK_COLORS[s.key]   || "var(--color-cornflower)";
  const getInternalColor = (s) => window.CLIENT_COLORS[s.key] || "var(--color-cornflower)";

  // Look up the day data for whichever date the picker has selected.
  // Falls back to today if the date isn't in the extended window.
  const viewedDay = (D.extended && D.extended.days || []).find((d) => d.date === activeDate) || today;

  // tab → view dispatch
  function renderView() {
    if (activeTab === "day") {
      return (
        <DayView
          today={viewedDay} t={t} activeDate={activeDate} setActiveDate={setActiveDate}
          recent14={D.recent_14} nowTime={nowTime}
          getClientColor={getClientColor}
          getTaskColor={getTaskColor}
          getInternalColor={getInternalColor}
        />
      );
    }
    if (activeTab === "7d") {
      return <window.PeriodView kind="7d" period={D.last_7} onSelectDate={(d) => { setActiveDate(d); setActiveTab("day"); }} />;
    }
    if (activeTab === "30d") {
      return <window.PeriodView kind="30d" period={D.last_30} onSelectDate={(d) => { setActiveDate(d); setActiveTab("day"); }} />;
    }
    if (activeTab === "month") {
      return <window.MonthReview onSelectDate={(d) => { setActiveDate(d); setActiveTab("day"); }} />;
    }
    return null;
  }

  // Display labels derived from live data.
  const asOfDate = new Date(D.as_of + "T12:00:00");
  const asOfLong = asOfDate.toLocaleDateString("en-US", {
    day: "numeric", month: "long", year: "numeric",
  });
  const asOfShort = asOfDate.toLocaleDateString("en-US", {
    month: "short", day: "numeric",
  });
  const months = (D.extended && D.extended.months) || [];
  const monthRange = months.length
    ? (months[0].label.split(" ")[0].slice(0, 3) + " → " +
       months[months.length - 1].label.split(" ")[0].slice(0, 3))
    : "—";

  return (
    <div className="app">
      <Masthead asOf={asOfLong} />

      <Nav
        activeTab={activeTab}
        onTab={setActiveTab}
        asOfShort={asOfShort}
        monthRange={monthRange}
      />

      {renderView()}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Structure" />
        <TweakRadio
          label="Layout"
          value={t.structure}
          options={["tabs", "unified"]}
          onChange={(v) => setTweak("structure", v)}
        />

        <TweakSection label="Day grid" />
        <TweakSelect
          label="Block treatment"
          value={t.treatment}
          options={[
            { label: "Conservative", value: "conservative" },
            { label: "Editorial (ledger)", value: "editorial" },
            { label: "Arch-framed", value: "arch" },
          ]}
          onChange={(v) => setTweak("treatment", v)}
        />
        <TweakRadio
          label="Density"
          value={t.density}
          options={["comfortable", "compact"]}
          onChange={(v) => setTweak("density", v)}
        />

        <TweakSection label="Brand accents" />
        <TweakSelect
          label="Lime moment"
          value={t.lime}
          options={[
            { label: "Active time KPI", value: "kpi" },
            { label: "Today in date strip", value: "today" },
            { label: "Active nav tab", value: "nav" },
            { label: "None", value: "none" },
          ]}
          onChange={(v) => setTweak("lime", v)}
        />
        <TweakSelect
          label="Page background"
          value={t.background}
          options={[
            { label: "Gardenia (default)", value: "gardenia" },
            { label: "Periwinkle-50", value: "periwinkle" },
            { label: "Mint-50", value: "mint" },
          ]}
          onChange={(v) => setTweak("background", v)}
        />

        <TweakSection label="Weekend signal" />
        <TweakSelect
          label="Intent-check cue"
          value={t.weekend}
          options={[
            { label: "Periwinkle wash", value: "periwinkle" },
            { label: "Mint outline", value: "mint" },
            { label: "Silent (dot only)", value: "dot" },
          ]}
          onChange={(v) => setTweak("weekend", v)}
        />

        <TweakSection label="Heatmap ramp (Month review)" />
        <TweakSelect
          label="Color ramp"
          value={t.heatramp}
          options={[
            { label: "Blueberry monochrome", value: "blueberry" },
            { label: "Mint → Blueberry", value: "mint-blue" },
            { label: "Dense (Peri → 900)", value: "dense" },
          ]}
          onChange={(v) => setTweak("heatramp", v)}
        />
      </TweaksPanel>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);

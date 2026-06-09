// LPM Time Tracker — non-Day views (Last 7, Last 30, Month review)
// Shares colors + DonutCard from app.jsx (uses window globals + React 18 from
// the same Babel scope after concatenation).

// Need React hooks even though they're already destructured in app.jsx — Babel
// transpiles each <script type=text/babel> in its own scope. Re-grab here.
const { useState: useStateV, useEffect: useEffectV, useMemo: useMemoV } = React;

// --- helpers (mirror app.jsx; intentionally duplicated to keep scope clean) ---

function vFmtMin(min) {
  if (!min) return "0m";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (!h) return `${m}m`;
  if (!m) return `${h}h`;
  return `${h}h ${m}m`;
}
function vFmtDate(dateStr, opts = {}) {
  const d = new Date(dateStr + "T12:00:00Z");
  return d.toLocaleDateString("en-US", { timeZone: "UTC", ...opts });
}

// ---------- Donut chart (custom SVG) ----------
// (Moved from app.jsx so views.jsx, loaded first, can use it)

function Donut({ segments, total, centerNum, centerLabel, size = 168 }) {
  const r = size / 2 - 14;
  const cx = size / 2, cy = size / 2;
  const C = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="donut" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-line)" strokeWidth="14" />
        {segments.map((s, i) => {
          const frac = total ? s.minutes / total : 0;
          const len = C * frac;
          const offset = -acc;
          acc += len;
          return (
            <circle key={i} cx={cx} cy={cy} r={r}
              fill="none" stroke={s.color} strokeWidth="14"
              strokeDasharray={`${Math.max(0, len - 1.5)} ${C}`}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          );
        })}
      </svg>
      <div className="donut__center">
        <div className="donut__center-num tabular">{centerNum}</div>
        <div className="donut__center-label">{centerLabel}</div>
      </div>
    </div>
  );
}

function Legend({ segments, total, getColor, modeledKeys }) {
  return (
    <div className="legend">
      {segments.map((s, i) => {
        const pct = total ? Math.round((s.minutes / total) * 100) : 0;
        const isModeled = s.modeled || (modeledKeys && modeledKeys.includes(s.key));
        return (
          <div className="legend__row" key={i}>
            <span className="legend__sw" style={{ background: getColor(s) }} />
            <span className="legend__lbl">
              {isModeled && <span className="modeled-dot" title="Modeled estimate" />}
              {s.label}
              <small> {pct}%</small>
            </span>
            <span className="legend__val tabular">{vFmtMin(s.minutes)}</span>
          </div>
        );
      })}
    </div>
  );
}

function DonutCard({ title, segments, getColor, centerLabel, modeledKeys }) {
  const total = segments.reduce((a, s) => a + s.minutes, 0);
  const withColor = segments.map((s) => ({ ...s, color: getColor(s) }));
  return (
    <div className="donut-card">
      <div className="donut-card__head">{title}</div>
      <div className="donut-card__body">
        <Donut segments={withColor} total={total}
               centerNum={vFmtMin(total)} centerLabel={centerLabel} />
        <Legend segments={segments} total={total} getColor={getColor} modeledKeys={modeledKeys} />
      </div>
    </div>
  );
}

// ---------- View headers shared between Last 7 / Last 30 / Month review ----------

function ViewHead({ eyebrow, title, accent, note }) {
  return (
    <section className="dayhead">
      <div>
        <div className="dayhead__eyebrow">{eyebrow}</div>
        <h1 className="dayhead__title">
          {title} <em>{accent}</em>
        </h1>
      </div>
      <div className="dayhead__note">{note}</div>
    </section>
  );
}

// ---------- KPI row used by 7d / 30d ----------

function PeriodKpis({ totals, days, periodLabel }) {
  const weekdayCount = days.filter((d) => !d.weekend && d.total_minutes > 0).length || 1;
  const weekendDaysOver = days.filter((d) => d.weekend && d.total_minutes > 0).length;
  return (
    <section className="kpis">
      <div className="kpi kpi--accent">
        <span className="kpi__label">Total active</span>
        <div className="kpi__value">
          <span className="tabular">{vFmtMin(totals.total)}</span>
        </div>
        <div className="kpi__sub">across {periodLabel}</div>
      </div>
      <div className="kpi">
        <span className="kpi__label">Weekday average</span>
        <div className="kpi__value">
          <span className="tabular">{vFmtMin(totals.weekday_avg)}</span>
        </div>
        <div className="kpi__sub">over {weekdayCount} weekdays worked</div>
      </div>
      <div className="kpi">
        <span className="kpi__label">Weekend work</span>
        <div className="kpi__value">
          <span className="tabular">{vFmtMin(totals.weekend_total)}</span>
        </div>
        <div className="kpi__sub">
          {weekendDaysOver === 0
            ? "All weekends clean"
            : `${weekendDaysOver} weekend day${weekendDaysOver > 1 ? "s" : ""} non-zero`}
        </div>
      </div>
      <div className="kpi">
        <span className="kpi__label">Heaviest day</span>
        <div className="kpi__value">
          <span className="tabular">{vFmtMin(totals.heaviest_day?.total_minutes || 0)}</span>
        </div>
        <div className="kpi__sub">
          {totals.heaviest_day
            ? vFmtDate(totals.heaviest_day.date, { weekday: "short", month: "short", day: "numeric" })
            : "·"}
        </div>
      </div>
    </section>
  );
}

// ---------- Stacked bar (custom, no Chart.js) ----------

function StackedBar({ days, getTaskColor, height = 280 }) {
  const max = Math.max(180, ...days.map((d) => d.total_minutes));
  // Round max up to next hour for clean tick marks
  const hours = Math.ceil(max / 60);
  const ticks = [];
  for (let h = hours; h >= 0; h -= Math.max(1, Math.floor(hours / 6))) {
    ticks.push(h);
  }

  return (
    <div className="stbar" style={{ "--stbar-h": `${height}px` }}>
      <div className="stbar__yaxis">
        {ticks.map((h) => (
          <div key={h} className="stbar__ytick" style={{ bottom: `${(h * 60 / max) * 100}%` }}>
            <span>{h}h</span>
          </div>
        ))}
      </div>
      <div className="stbar__plot">
        {ticks.map((h) => (
          <div
            key={h}
            className="stbar__gridline"
            style={{ bottom: `${(h * 60 / max) * 100}%` }}
          />
        ))}
        <div className="stbar__cols">
          {days.map((d) => {
            const ord = ["agent", "meetings", "granola", "gmail", "drive"];
            const sorted = [...d.per_task].sort(
              (a, b) => ord.indexOf(a.key) - ord.indexOf(b.key)
            );
            return (
              <div
                key={d.date}
                className={
                  "stbar__col" +
                  (d.weekend ? " stbar__col--weekend" : "") +
                  (!d.total_minutes ? " stbar__col--empty" : "")
                }
                title={`${d.weekday} ${d.date}: ${vFmtMin(d.total_minutes)}`}
              >
                <div className="stbar__stack">
                  {sorted.length === 0 && d.weekend && (
                    <div className="stbar__off">rest</div>
                  )}
                  {sorted.map((t) => (
                    <div
                      key={t.key}
                      className="stbar__seg"
                      style={{
                        height: `${(t.minutes / max) * 100}%`,
                        background: getTaskColor(t),
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="stbar__xlbl">
          {days.map((d) => (
            <div key={d.date} className={"stbar__xtick" + (d.weekend ? " stbar__xtick--weekend" : "")}>
              <span className="stbar__wd">{d.weekday[0]}</span>
              <span className="stbar__dn">{parseInt(d.date.slice(-2), 10)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Ranked list ----------

function RankedList({ title, items, getColor, total, max = 8 }) {
  const top = items.slice(0, max);
  const peak = Math.max(...top.map((i) => i.minutes), 1);
  return (
    <div className="ranked">
      <div className="ranked__head">{title}</div>
      <div className="ranked__list">
        {top.map((it) => {
          const pct = total ? Math.round((it.minutes / total) * 100) : 0;
          return (
            <div key={it.key} className="ranked__row">
              <span className="ranked__lbl">
                {it.modeled && <span className="modeled-dot" />}
                {it.label}
              </span>
              <div className="ranked__bar">
                <div
                  className="ranked__bar-fill"
                  style={{
                    width: `${(it.minutes / peak) * 100}%`,
                    background: getColor(it),
                  }}
                />
              </div>
              <span className="ranked__val tabular">{vFmtMin(it.minutes)}</span>
              <span className="ranked__pct tabular">{pct}%</span>
            </div>
          );
        })}
        {items.length > max && (
          <div className="ranked__more">+ {items.length - max} more</div>
        )}
      </div>
    </div>
  );
}

// ---------- Period view (covers Last 7 / Last 30) ----------

function PeriodView({ kind, period, onSelectDate, colors }) {
  const totals = period.totals;
  const days = period.days;

  const getClient   = (s) => window.CLIENT_COLORS[s.key]   || "var(--color-cornflower)";
  const getTask     = (s) => window.TASK_COLORS[s.key]     || "var(--color-cornflower)";
  const getInternal = (s) => window.CLIENT_COLORS[s.key]   || "var(--color-cornflower)";

  // date-range title: "May 20 – 26" / "Apr 27 – May 26"
  const fdate = days[0]?.date;
  const ldate = days[days.length - 1]?.date;
  let dateTitle = "", dateAccent = "";
  if (fdate && ldate) {
    const f = new Date(fdate + "T12:00:00Z");
    const l = new Date(ldate + "T12:00:00Z");
    const sameMonth = f.getUTCMonth() === l.getUTCMonth();
    const fMonth = f.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
    const lMonth = l.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
    if (sameMonth) {
      dateTitle  = `${fMonth} ${f.getUTCDate()}`;
      dateAccent = `– ${l.getUTCDate()}`;
    } else {
      dateTitle  = `${fMonth} ${f.getUTCDate()}`;
      dateAccent = `– ${lMonth} ${l.getUTCDate()}`;
    }
  }

  const headByKind = {
    "7d":  { eyebrow: "Seven days",
             note: "Weekdays held a tight range. Weekends quiet by design. NABU and ALDF carry most of the load." },
    "30d": { eyebrow: "Thirty days",
             note: "Most days fall between 6h and 9h of captured work. Two Saturdays show non-zero; both were planned exceptions." },
  };
  const h = { ...headByKind[kind], title: dateTitle, accent: dateAccent };

  return (
    <>
      <ViewHead {...h} />

      <PeriodKpis
        totals={totals}
        days={days}
        periodLabel={kind === "7d" ? "seven days" : "thirty days"}
      />

      <section className="section">
        <header className="section__head">
          <span className="section__eyebrow">Time-by-task</span>
          <h2 className="section__title">
            How each day broke <em>down.</em>
          </h2>
          <span className="section__meta">Stack: agent · meetings · gmail · drive · granola</span>
        </header>
        <StackedBar days={days} getTaskColor={getTask} height={kind === "30d" ? 240 : 300} />
      </section>

      <section className="section">
        <header className="section__head">
          <span className="section__eyebrow">Where the time went</span>
          <h2 className="section__title">
            Clients, internal, <em>tasks.</em>
          </h2>
        </header>
        <div className="donuts">
          <DonutCard
            title="By client"
            segments={totals.per_client.filter((c) => c.key !== "Internal")}
            getColor={getClient}
            centerLabel="Client work"
          />
          <DonutCard
            title="Internal categories"
            segments={totals.per_internal}
            getColor={getInternal}
            centerLabel="Non-client"
          />
          <DonutCard
            title="By task"
            segments={totals.per_task}
            getColor={getTask}
            centerLabel="Active"
            modeledKeys={["gmail", "drive"]}
          />
        </div>
      </section>

      <section className="section">
        <header className="section__head">
          <span className="section__eyebrow">Ranked</span>
          <h2 className="section__title">
            Top of <em>the list.</em>
          </h2>
        </header>
        <div className="rankeds">
          <RankedList
            title="Clients"
            items={totals.per_client.filter((c) => c.key !== "Internal")}
            getColor={getClient}
            total={totals.total}
          />
          <RankedList
            title="Internal categories"
            items={totals.per_internal}
            getColor={getInternal}
            total={totals.total}
          />
          <RankedList
            title="Tasks"
            items={totals.per_task}
            getColor={getTask}
            total={totals.total}
          />
        </div>
      </section>
    </>
  );
}

// ---------- Month review ----------

function MonthHeatmap({ days, onSelectDate }) {
  // Build calendar grid: first row's Sunday lead, last row trail.
  if (!days.length) return null;
  const first = days[0];
  const firstDow = first.dow;
  const last = days[days.length - 1];
  const lastDow = last.dow;

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push({ pad: true, key: `pre-${i}` });
  days.forEach((d) => cells.push({ pad: false, ...d }));
  for (let i = lastDow + 1; i <= 6; i++) cells.push({ pad: true, key: `post-${i}` });

  const max = Math.max(...days.map((d) => d.total_minutes));
  function level(m) {
    if (!m) return 0;
    const r = m / max;
    if (r < 0.25) return 1;
    if (r < 0.5)  return 2;
    if (r < 0.75) return 3;
    return 4;
  }

  return (
    <div className="hmap">
      <div className="hmap__wdrow">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((w) => (
          <div key={w} className="hmap__wd">{w}</div>
        ))}
      </div>
      <div className="hmap__grid">
        {cells.map((c, i) => {
          if (c.pad) return <div key={c.key} className="hmap__cell hmap__cell--pad" />;
          const lvl = level(c.total_minutes);
          const dnum = parseInt(c.date.slice(-2), 10);
          return (
            <button
              key={c.date}
              className={
                "hmap__cell" +
                (c.weekend ? " hmap__cell--weekend" : "") +
                (!c.total_minutes ? " hmap__cell--zero" : "")
              }
              data-lvl={lvl}
              onClick={() => onSelectDate?.(c.date)}
              title={`${c.weekday} ${c.date}: ${vFmtMin(c.total_minutes)}`}
            >
              <span className="hmap__dnum">{dnum}</span>
              {c.total_minutes > 0 && (
                <span className="hmap__min tabular">{Math.round(c.total_minutes / 60 * 10) / 10}h</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MiniBar({ taskList, max, getTaskColor }) {
  const ord = ["agent", "meetings", "granola", "gmail", "drive"];
  const sorted = [...taskList].sort(
    (a, b) => ord.indexOf(a.key) - ord.indexOf(b.key)
  );
  const total = sorted.reduce((a, s) => a + s.minutes, 0);
  return (
    <div className="minibar" style={{ width: `${Math.max(8, (total / max) * 100)}%` }}>
      {sorted.map((t) => {
        if (!t.minutes) return null;
        const w = (t.minutes / total) * 100;
        return (
          <span
            key={t.key}
            className="minibar__seg"
            style={{ width: `${w}%`, background: getTaskColor(t) }}
          />
        );
      })}
    </div>
  );
}

function DailyTable({ days, onSelectDate }) {
  const max = Math.max(...days.map((d) => d.total_minutes), 1);
  const getTask = (s) => window.TASK_COLORS[s.key] || "var(--color-cornflower)";
  return (
    <div className="dtbl-wrap">
      <table className="dtbl">
        <thead>
          <tr>
            <th className="dtbl__th-day">Day</th>
            <th>Total</th>
            <th>Meet</th>
            <th>Agent</th>
            <th>Gmail</th>
            <th>Drive</th>
            <th className="dtbl__th-mix">Mix</th>
            <th>Top client</th>
            <th>Internal</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d) => {
            const zero = !d.total_minutes;
            return (
              <tr
                key={d.date}
                className={
                  (d.weekend ? "dtbl__row--weekend " : "") +
                  (zero ? "dtbl__row--zero" : "")
                }
                onClick={() => onSelectDate?.(d.date)}
              >
                <td className="dtbl__day">
                  <span className="dtbl__wd">{d.weekday}</span>{" "}
                  <span className="dtbl__dn tabular">{parseInt(d.date.slice(-2), 10)}</span>
                </td>
                <td className="tabular dtbl__total">
                  {zero ? <span className="dtbl__dash">·</span> : vFmtMin(d.total_minutes)}
                </td>
                <td className="tabular">{d.meeting_minutes ? vFmtMin(d.meeting_minutes) : <span className="dtbl__dash">·</span>}</td>
                <td className="tabular">{d.agent_minutes   ? vFmtMin(d.agent_minutes)   : <span className="dtbl__dash">·</span>}</td>
                <td className="tabular">{d.gmail_minutes   ? vFmtMin(d.gmail_minutes)   : <span className="dtbl__dash">·</span>}</td>
                <td className="tabular">{d.drive_minutes   ? vFmtMin(d.drive_minutes)   : <span className="dtbl__dash">·</span>}</td>
                <td className="dtbl__mix">
                  {zero ? <span className="dtbl__dash">·</span> :
                    <MiniBar taskList={d.per_task} max={max} getTaskColor={getTask} />}
                </td>
                <td className="dtbl__top">
                  {d.top_client?.label || <span className="dtbl__dash">·</span>}
                </td>
                <td className="dtbl__top">
                  {d.top_internal
                    ? (d.top_internal.key === "BD" ? "BD"
                       : d.top_internal.key === "Infrastructure" ? "Infra"
                       : d.top_internal.label)
                    : <span className="dtbl__dash">·</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Per-client weekly matrix (Month section) ----------

function _groupWeeks(days) {
  // Group consecutive days into weeks (Sun = start of new week).
  const weeks = [];
  days.forEach((d) => {
    if (!weeks.length || d.dow === 0) weeks.push({ days: [], per_client: new Map() });
    const w = weeks[weeks.length - 1];
    w.days.push(d);
    (d.per_client || []).forEach((c) => {
      const prev = w.per_client.get(c.key);
      if (prev) prev.minutes += c.minutes;
      else w.per_client.set(c.key, { ...c });
    });
  });
  return weeks;
}

function ClientWeeklyMatrix({ days }) {
  const weeks = _groupWeeks(days);

  // Aggregate clients across whole month (sorted by total)
  const total = new Map();
  weeks.forEach((w) => {
    w.per_client.forEach((c, k) => {
      const prev = total.get(k);
      if (prev) prev.minutes += c.minutes;
      else total.set(k, { ...c, minutes: c.minutes });
    });
  });
  const clients = [...total.values()]
    .filter((c) => c.key !== "Internal")
    .sort((a, b) => b.minutes - a.minutes);
  const internalRow = total.get("Internal");

  // max cell value for bar scaling
  let max = 0;
  weeks.forEach((w) =>
    w.per_client.forEach((c) => { if (c.minutes > max) max = c.minutes; }));
  if (!max) max = 1;

  const monthMax = Math.max(...[...clients, internalRow].filter(Boolean).map((c) => c.minutes), 1);

  function row(c, isInternal) {
    const color = window.CLIENT_COLORS[c.key] || "var(--color-cornflower)";
    return (
      <div className={"cwm__row" + (isInternal ? " cwm__row--internal" : "")} key={c.key}
           style={{ "--cw-color": color }}>
        <div className="cwm__lbl">{c.label}</div>
        {weeks.map((w, i) => {
          const cell = w.per_client.get(c.key);
          const min = cell?.minutes || 0;
          return (
            <div key={i} className="cwm__cell" title={`Wk ${i + 1}: ${vFmtMin(min)}`}>
              {min > 0 && (
                <>
                  <div className="cwm__bar"
                       style={{ width: `${(min / max) * 100}%`, background: color }} />
                  <span className="cwm__val tabular">{vFmtMin(min)}</span>
                </>
              )}
            </div>
          );
        })}
        <div className="cwm__total tabular">
          <div className="cwm__total-bar"
               style={{ width: `${(c.minutes / monthMax) * 100}%`, background: color }} />
          <span>{vFmtMin(c.minutes)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="cwm" style={{ "--cwm-weeks": weeks.length }}>
      <div className="cwm__head">
        <div className="cwm__lbl">Client</div>
        {weeks.map((w, i) => {
          const first = w.days[0]?.date;
          const last  = w.days[w.days.length - 1]?.date;
          const fd = first ? parseInt(first.slice(-2), 10) : "";
          const ld = last  ? parseInt(last.slice(-2),  10) : "";
          return (
            <div key={i} className="cwm__col-head">
              <span className="cwm__wk">Wk {i + 1}</span>
              <span className="cwm__wkrange tabular">{fd}–{ld}</span>
            </div>
          );
        })}
        <div className="cwm__total-head">Month</div>
      </div>
      {clients.map((c) => row(c, false))}
      {internalRow && row(internalRow, true)}
    </div>
  );
}

function MonthSection({ month, onSelectDate }) {
  const totals = month.totals;
  const weekendDaysOver = month.days.filter((d) => d.weekend && d.total_minutes > 0).length;
  const meetingMins = month.days.reduce((a, d) => a + d.meeting_minutes, 0);
  const agentMins   = month.days.reduce((a, d) => a + d.agent_minutes,   0);

  return (
    <section className="msect">
      <header className="msect__head">
        <div>
          <div className="msect__eyebrow">{month.days.length} days</div>
          <h2 className="msect__title">{month.label}</h2>
        </div>
        <div className="msect__kpis">
          <div className="msect__kpi">
            <span className="msect__kpi-lbl">Total</span>
            <span className="msect__kpi-val tabular">{vFmtMin(totals.total)}</span>
          </div>
          <div className="msect__kpi">
            <span className="msect__kpi-lbl">Weekday avg</span>
            <span className="msect__kpi-val tabular">{vFmtMin(totals.weekday_avg)}</span>
          </div>
          <div className="msect__kpi">
            <span className="msect__kpi-lbl">Meetings</span>
            <span className="msect__kpi-val tabular">{vFmtMin(meetingMins)}</span>
          </div>
          <div className="msect__kpi">
            <span className="msect__kpi-lbl">Agent</span>
            <span className="msect__kpi-val tabular">{vFmtMin(agentMins)}</span>
          </div>
          <div className="msect__kpi">
            <span className="msect__kpi-lbl">Weekend</span>
            <span className="msect__kpi-val tabular">
              {weekendDaysOver === 0 ? "Clean" : vFmtMin(totals.weekend_total)}
            </span>
          </div>
        </div>
      </header>
      <div className="msect__body">
        <MonthHeatmap days={month.days} onSelectDate={onSelectDate} />
        <DailyTable days={month.days} onSelectDate={onSelectDate} />
      </div>
      <div className="msect__matrix">
        <div className="msect__matrix-head">Per client · weekly</div>
        <ClientWeeklyMatrix days={month.days} />
      </div>
    </section>
  );
}

function MonthReview({ onSelectDate }) {
  const months = window.DASHBOARD.extended.months;
  const days = window.DASHBOARD.extended.days;
  const first = days[0] && new Date(days[0].date + "T12:00:00Z");
  const last  = days[days.length - 1] && new Date(days[days.length - 1].date + "T12:00:00Z");
  const fM = first?.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
  const lM = last?.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
  const title  = first ? `${fM} ${first.getUTCDate()}` : "";
  const accent = last  ? `– ${lM} ${last.getUTCDate()}` : "";
  return (
    <>
      <ViewHead
        eyebrow={`${days.length} days`}
        title={title}
        accent={accent}
        note="Each month is its own ledger. Click any heatmap cell or row to inspect that day."
      />
      <div className="msect-list">
        {months.map((m) => (
          <MonthSection key={m.month} month={m} onSelectDate={onSelectDate} />
        ))}
      </div>
    </>
  );
}

// Expose to app scope
Object.assign(window, {
  PeriodView, MonthReview, ViewHead, PeriodKpis,
  StackedBar, RankedList, MonthHeatmap, DailyTable, MiniBar,
  DonutCard, Donut, Legend,
});

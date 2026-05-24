# Design handoff: LPM Time Tracker

For a Claude.ai design conversation. Self-contained — assume the reader hasn't seen this work.

---

## What this is

An internal dashboard that visualizes Leya's working hours. **Zero manual input.**
Every minute on screen is computed from instrumented sources — Google Calendar,
Granola meeting recordings, Gmail sent counts, Google Drive file modifications,
and Claude Code session transcripts. The dashboard exists so Leya can audit her
own working pattern (am I on the client work I expect? am I drifting into nights
and weekends?) without ever logging a time entry.

It needs to be **strikingly on-brand** (LPM colors and typography), **honest and
auditable** (every number traceable to a source), and **calm in tone** — this is
a self-awareness tool for a founder, not a productivity scoreboard for a team.

## Who looks at it

- Leya. Only Leya. It lives on her laptop, served from localhost. The data is
  her own calendar / inbox / drive contents, so the surface is private.

## Current state

Working build at `~/LPM-AI-coding-projects/websites/playground/time-tracker/`.
Files:

- `index.html` — page shell + tab navigation + methodology modal
- `styles.css` — current pass is utilitarian neutral (greys + green/purple
  accents), NOT on brand yet. **This is what needs the redesign.**
- `app.js` — view rendering, Chart.js wiring, day-picker logic
- `data/dashboard.json` — generated nightly by the data pipeline
  (`automations/time-tracker/rollup.py` in the parent repo). Gitignored.

To see it: `python3 -m http.server 8788 --directory ~/LPM-AI-coding-projects/websites/playground/time-tracker` and open `http://localhost:8788/`.

## The four views

### 1. Day view (default tab)

A vertical calendar grid for a single day. Two side-by-side tracks:

- **Calendar** (left): Google Calendar events with another person — meetings.
  Solo blocks render with a dashed outline as "reminders, not counted." Personal
  events (gym, doctor, kid's appointments) are filtered out entirely.
- **Claude / agent activity** (right): contiguous active-work blocks from Claude
  Code transcripts, where Leya was producing client work, drafting BD, building
  agents, etc. Each block is attributed to a client or internal category by
  scanning what was in the prompt.

Above the grid: four KPIs (Active time, Wall-clock range, Meetings, Agent active).
Above the KPIs: a horizontal date-picker for the last 14 days plus a dropdown
that spans the full backfilled window (April 1 onward).

Below the grid: three donut charts (by task, by client, internal categories).

### 2. Last 7 days

Header KPIs (Total, Weekly average, Daily average, Weekend work).

A daily stacked-bar chart of time-by-task across the 7 days.

Three donut charts (clients, internal categories, tasks share).

Three ranked lists below the donuts — clients, internal categories, tasks —
each row a label + minute count + a colored progress bar.

### 3. Last 30 days

Same shape as Last 7. Same charts, longer time window.

### 4. Month review

Per-month KPI cards (one per calendar month in the backfilled window).

For each month:
- A 7-column **Sun-Sat heatmap grid** with each cell showing the daily total
  in minutes (intensity scaled to the busiest day of that month).
- A **scannable per-day table** below the grid with one row per day: weekday,
  total, meeting minutes, agent minutes, gmail, drive, a stacked mini-bar
  showing the same per-task split as the heatmap colors, and the top client /
  internal category for that day.

Clicking any cell in the grid or any row in the table jumps to Day view for
that date.

## Categories and how they show up

Three orthogonal lenses run through every view:

| Lens | Buckets |
|---|---|
| **By client** | ALDF, NYU Langone, CreativeMornings, NABU, CCC, HFNY, Pratt, Park City Presents, Apex, Cave Canem, Obama, KBC internal, more as needed |
| **Internal categories** (non-client time) | Infrastructure, Business Development, People Ops, Finance Ops, Other internal |
| **By task** (the underlying signal) | Meetings, Heads-down blocks, Agent work, Gmail (est.), Drive (est.), Granola extra |

Sub-attended meetings (Kathleen, Kelly, Aryana, Lauren) split equally across
that sub's current clients — so a 1-hour Kathleen sync becomes 20 min on each
of NABU / CCC / ALDF. Subs in onboarding (no clients yet) route to People Ops.

## Specific UX behaviors that need design treatment

- **Weekend work signal.** Leya's stated goal is no weekend work. Today the
  dashboard hatches weekend cells in red diagonal stripes and highlights table
  rows in a red wash. It works but reads "alarming" — we want a calmer
  "intent-check" cue that communicates "this is a goal you've set" rather
  than "you've messed up." Maybe a soft sage outline + a small icon.

- **Reminders, not work.** Solo calendar blocks (Leya time-blocking herself
  to do a task) show on the grid with a dashed outline and a "reminder
  (not counted)" label. Visually distinct from meetings without being noisy.
  Today: dashed border, low-contrast fill. Open to better treatments.

- **Estimated vs measured.** Gmail and Drive minutes are estimates (sent-count
  × 2 min, file-touch × 3 min). The methodology dialog explains this; on the
  dashboard itself, the only signal is the donut colors blend. Worth designing
  a clearer "this number is modeled" indicator that doesn't shout.

- **Empty days.** Days with zero captured minutes (real days off) shouldn't
  look like errors. Today: faint dotted cell. Fine, but worth a fresh eye.

- **Heatmap intensity scale.** Currently a warm tan-to-sage gradient. The
  on-brand version should use the LPM palette — likely a Gardenia → Lime
  → Cornflower ramp, or a Blueberry monochrome ramp. Whatever reads as
  "denser color = more time" while staying restful on the eye.

## What's working

- The four-tab structure is the right shape.
- The Day view's two-track calendar (Calendar events left, Claude blocks
  right) reads cleanly and is the part Leya audits against memory.
- The Month review heatmap-plus-table combo is the right format for
  "compare to my felt sense" review.
- Stacked bar charts handle the per-day mix legibly.

## What's not working (the brief)

- **It's not on brand.** Sage and purple feel arbitrary. Type is system stack.
- **Donut charts look generic Chart.js.** Custom colors and a tighter cutout
  would do a lot.
- **The KPI cards are utilitarian.** They communicate but they don't have
  personality. They should set the tone for the whole page.
- **The weekend signal is the wrong emotion** (see above).
- **No clear visual hierarchy between the four views.** Day view feels like
  the same weight as Month review even though they're different distances
  from the data. Day view is "look at one day"; Month review is "look at
  patterns over weeks." Could differ visually.
- **The tabs nav strip is plain.** Likely a candidate for more brand expression.
- **The Today / Day view "calendar grid" component is plain.** Strong candidate
  for visual identity — it's the most-looked-at piece.

## Constraints (hard)

- **Brand.** LPM palette and typography are locked. Reference:
  `~/.claude/skills/lpm-brand/SKILL.md`. Brand patterns are codified in the
  consolidated brand rules at the bottom of that file.
- **Static HTML / CSS / Vanilla JS.** Page reads `data/dashboard.json` via
  `fetch()`. No build step. No framework. Must serve from `python -m
  http.server`.
- **Chart.js is fine to keep** for the donuts and stacked bars (it's already
  loaded via CDN) but it can be themed heavily via the dataset config.
- **Data shape is fixed** — see `data/dashboard.json` for the exact schema.
  The renderer must not invent data; everything visible traces back to one of
  the five collectors.
- **Mobile.** Should be usable on Leya's phone (she might check it from
  bed) but doesn't need to be beautiful at <640px. Prioritize laptop.

## Constraints (soft, redirect if you have a better idea)

- The four tabs may not be the right structure long-term. If a single
  unified view works better, propose it.
- Chart.js is the path of least resistance but not required. Custom
  SVG / CSS works too if the visual is worth it.
- KPI cards in a 4-up row is the obvious layout. Hero-style or asymmetric
  layouts are also fine.

## What's out of scope

- Adding new data sources or changing what's tracked (that lives in the
  pipeline at `automations/time-tracker/`).
- Adding manual time entry (Leya has explicitly rejected this — the whole
  point is no self-report).
- Authentication / hosting (lives on localhost; private).
- Re-doing the brand spec — use what's there.

## Sample data

`data/dashboard.json` is gitignored (it contains Leya's calendar contents).
The schema:

```
{
  "as_of": "2026-05-23",
  "today": { date, total_minutes, per_task, per_client, per_internal,
             calendar_events: [...], claude_blocks: [...] },
  "last_7": { totals: {...}, days: [ {date, total_minutes, per_task,
              per_client, per_internal, calendar_events, claude_blocks}, ...] },
  "last_30": same shape as last_7,
  "extended": same shape, covers April 1 forward
}
```

To get a fresh sample for design work, run from the parent repo:
```
python3 automations/time-tracker/rollup.py --as-of 2026-05-23
```

## What I'd love back

A concrete redesign — ideally a pass on `index.html`, `styles.css`, and any
`app.js` adjustments needed for new interactions. Annotated with reasoning so
the next iteration can build on it.

If the right answer is "rebuild the Day view as a single hero panel and move
the rest below the fold" — propose it.

If Chart.js can be ripped out in favor of custom SVG that's more on-brand —
propose it.

A partial pass (one view done really well + sketches/comments for the rest) is
more useful than a full mediocre pass.

## Reference: the prior handoff

The org-chart redesign at `~/LPM-AI-coding-projects/websites/agent-org-chart/`
went through this same handoff flow and shipped well. See its
`DESIGN-HANDOFF.md` for the format the response should match, and its final
`styles.css` for a recent example of LPM brand applied to dense data.

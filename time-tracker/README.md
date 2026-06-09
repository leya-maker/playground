# time-tracker dashboard

Static visualization of Leya's automated time-tracker (see
`LPM-AI-coding-projects/automations/time-tracker/` for the data
pipeline).

## Status

`index.html` is the Day view redesign from the 2026-05-26 Claude
Design handoff. Brand-aligned (LPM palette, King and Queen + Work
Sans, two-track calendar grid, custom SVG donuts) with the Tweaks
panel for the variants already locked in.

All four views (Day, Last 7, Last 30, Month review) are wired and
rendering. Until the data adapter lands, the dashboard renders
against the fabricated 56-day sample baked into `data.js` (a
believable Tuesday 26 May 2026). The fabricated shape is documented
in `data.js` and mirrors what `rollup.py` produces; bridging the
existing `data/dashboard.json` to it is the next step.

## What it shows

- **Day view** (default): hour-by-hour two-track grid (Calendar lane
  and Agent / focus lane), four KPIs (Active time, Wall-clock,
  Meetings, Agent active), three donuts (task, client, internal).
- **Last 7 days**: hero metric, weekday vs weekend KPIs, custom
  stacked bar chart of time-by-task across the week, donuts, ranked
  lists.
- **Last 30 days**: same shape, longer window.
- **Month review**: one section per calendar month with a 7-column
  Sun-Sat heatmap, a daily ledger table, and a per-client weekly
  matrix.

## Where the data comes from (target)

`data/dashboard.json` is written by
`automations/time-tracker/rollup.py`. The nightly launchd job
`com.lpm.time-tracker-daily` regenerates it at 00:30 ET against
yesterday's data.

The JSON is gitignored locally because it's a generated artifact full
of Leya's calendar contents. The redesigned dashboard currently
ignores it and reads the fabricated `data.js` instead; an adapter
that fetches `data/dashboard.json` and reshapes it onto the
prototype's contract is the next ticket.

## Running it locally

```
cd websites/playground/time-tracker
python3 -m http.server 8788
open http://127.0.0.1:8788/
```

Static site (HTML + CSS + React / Babel via CDN, no build step).

## Tweaking the categorization

Two registries control how minutes get billed:

- `automations/time-tracker/registries/sub_clients.json`: sub-to-clients
  map. A meeting with a sub in this list is billed equally across that
  sub's clients.
- Calendar client keywords live inline in
  `automations/time-tracker/collectors/calendar_hours.py`. Add a keyword
  per client whenever a name pattern stops being recognized.

## Files

- `index.html`: page shell, loads React + Babel + the JSX modules.
- `styles.css`: brand tokens, layout, variant styles.
- `data.js`: fabricated sample data shaped like `dashboard.json`.
- `app.jsx`: App shell, Day view, KPI / Block / DatePicker components.
- `views.jsx`: PeriodView (7d / 30d), MonthReview, DonutCard.
- `tweaks-panel.jsx`: Tweaks panel scaffold (structure, treatment,
  density, weekend signal, heatmap ramp, Lime placement, background).
- `assets/`: Long_Blue logo, Fav_Blue favicon, arch PNGs, King and
  Queen + Work Sans font files.

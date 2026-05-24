# time-tracker dashboard

Static visualization of Leya's automated time-tracker (see
`LPM-AI-coding-projects/automations/time-tracker/` for the data
pipeline).

## What it shows

Three tabs:

- **Today**: a hour-by-hour timeline of today's calendar plus task /
  client / internal breakdown donuts and an event list.
- **Last 7 days**: a daily stacked-bar chart of how time split across
  tasks (Meetings, Heads-down, Claude Code, Gmail est., Drive est.,
  Granola extra), plus per-client and per-internal donuts.
- **Last 30 days**: same shape as Last 7, longer history.

## Where the data comes from

`data/dashboard.json` is written by
`automations/time-tracker/rollup.py`. The nightly launchd job
`com.lpm.time-tracker-daily` regenerates it at 00:30 ET against
yesterday's data.

The JSON is gitignored locally because it's a generated artifact full
of Leya's calendar contents. To view the page somewhere other than
Leya's laptop, the generation step has to run there too.

## Running it locally

```
cd websites/playground/time-tracker
python3 -m http.server 8788
open http://127.0.0.1:8788/
```

`fetch('data/dashboard.json')` requires a real HTTP server because of
browser file:// CORS restrictions — opening `index.html` directly will
fail to load the data.

## Tweaking the categorization

Two registries control how minutes get billed:

- `automations/time-tracker/registries/sub_clients.json` — sub-to-clients
  map. A meeting with a sub in this list is billed equally across that
  sub's clients.
- Calendar client keywords live inline in
  `automations/time-tracker/collectors/calendar_hours.py`. Add a keyword
  per client whenever a name pattern stops being recognized.

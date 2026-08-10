# Home Service Route Planner — Step-by-Step Guide

This app plans a single day of home-service work — HVAC calls, plumbing visits, electrical jobs, inspections — for one or more technicians. You enter the day's assumptions (start time, drive buffer, hour cap), add stop cards with priorities and appointment windows, order each tech's route, and the planner computes arrival and departure times, flags window conflicts and overloaded days, and produces a printable dispatch sheet. It is built for dispatchers and owner-operators of small field-service businesses who want a fast, offline route desk without a maps subscription. Everything stays in your browser, and every output is a draft for human review before the vans roll.

## Getting started

Open `index.html` directly in any modern browser, or serve the folder locally:

```bash
python3 -m http.server 8000
```

then visit `http://localhost:8000/apps/day-19-home-service-route-planner/`. No install, no build step, no network access needed.

## Step-by-step walkthrough

1. **Take the tour.** On your first visit the "How to use" guide opens automatically. Read the steps, then close it with the × button or `Esc`. You can reopen it any time with the header button or by pressing `?`.
2. **Load the demo day.** Click "Load demo" in the header. You'll see two vans, eight stops, capacity meters, and a couple of deliberate warnings (a late-arrival conflict and an over-capacity route). This is the fastest way to understand what the planner computes. Reset later when you're ready for real data.
3. **Set the day.** In "Day settings", pick the route date, day start, and depot, then set the per-tech hour cap, the default drive buffer between stops, and the admin/lunch buffer. Every schedule and capacity meter recomputes live from these numbers — the drive buffer is applied before *every* stop, including depot to first stop.
4. **Add technicians.** In the "Technicians" panel, rename the default tech and set their start time; use "+ Add tech" for more vans. Each tech gets their own route section, timeline, and capacity meter. Removing a tech moves their stops to the first remaining tech (with an Undo toast).
5. **Add stop cards.** In "Add a stop", enter the customer (required), area, and a work summary, then pick priority (Emergency/High/Normal/Low), the assigned tech, on-site minutes, the appointment window (opens/closes — both optional), and an optional drive override for stops that are unusually far. Submit with the button or `Enter`.
6. **Order the route.** On the route board, each stop card shows its computed drive, ETA, any wait until the window opens, and the on-site start–end times. Use the ▲/▼ arrows for manual ordering within a tech's route, or click "Sort by window" to sort every route by window-open time, then priority. Use "Edit" on a card to load it back into the form, "Delete" to remove it (Undo available for 7 seconds).
7. **Read the warnings and meters.** Red "Late" chips and per-tech warning lists flag stops that arrive after their window closes, emergencies buried mid-route, and techs over the day cap. The capacity meter turns amber above 85% and red over 100%. The stat strip on top tracks stops, the busiest tech's day, total drive + wait, and warning count.
8. **Hand off the dispatch sheet.** The dispatch sheet renders one section per tech with an ETA/on-site table and its warnings. In "Export & handoff": "Copy Markdown" (or `Ctrl/Cmd+S`) copies the whole sheet, "Print sheet" prints it cleanly with one page per tech, "Download CSV" exports the stop table for spreadsheets, and "Download JSON" saves the full plan — re-loadable later via "Import JSON".

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `?` | Open the help guide |
| `Esc` | Close dialogs |
| `Ctrl/Cmd + S` | Copy the dispatch sheet as Markdown |
| `Enter` (in stop form) | Add / update the stop |

## Your data & privacy

Everything is stored in your browser's `localStorage` under the key `fable-remake:day-19-home-service-route-planner:v1` — nothing ever leaves your machine, and there are no accounts, cookies, or trackers. "Download JSON" gives you a full backup you can re-import on any machine; "Reset" (with confirmation) clears the planner but keeps your theme. Clearing browser site data deletes the plan, so export JSON before wiping.

## Tips & good practice

- **Buffer honestly.** Set the default drive buffer to your *typical worst* leg, and use per-stop drive overrides for the outliers — an optimistic buffer makes every downstream ETA a lie.
- **Front-load emergencies.** The planner warns when an Emergency stop isn't first on a route; if you deliberately schedule around a hard window, note why in the dispatcher note so the tech knows.
- **Leave slack on purpose.** A route at 85–95% of the cap has no room for a callback or a slow job. Green meters make good days.
- **Windows beat priorities for ordering.** Use "Sort by window" first, then hand-adjust with the arrows — it usually produces fewer conflicts than sorting by priority alone.
- **Print per tech.** The print layout puts each technician on their own page, so one print run gives every van its own sheet.

## Troubleshooting

- **"My plan disappeared."** Data is per-browser and per-profile. Check you're in the same browser/profile (and not a private window). Restore from a JSON export if you have one.
- **"Import JSON failed."** The file must be a JSON export from this app (or at least contain its `state` shape). Files edited by hand with syntax errors will be rejected — the planner never crashes on bad input, it just refuses it.
- **"The times look wrong."** Check the tech's start time and the default drive buffer — the drive buffer is added before *every* stop, including the first. A stop arriving before its window shows a "Wait" chip; the schedule holds until the window opens.
- **"Printing shows the whole app."** Use the "Print sheet" button (or the browser's print) — the print stylesheet hides everything except the dispatch sheet. If it still looks off, make sure background graphics are off and paper size is portrait.

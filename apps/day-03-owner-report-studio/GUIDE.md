# Owner Report Studio — Step-by-Step Guide

Owner Report Studio turns raw operating numbers and notes into a tight daily or weekly owner report: metrics with deltas vs the prior period, wins, risks, decisions needed, and next actions — plus a health checklist that tells you when the report is actually ready to send. It's built for operators, dispatchers, GMs, or anyone who briefs a small-business owner and wants the brief to be sharp, honest, and ten seconds to read. Everything runs locally in your browser; nothing is sent anywhere.

## Getting started

Open `index.html` directly in any modern browser, or serve the folder locally:

```bash
python3 -m http.server 8000
```

Then browse to `http://localhost:8000/apps/day-03-owner-report-studio/` (adjust the path to wherever you serve from). No install, no build step, no account.

## Step-by-step walkthrough

1. **Take the tour.** On your first visit the "How to use" guide opens automatically. Read it, close it with Esc or the ✕ button — you can reopen it any time with the **How to use** button or the `?` key.
2. **Load the demo (optional but recommended).** Click **Load demo** in the header. A realistic weekly report for a fictional HVAC company fills every section, so you can see what a finished report looks like before you build your own. Click **Reset** when you're ready to start fresh (it asks for confirmation).
3. **Set the report frame.** In *Report setup*, enter the business name (required — it's highlighted until filled), pick the report date, choose **Daily** or **Weekly**, and name the audience (e.g. "Owner + GM"). The report preview on the right updates as you type.
4. **Add your metrics.** In the *Metrics* panel click **+ Metric** for each headline number. For each row: name it, pick a format (`$`, `#`, `%`, `hrs`), enter the **current** value and the **prior-period** value, and choose whether **▲ up** or **▼ down** is good (revenue: up; response delay: down). The delta chip on the row and the Δ / Δ% columns in the preview compute instantly, colored green when the metric is moving the right way and red when it isn't. The trend line under the table ("3 improving · 1 declining…") summarizes the period at a glance.
5. **Write the executive summary.** Two or three sentences the owner can read in ten seconds: what moved, what's at risk, what needs a decision. The health checklist expects at least 40 characters — a real summary, not a placeholder.
6. **Log wins, risks, decisions, and actions.** Wins are concrete proof points. Each risk gets a severity (Low / Medium / High — high risks show in red and count in the stat strip). Each decision gets an owner and an optional due date. Each next action gets an owner and a done checkbox. Deleting any row shows an **Undo** toast for 7 seconds in case you slip.
7. **Watch Report health.** The panel at the top right scores the report against 8 checks (header complete, summary written, 3+ metrics, priors filled so deltas compute, a win, a risk, an owned decision, owned actions). The ring, badge, and stat strip update live — aim for **Ready to send**.
8. **Export and hand off.** In *Export & handoff*: **Copy Markdown** (or press Ctrl/Cmd+S) copies the full report; **Download .md** saves it; **Metrics CSV** exports the metrics table with deltas; **Download JSON** saves a full backup you can restore later with **Import JSON**; **Print** turns the preview into a clean one-page document. Every export is a draft for human review.

## Keyboard shortcuts

| Key | Action |
|---|---|
| `?` | Open the how-to-use guide |
| `Esc` | Close the guide dialog |
| `Ctrl/Cmd + S` | Copy the report Markdown to the clipboard |

## Your data & privacy

- Everything you type is stored only in this browser's `localStorage` under the key `fable-remake:day-03-owner-report-studio:v1`. There is no backend, no account, no cookie, no analytics, and no network request.
- **Backup:** use *Download JSON* regularly if the report matters — browser storage can be cleared by the browser or by you.
- **Restore / move machines:** use *Import JSON* with a previously downloaded file.
- **Start over:** the *Reset* button clears the report (theme preference is kept).

## Tips & good practice

- **Keep the same metrics every period.** Deltas only mean something when yesterday's "current" becomes today's "prior" — consistency makes trends visible.
- **Pick the good direction honestly.** "Open leads up" can be pipeline or backlog; decide what it means for your business and set ▲/▼ accordingly, then keep it fixed.
- **One decision per row.** If a decision needs two owners or two dates, it's two decisions. Vague decision rows are how reports get ignored.
- **Write the summary last.** Fill metrics, wins, and risks first — the summary practically writes itself once the numbers are in front of you.
- **Don't send below "Ready to send."** The checklist encodes what makes an owner trust a report: numbers with context, at least one proof point, a named risk, and a decision with an owner.

## Troubleshooting

- **"My data disappeared."** localStorage is per browser and per profile. Check that you're in the same browser/profile (and not a private/incognito window). Restore from a JSON backup if you have one.
- **"Import JSON does nothing / says it failed."** The file must be JSON exported by this app (or matching its shape). Open it in a text editor and confirm it starts with `{`. Unknown fields are ignored safely; corrupt files are rejected without breaking your current report.
- **"Deltas show — instead of numbers."** A delta needs both a current and a prior value on that metric row. Fill the "prior" box.
- **"Printing shows the whole page, not just the report."** Use the app's **Print** button (or your browser's print with this tab focused) — the print stylesheet hides everything except the report sheet. If a browser extension overrides print styles, try another browser.

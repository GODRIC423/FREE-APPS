# Case Study Factory — Step-by-Step Guide

Case Study Factory turns client wins into publishable case studies. It is built for consultants, agencies, and freelancers who deliver great results but never get around to writing them up — it structures the client interview, assembles the story into eight narrative beats, produces three ready-to-use lengths (logline, trailer, feature), and tracks written consent so nothing ships without approval. Everything runs locally in your browser; nothing is sent anywhere.

## Getting started

Open `apps/05-case-study-factory/index.html` directly in any modern browser — the file is fully self-contained (fonts, styles, and code are all inlined). Alternatively, serve the repo root with any static server and navigate to the same path.

## Walkthrough

1. **First open.** The "How the Factory runs" guide appears automatically on your first visit. Close it with the button, `Esc`, or read through — it only auto-opens once.
2. **Load the demo.** Click **Load demo** in the header. A finished production ("Meridian Freight Co.") and a partial one ("Bright & Co. Accounting") land on the Production Slate so you can see every tab done well.
3. **The hero marquee.** The projector screen at the top always shows the selected study's logline, its pipeline status, and the "In the can" reel dial — a live completeness score across capture, metrics, quotes, beats, and clearances.
4. **The Production Slate (left).** Click a card to select it, filter by pipeline status with the chips, press **New** (or the `N` key) for a blank production, and use the trash icon to delete — deletions show a 7-second **Undo** toast instead of a confirmation box.
5. **The Shoot tab.** Capture the raw material: client/industry/service/timeframe, the interview reel (Before / During / After in the client's own words), before→after metrics (each gets a live bar chart and a computed delta badge), and verbatim quotes with an approval checkbox each. Set the pipeline status at the bottom.
6. **The Edit Bay tab.** Write the eight narrative beats — Hook, Before, Stakes, Turn, Work, After, Receipts, Trailer Card. Each beat has a coaching hint. Reorder beats with the arrows, toggle "In the cut" to exclude a beat from the final, and watch the film-strip meter fill as you write.
7. **The Screening Room tab.** Three cuts are assembled live from your material: **The Logline** (one sentence — your Hook beat, or auto-generated from your strongest metric), **The Trailer** (half page), and **The Feature** (the full case study with a results table and approved quotes). Copy any of them as Markdown.
8. **The Clearances tab.** Tick off written approvals — quotes verbatim, metrics, name/logo, placements, final sign-off — and record the approver, sent/approved dates, and any redlines. The panel warns when quotes on tape are still unapproved.
9. **The Writers' Room (right).** Four Copilot actions build complete, ready-to-paste prompts around the selected production's full data: *Notes to first draft*, *Mine the pull-quotes*, *Cut 3 social posts*, and *Credibility pass*. Click **Copy prompt**, paste into [claude.ai](https://claude.ai) — this works with the standard $20 Claude subscription, no API key. Paste Claude's answer into **Claude's dailies**; it saves with the production.
10. **Export.** The **Export** button offers: copy the Feature cut as Markdown, print / save as PDF (a clean print stylesheet renders only the case study), download the full JSON backup, download a slate CSV (one row per production), and import a JSON backup.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `?` | Open the guide |
| `Esc` | Close any dialog |
| `N` | New production |
| `Ctrl/Cmd + S` | Copy the Feature cut as Markdown |

## Your data & privacy

All data lives in your browser's localStorage under the key `bizdev:05-case-study-factory:v1`. Nothing is transmitted anywhere — there are no network calls at all. Use **Export → Download JSON** for backups and **Import JSON** to restore; imports run through the same validator as saved data, so corrupt files are rejected safely.

## Pro tips

- Do the interview **the week the result lands** — metrics and emotions both decay. The Shoot tab works fine on a phone during the call.
- One defensible number beats five soft ones. Ask the client: "Which of these numbers would you defend to your own board?"
- Keep quotes verbatim in The Shoot; if you tighten wording, use the *Mine the pull-quotes* prompt and re-seek approval for the edited line.
- The Logline pulls from your Hook beat first — write the Hook last, after the metrics have told you what the story is.
- Run the *Credibility pass* prompt before the client review; fixing weak claims early saves an approval round-trip.

## Troubleshooting

- **The logline says to write a Hook beat.** Either write the Hook beat in the Edit Bay, or add a metric with numeric before/after values — the generator needs one or the other.
- **A metric shows no bar chart.** The before/after fields must contain numbers (symbols like `$` and `%` are stripped automatically; words are not).
- **Print shows a blank page.** Printing renders the *selected* production's Feature cut — select a study with written beats first.
- **My data disappeared.** localStorage is per-browser and per-profile; private/incognito windows discard it on close. Re-import your JSON backup, and export one regularly.
- **`?` doesn't open the guide.** Click outside any text field first — shortcuts are suspended while you type.

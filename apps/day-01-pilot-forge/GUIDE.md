# Pilot Forge — Step-by-Step Guide

Pilot Forge is a drafting room for AI pilots. A rough "I could build an AI thing for that business" goes on the blueprint sheet; a scoped pilot you can actually pitch comes off it: a live schematic of the pilot, a fit gauge that explains its own needle, a loss calculation built from the owner's numbers, a day-by-day schedule of proof, work-order clipboards, and an issued brief. It is built for freelancers, agencies, and operators who sell small AI pilots to local service businesses (HVAC, plumbing, dental, law, and similar) and want to walk in with a drawing instead of promises.

## Getting started

- Open `index.html` directly in any modern browser, **or**
- Serve the folder locally and browse to it:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/apps/day-01-pilot-forge/
```

No install, no accounts, no network access — everything runs and saves in your browser.

## Step-by-step walkthrough

1. **Read the operator's card on first open.** It opens automatically the first time. Close it with `Esc` or the ✕ button; reopen it any time with the header button or the `?` key.
2. **Pin up the sample job.** Click **Pin up a sample job** in the header to fill a realistic scenario (Rivera Heating & Air, missed-call rescue). Every zone of the sheet populates — schematic, gauge, calculation, schedule, and boards. Use it to learn the table, then **Clear the sheet** (confirmed) to start your own pilot.
3. **Watch the general arrangement.** The blueprint at the top of the sheet — intake → pilot wedge → human gate → proof artifact → owner — redraws live from your specification, with the proof window as a dimension line and the title block carrying fit score, leak, recoverable revenue, and fee.
4. **Zone A — Specification.** Pick the business type, optionally the business name, and the *wedge* — the one leak this pilot fixes (missed calls, web leads, quote follow-up, reviews, or owner reporting). Write the owner's pain in one concrete sentence and describe the proof the owner will hold. Empty fields are flagged inline because the brief is not sellable without them.
5. **Set the gate.** The F-06 slider runs Manual → Draft-only → Reviewed auto → Full auto. Draft-only reads best on the gauge on purpose: it is the safest thing to sell first. The risk chip and description update live.
6. **Read the fit gauge.** The needle sweeps 0–100 and the verdict prints beside it. The inspection record below lists six factors (Revenue upside, Pain clarity, Proof definition, Speed to proof, Risk posture, Fee payback), each with its points, a plain-language reason, and a fix when it is weak. Work the lowest line first — the gauge, proof window, and title block recompute on every keystroke.
7. **Zone B — Loss calculation.** Enter missed leads per week, close rate, average job value, and expected recovery rate (D-01 through D-04). The calculation block rules out the monthly and yearly leak, recoverable revenue, a suggested pilot fee, and the owner's payback multiple. Inputs are clamped to sane ranges automatically.
8. **Zone C — Schedule of proof.** Milestones are drafted from your wedge and proof window (7, 14, or 21 days depending on score). Tick them as inspected, redraw the day or wording inline, strike with undo, add your own with **+ Add a milestone**, or **Redraft schedule** to rebuild from the current wedge. Until you edit by hand, the schedule keeps itself in sync with your wedge.
9. **Zone D — Work orders.** Type an action and press **Cut card**. Drag cards between the Queued / On the bench / Signed off clipboards, or walk them with the ◀ ▶ buttons. Striking a card shows a 7-second Undo toast.
10. **Zone E — Issue the drawing.** The full Markdown brief previews on the issue paper. **Copy Markdown brief** (or `Ctrl/Cmd+S`) copies it, **File JSON copy** saves a backup of everything, **Load JSON copy** restores it, and **Print issued sheet** produces a clean one-page document with a proper title block. The stamp beside the paper reads APPROVED FOR PROOF once the gauge clears 60; below that it holds. Every export is labeled a draft for human review.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `?` | Open the operator's card |
| `Esc` | Close dialogs |
| `Ctrl/Cmd + S` | Copy the Markdown brief |

## Your data & privacy

- Everything is stored in your browser's `localStorage` under the key `fable-remake:day-01-pilot-forge:v1`. Nothing leaves your machine — no accounts, cookies, analytics, or network calls.
- **File JSON copy** gives you a portable backup; **Load JSON copy** restores it (invalid files are rejected safely, and backups made in the previous version of the app load fine).
- **Clear the sheet** scraps the current pilot after a confirmation. Clearing browser site data also removes it, so file a JSON copy for anything you care about.

## Tips & good practice

- **Put a number in the pain sentence.** "10–14 after-hours calls a week never get a callback" sells; "they miss calls sometimes" doesn't. The Pain clarity line rewards this.
- **Sell draft-only first.** Owners buy safety. Automation is something you earn with pilot results, not something you lead with — the Risk posture line scores it that way.
- **Aim for 5×+ payback.** If the suggested fee doesn't pay back at least five times per month, either the leak numbers are wrong or the wedge is too small to pilot.
- **Keep the proof window short.** A 7–14 day window with a countable daily artifact beats a vague month-long trial.
- **Verify numbers with the owner before pitching.** The loss calculation is only as strong as the missed-lead count — get it from their phone logs, not your guess.

## Troubleshooting

- **My data disappeared.** localStorage is per browser *and* per profile. Check you're in the same browser/profile, and that the page isn't open in a private/incognito window. Load your JSON copy if you filed one.
- **Copy Markdown does nothing.** Some browsers block the clipboard on `file://` pages. The app falls back automatically, but if it still fails, select the text on the issue paper and copy manually — or serve the folder with `python3 -m http.server`.
- **The schedule overwrote my edits.** The schedule auto-syncs with your wedge and score *only until* you edit a milestone. If you want a fresh schedule after editing, click **Redraft schedule** (undo is offered).
- **Drag-and-drop doesn't work on my phone.** Touch browsers vary on HTML5 drag; use the ◀ ▶ buttons on each card — they do exactly the same thing.

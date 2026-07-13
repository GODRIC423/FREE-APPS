# Pilot Forge — Step-by-Step Guide

Pilot Forge turns a rough "I could build an AI thing for that business" idea into a scoped pilot you can actually pitch: a fit score that explains itself, a revenue case built from the owner's own numbers, a day-by-day proof plan, an action board, and a clean exportable brief. It is built for freelancers, agencies, and operators who sell small AI pilots to local service businesses (HVAC, plumbing, dental, law, and similar) and want to walk in with proof instead of promises.

## Getting started

- Open `index.html` directly in any modern browser, **or**
- Serve the folder locally and browse to it:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/apps/day-01-pilot-forge/
```

No install, no accounts, no network access — everything runs and saves in your browser.

## Step-by-step walkthrough

1. **Read the guide on first open.** The "How to use" dialog opens automatically the first time. Close it with `Esc` or the ✕ button; reopen it any time with the header button or the `?` key.
2. **Load the demo.** Click **Load demo** in the metrics strip to fill a realistic scenario (Rivera Heating & Air, missed-call rescue). You'll see every panel populate — score, numbers, plan, and board. Use it to learn the flow, then **Reset** (confirmed) to start your own pilot.
3. **Shape the pilot (Step 1 panel).** Pick the business type, optionally the business name, and the *wedge* — the one leak this pilot fixes (missed calls, web leads, quote follow-up, reviews, or owner reporting). Write the owner's pain in one concrete sentence and describe the proof the owner will see. Empty fields are highlighted inline because the brief is not sellable without them.
4. **Set the automation level.** The slider runs Manual → Draft-only → Reviewed auto → Full auto. Draft-only scores best on purpose: it is the safest thing to sell first. The risk chip and description update live.
5. **Watch the fit score.** The ring shows 0–100 and the verdict. Below it, six factors (Revenue upside, Pain clarity, Proof definition, Speed to proof, Risk posture, Fee payback) each show their points, a plain-language reason, and a tip when they are weak. Fix the lowest factor first — the score, proof window, and stat strip recompute on every keystroke.
6. **Run the numbers (Step 2 panel).** Enter missed leads per week, close rate, average job value, and expected recovery rate. The app computes the monthly and yearly leak, recoverable revenue, a suggested pilot fee, and the owner's payback multiple. Inputs are clamped to sane ranges automatically.
7. **Edit the proof plan (Step 3 panel).** Milestones are generated from your wedge and proof window (7, 14, or 21 days depending on score). Check them off as you complete them, edit the day or wording inline, delete with undo, add your own with **+ Milestone**, or **Regenerate** to rebuild from the current wedge. Until you edit by hand, the plan keeps itself in sync with your wedge.
8. **Work the action board (Step 4 panel).** Type an action and press **Add task**. Drag cards between To do / In progress / Done, or use the ◀ ▶ buttons on each card. Deleting a card shows a 7-second Undo toast.
9. **Export the brief (Step 5 panel).** The full Markdown brief previews live. **Copy Markdown** (or `Ctrl/Cmd+S`) copies it, **Download JSON** saves a backup of everything, **Import JSON** restores it, and **Print brief** produces a clean one-page document. Every export is labeled a draft for human review.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `?` | Open the How-to-use guide |
| `Esc` | Close dialogs |
| `Ctrl/Cmd + S` | Copy the Markdown brief |

## Your data & privacy

- Everything is stored in your browser's `localStorage` under the key `fable-remake:day-01-pilot-forge:v1`. Nothing leaves your machine — no accounts, cookies, analytics, or network calls.
- **Download JSON** gives you a portable backup; **Import JSON** restores it (invalid files are rejected safely).
- **Reset** clears the current pilot after a confirmation. Clearing browser site data also removes it, so export a JSON backup for anything you care about.

## Tips & good practice

- **Put a number in the pain sentence.** "10–14 after-hours calls a week never get a callback" sells; "they miss calls sometimes" doesn't. The Pain clarity factor rewards this.
- **Sell draft-only first.** Owners buy safety. Automation is something you earn with pilot results, not something you lead with — the Risk posture factor scores it that way.
- **Aim for 5×+ payback.** If the suggested fee doesn't pay back at least five times per month, either the leak numbers are wrong or the wedge is too small to pilot.
- **Keep the proof window short.** A 7–14 day window with a countable daily artifact beats a vague month-long trial.
- **Verify numbers with the owner before pitching.** The ROI case is only as strong as the missed-lead count — get it from their phone logs, not your guess.

## Troubleshooting

- **My data disappeared.** localStorage is per browser *and* per profile. Check you're in the same browser/profile, and that the page isn't open in a private/incognito window. Import your JSON backup if you have one.
- **Copy Markdown does nothing.** Some browsers block the clipboard on `file://` pages. The app falls back automatically, but if it still fails, select the text in the preview box and copy manually — or serve the folder with `python3 -m http.server`.
- **The proof plan overwrote my edits.** The plan auto-syncs with your wedge and score *only until* you edit a milestone. If you want a fresh plan after editing, click **Regenerate** (undo is offered).
- **Drag-and-drop doesn't work on my phone.** Touch browsers vary on HTML5 drag; use the ◀ ▶ buttons on each card — they do exactly the same thing.

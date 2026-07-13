# SOP Builder — Step-by-Step Guide

SOP Builder is a local-first workspace for writing standard operating procedures: the trigger that starts the work, the owner, the inputs, the exact steps (each with its own owner, tool, and duration), the quality checks, and the exception paths for when things go wrong. It is built for small-business owners and ops leads who want repeated work to run the same way every time — without a wiki, an account, or a cloud tool. Everything stays in your browser, and every export is a draft for human review.

## Getting started

- Open `index.html` directly in any modern browser, **or**
- Serve the folder locally and browse to it:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/apps/day-14-sop-builder/` in your browser. No install, no build step, no network access needed.

## Step-by-step walkthrough

1. **Open the app and read the guide.** On your first visit the "How to use" dialog opens automatically. Close it with `Esc` or the close button — you can reopen it any time with the header button or the `?` key.
2. **Load the demo library (recommended first).** Click **Load demo** in the header. Three finished SOPs appear in the library: a missed-lead callback sweep, a weekly invoice run, and a new-hire setup. Click through them to see what a complete procedure looks like — steps with owners and durations, verified quality checks, and exception paths. If you had your own data, an **Undo** button in the toast restores it for 7 seconds.
3. **Create your own SOP.** Click **+ New** in the library panel. A fresh SOP opens with one empty step and four seeded quality checks (the classic gates: inputs present, decision owner named, exceptions consulted, human approval for customer-facing actions). Edit or delete these freely.
4. **Fill in the Overview.** Give the SOP a title, an owner (write a role like "Ops lead", not a person's name), the trigger that starts it, how often it runs, its purpose, the inputs needed (one per line), and a definition of done. Required fields show an amber border until filled — the completeness score tells you why each one matters.
5. **Break the work into steps.** Click **+ Add step** for each station of the work. Every step gets a title, the exact action in plain words, an owner, the tool used, and a duration in minutes. Reorder steps by dragging the ⠿ handle or with the ↑ ↓ buttons. The stat strip's "Est. runtime" sums your step durations live.
6. **Write quality checks and exception paths.** Quality checks are the inspection list a runner ticks before calling a run done — write at least three. Tick a checkbox in the builder once you have verified that check in a dry run. Exception paths capture "if X goes wrong, do Y, escalate to Z" — these are what make an SOP safe to delegate, and the score rewards at least two.
7. **Watch the completeness score.** The Completeness panel shows a 0–100% structural score across four categories (Basics, Steps, Quality checks, Exceptions) plus a "Fix next" list naming exactly what is still missing. Aim for "Run-ready draft" (90%+) before handing the SOP to someone.
8. **Export and hand off.** Use **Copy Markdown** (or `Ctrl/Cmd+S`) for the full document, **Print SOP** for a clean paper copy of the document preview, **Download JSON** for the whole re-importable library, and **Steps CSV** for the step table. **Duplicate SOP** clones a procedure as a starting point for a variant. Everything exported is labeled as a draft for human review.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `?` | Open the how-to-use guide |
| `Esc` | Close dialogs |
| `Ctrl/Cmd + S` | Copy the current SOP as Markdown |

## Your data & privacy

- All data lives in your browser's `localStorage` under the key `fable-remake:day-14-sop-builder:v1`. Nothing is sent anywhere — there is no backend, no account, no analytics.
- **Download JSON** exports the entire library; **Import JSON** restores it (in this or another browser). Imports are validated, and a bad file cannot crash the app.
- **Reset all data** (in Export & handoff) deletes every SOP after a confirmation. Deleting a single SOP, step, check, or exception shows a 7-second **Undo** toast instead.
- Data saved by the previous version of this app is migrated automatically on first load.

## Tips & good practice

- **Write owners as roles, not names.** "Bookkeeper" survives staff turnover; "Sandra" does not.
- **A step should be small enough to hand off.** If a step needs its own sub-steps, split it — the duration field is a good smell test: anything over ~30 minutes probably hides two steps.
- **Exception paths are the real SOP.** Anyone can follow the happy path; write down the angry-customer, missing-input, and system-down branches so juniors don't improvise.
- **Dry-run before you delegate.** Have someone else run the SOP once while you watch, tick the quality checks you verified, then fix what confused them.
- **Keep approval gates explicit.** Any step that touches a customer, money, or public content should name who approves it before it happens.

## Troubleshooting

- **"My SOPs disappeared."** localStorage is per browser and per profile. Check you are in the same browser/profile (and not a private window). Re-import your last JSON export if you have one.
- **"Import failed" toast.** The file must be a JSON export from this app (or a single SOP object with a `steps` array). Re-export from the source browser and try again.
- **Copy Markdown does nothing.** Some browsers block the clipboard on `file://` pages; the app falls back automatically, but if it still fails, use **Download JSON** or select text in the document preview.
- **Printing shows the whole app.** Use the **Print SOP** button (or your browser's print dialog while an SOP is open) — the print stylesheet hides everything except the document preview. If a print preview looks stale, click into the app once so the preview re-renders, then print again.

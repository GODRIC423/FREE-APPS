# The Field Manual — Step-by-Step Guide

The Field Manual is a local-first workspace for writing standard operating procedures as if you were authoring a crisp operations manual: the trigger that opens it, the owning role, what must be on hand, the numbered steps (each with owner, tool, and minutes in the margin), the inspection checklist, and the "in case of" paths for when the day goes sideways. It is built for small-business owners and ops leads who want repeated work to run the same way every time — without a wiki, an account, or a cloud tool. Everything stays in your browser, and every export is a draft for human review.

## Getting started

- Open `index.html` directly in any modern browser, **or**
- Serve the folder locally and browse to it:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/apps/day-14-sop-builder/` in your browser. No install, no build step, no network access needed.

## Step-by-step walkthrough

1. **Open the app and read the operator's card.** On your first visit the operator's card opens automatically. Close it with `Esc` or the close button — reopen it any time with the **Operator's card** button in the cover band or the `?` key.
2. **Rack the specimen manuals (recommended first).** Click **Rack specimen manuals** in the cover band. Three finished manuals land on the shelf: a missed-lead callback sweep, a weekly invoice run, and a new-hire setup. Click through their spines to see what a complete procedure looks like — numbered steps with margin notes, stamped inspection points, and red-edged exception boxes. If you had your own data, an **Undo** button in the toast restores it for 7 seconds.
3. **Draft your own manual.** Click **+ Draft manual** on the shelf. A fresh manual opens with one empty step and four seeded inspection points (the classic gates: inputs present, decision owner named, exceptions consulted, human approval for customer-facing actions). Edit or delete these freely.
4. **Fill §1 Identification.** Give the procedure a title, an owning role (write a role like "Ops lead", not a person's name), the trigger that opens it, its cadence, why the manual exists, what must be on hand (one per line), and a definition of done. Required fields show a dashed safety-orange rule until filled — the certification seal tells you why each one matters.
5. **Number the work in §2 Procedure.** Click **+ Add step** for each station of the work. Every step gets a name, the exact action in plain words, and margin notes: owner, tool, and minutes. Reorder steps by dragging the grip in the step's rail or with the ↑ ↓ arrows. "Est. runtime" in the document control block sums your minutes live.
6. **Write §3 Inspection and §4 In case of.** Inspection points are the short list an inspector checks before a run counts — write at least three, and stamp the circular tick once you have verified a point in a dry run. "In case of" boxes capture "if X goes wrong, do Y, escalate to Z" — these are what make a manual safe to hand over, and the seal rewards at least two.
7. **Watch §5 Certification.** The seal inks in from 0–100% across four categories (Basics, Steps, Quality checks, Exceptions), with a stamped grade and a "Fix next" list naming exactly what is still missing. Aim for **Ready to issue** (90%+) before handing the manual to someone.
8. **Issue & file in §6.** Use **Copy as Markdown** (or `Ctrl/Cmd+S`) for the full document, **Print the issued page** for a clean paper copy, **Download library JSON** for the whole re-importable shelf, and **Steps CSV** for the step table. **Duplicate manual** clones a procedure as a starting point for a variant. Everything exported is labeled as a draft for human review.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `?` | Open the operator's card |
| `Esc` | Close dialogs |
| `Ctrl/Cmd + S` | Copy the open manual as Markdown |

## Your data & privacy

- All data lives in your browser's `localStorage` under the key `fable-remake:day-14-sop-builder:v1`. Nothing is sent anywhere — there is no backend, no account, no analytics.
- **Download library JSON** exports the entire shelf; **Import JSON** restores it (in this or another browser). Imports are validated, and a bad file cannot crash the app.
- **Reset all data** (in §6 Issue & file) deletes every manual after a confirmation. Deleting a single manual, step, inspection point, or exception shows a 7-second **Undo** toast instead.
- Data saved by the previous version of this app is migrated automatically on first load.

## Tips & good practice

- **Write owners as roles, not names.** "Bookkeeper" survives staff turnover; "Sandra" does not.
- **A step should be small enough to hand off.** If a step needs its own sub-steps, split it — the minutes note in the margin is a good smell test: anything over ~30 minutes probably hides two steps.
- **The "in case of" boxes are the real manual.** Anyone can follow the happy path; write down the angry-customer, missing-input, and system-down branches so juniors don't improvise.
- **Dry-run before you hand it over.** Have someone else run the procedure once while you watch, stamp the inspection points you verified, then fix what confused them.
- **Keep approval gates explicit.** Any step that touches a customer, money, or public content should name who approves it before it happens.

## Troubleshooting

- **"My manuals disappeared."** localStorage is per browser and per profile. Check you are in the same browser/profile (and not a private window). Re-import your last JSON export if you have one.
- **"Import failed" toast.** The file must be a JSON export from this app (or a single SOP object with a `steps` array). Re-export from the source browser and try again.
- **Copy as Markdown does nothing.** Some browsers block the clipboard on `file://` pages; the app falls back automatically, but if it still fails, use **Download library JSON** or select text in the issued page.
- **Printing shows the whole app.** Use the **Print the issued page** button (or your browser's print dialog while a manual is open) — the print stylesheet hides everything except the issued page, on clean white. If a print preview looks stale, click into the app once so the preview re-renders, then print again.

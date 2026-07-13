# Proof Vault — Step-by-Step Guide

Proof Vault is a local-first library for cataloging evidence of your wins — screenshots, metrics, client quotes, approval records — as reusable proof cards. Each card carries a redaction checklist and moves through an explicit approval workflow before it can be reused, and a built-in generator drafts case-study angles from approved evidence. It is for consultants, freelancers, and small agencies who keep winning but never capture the proof in a form they can safely show a prospect.

## Getting started

Open `index.html` directly in any modern browser, or serve the folder locally:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000/apps/day-13-proof-vault/`. No install, no build step, no account — everything runs and stays in your browser.

## Step-by-step walkthrough

1. **Take the tour.** On first visit the "How to use" guide opens automatically (reopen it any time with the header button or `?`). Close it to land on the evidence library.
2. **Load the demo.** Click **Load demo** to fill the vault with five realistic cards in different workflow states. The stat strip at the top updates live: total cards, approved count, cards with open redaction, and average readiness. This is the fastest way to see the whole system working.
3. **Create your first card.** Click **+ New proof card** (or press `N`). You land in the detail view. Give the card a title, the source workflow or project it came from, and an artifact type (screenshot, result metric, client quote, and so on). The title is required — the workflow will not advance without it.
4. **Write the context and result.** Fill in *Context* (what the situation was) and *Result* (what measurably changed), plus a short *Headline metric* like "3 of 11 stale quotes revived". Note where the evidence file lives in *Evidence location*. Watch the **Readiness** score climb as the card gains substance — it blends completeness, redaction, workflow stage, and your impact/confidence ratings into a 0–100 score.
5. **Tag it.** Add comma-separated tags (`lead-recovery, pilot, local-services`). Tags become clickable filter chips in the library, so future-you can pull every proof card about a given service or audience in one click.
6. **Run the redaction checklist.** Work through the five checks: names/identifiers, secrets/tokens, financial specifics, visual scrubbing, and third-party data. Use the notes field to record what was removed and where the raw original lives. The card cannot enter approval until all five boxes are checked.
7. **Advance the approval workflow.** The stepper shows the four stages: *Captured → Redaction review → Pending approval → Approved*. Click **Advance** to move forward — the gate message under the stepper tells you exactly what is blocking (missing title, open redaction items, unnamed approver). Recording approval requires an approver name or role, and stamps who approved and when. **Send back** reverses a step (and clears the approval record if you pull an approved card back).
8. **Generate a case-study angle.** In the angle panel, pick a lens — *Metric-led*, *Problem → solution*, *Before / after*, or *Trust & process* — and the generator drafts a headline, hook, and outline from the card's own fields. Click **Shuffle wording** to cycle alternative phrasings, then **Copy angle** to take the draft as Markdown. Angles always carry a reuse-boundary note reflecting the card's approval state.
9. **Search and filter the library.** Back in the library (press `Escape` or click **← Library**), use the search box (`/` to focus), the status filter, tag chips, and sorting (recently updated, readiness, impact, title) to find the right proof fast.
10. **Export the pack.** In **Export & handoff**: *Copy Markdown pack* (also `Ctrl/Cmd+S`) produces the full evidence pack including suggested angles for approved cards; *Download JSON* is a complete backup you can re-import; *Download CSV* opens in any spreadsheet; *Print report* renders a clean printable document. Everything exported is explicitly labeled a draft for human review.
11. **Delete safely.** Deleting a card (from the library grid or the detail view) shows a toast with a 7-second **Undo** — no data lost to a slipped click. **Reset** clears the whole vault after confirmation.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `?` | Open the help guide |
| `/` | Focus search (library view) |
| `N` | New proof card |
| `Esc` | Close modal / back to library |
| `Ctrl/Cmd + S` | Copy the Markdown evidence pack |

## Your data & privacy

All data lives in your browser's `localStorage` under the key `fable-remake:proof-vault:v1`. Nothing is uploaded, synced, or sent anywhere — there are no accounts, cookies, or network calls. Use **Download JSON** for backups and **Import JSON** to restore or move between browsers (imports from the original Day-13 format are migrated automatically). **Reset** permanently clears the vault in this browser.

## Tips & good practice

- **Capture in the moment.** A rough card written the day the win happened beats a polished one reconstructed a month later. Readiness can climb later; the raw material can't be recovered.
- **One card, one claim.** Cards that try to prove three things at once are unusable in proposals. Split them.
- **Metric first, story second.** Cards with a concrete headline metric ("$8.4k/mo recoverable") get reused; vague ones ("improved lead flow") don't.
- **Treat redaction as a feature, not friction.** The five-point checklist is what makes a card safe to show a stranger — and "every claim passed a redaction check and named approval" is itself a trust story (see the *Trust & process* angle).
- **Duplicate before repurposing.** Duplicating a card resets its workflow to Captured, so a re-edited variant has to earn approval again.

## Troubleshooting

- **My cards disappeared.** localStorage is per browser and per profile — check you're in the same browser/profile (and not a private window). Data also doesn't follow you between machines; use JSON export/import for that.
- **The Advance button won't move the card.** Read the gate message under the stepper: you're missing a title, an unchecked redaction item, or an approver name. Gates are deliberate — they're the approval boundary.
- **Import says the file is invalid.** The importer expects a JSON file with a `cards` array (this app's export, or the original Day-13 export). Re-export from Proof Vault rather than hand-editing the file.
- **Copy buttons do nothing.** Some browsers block the clipboard on `file://` pages. Serve the folder with `python3 -m http.server 8000` instead, or use the Download buttons.

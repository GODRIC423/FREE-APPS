# Daily Cash Board — Step-by-Step Guide

Daily Cash Board is a cash-first daily control room for solo operators and small teams. Instead of a vague to-do list, it tracks the five things that actually turn into money — offers out, follow-ups due, booked calls, invoices out, and collections — with a dollar value, a confidence %, and a due date on each one, so the day starts with "what moves cash" and ends with a clean summary of what happened.

## Getting started

Open `index.html` directly in any modern browser, or serve the folder locally:

```bash
python3 -m http.server 8000
```

then visit `http://localhost:8000/apps/day-15-daily-cash-board/`. No install, no build step, no account — everything runs and stays in your browser.

## Step-by-step walkthrough

1. **Read the first-run guide.** On your first visit the "How to use" dialog opens automatically. Skim it, press *Got it* (or `Esc`). You can reopen it any time with the header button or `?`.
2. **Load the demo.** Click *Load demo* in the header. You'll see a realistic day: ten cash moves spread across the five lanes, including two overdue items glowing red and one collection already closed today. This is the fastest way to understand what the board is for.
3. **Watch the stat strip.** The four tiles at the top recompute live: *Cash-in potential* (each move's value × confidence, summed over open moves), *Cash at risk* (face value of everything overdue), *Due today*, and *Closed today*. If the risk tile turns red, that's your first job of the day.
4. **Add your own move.** Click *+ Add cash move* (or press `N`). Give it a title (required — the field highlights if you skip it), a lane, a dollar value, a confidence %, a due date, an owner, and one concrete next action in the notes. Save, and the card appears in its lane, the stats update, and the state autosaves.
5. **Pick today's top 3.** Click the star (☆) on up to three cards. They appear in the *Today's top 3* panel with checkboxes — tick one to mark it done straight from the panel. Focus picks reset every morning so each day starts with a deliberate choice.
6. **Work the lanes.** On each card: *Advance →* pushes the move to the next lane (offer → follow-up → call → invoice → collect), *Done* closes it and adds its value to "Closed today", *Edit* reopens the editor, *Delete* removes it — with a 7-second *Undo* button in the toast if you slip. Cards sort themselves: overdue first, then due today, then by date.
7. **Filter when it gets busy.** The chips above the board (*All / Due today / Overdue / Done*) narrow every lane at once. "Overdue" is the morning triage view; "Done" is the evening victory lap.
8. **End the day with an export.** The *Export & handoff* panel always shows a live end-of-day summary: cash snapshot, focus results, overdue list, lane totals, and the top next actions. *Copy Markdown* (or `Ctrl/Cmd+S`) puts it on your clipboard; *Download JSON* saves a full snapshot you can re-import later; *Download CSV* opens in any spreadsheet; *Print* produces a clean one-page report. Everything exported is a draft for human review — the app never sends, bills, or contacts anyone.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `?` | Open the how-to-use guide |
| `N` | Add a new cash move |
| `Ctrl/Cmd + S` | Copy the end-of-day summary as Markdown |
| `Esc` | Close any dialog |

## Your data & privacy

All data lives in your browser's `localStorage` under the key `fable-remake:day-15-daily-cash-board:v1` — nothing ever leaves your machine. *Download JSON* creates a portable backup; *Import JSON* restores it (in this or another browser). *Reset* wipes the board after a confirmation. Clearing browser site data also deletes the board, so export first.

## Tips & good practice

- **Value × confidence beats gut feel.** A $5,000 offer at 20% is worth less attention than a $1,500 invoice at 90%. Let the weighted numbers pick your morning.
- **One concrete next action per card.** "Follow up" is not an action; "reply to Tuesday's quote email asking if they want to keep the slot" is.
- **Clear overdue before adding new.** The red cards are cash already leaking — chase or consciously re-date them before starting anything new.
- **Keep the top-3 honest.** If you pick more than three things, you picked nothing. The daily reset is deliberate.
- **Export at close of business.** The Markdown summary makes a great end-of-day log or handoff note for a partner or bookkeeper.

## Troubleshooting

- **My data disappeared.** localStorage is per browser and per profile — check you're in the same browser/profile, and that the page isn't in a private/incognito window. Re-import your last JSON backup if you have one.
- **Copy button says clipboard blocked.** Some browsers restrict clipboard access on `file://` pages. The app selects the summary text for you — just press `Ctrl/Cmd+C` — or serve the folder over `http://localhost` instead.
- **Import fails.** The file must be JSON exported by this app (or any JSON with an `items` array). Re-export from the source browser and try again; partial or hand-edited files are normalized, but non-JSON files are rejected.
- **Yesterday's focus vanished.** That's by design — focus picks reset each morning so the day starts with a fresh top 3. The moves themselves are untouched.

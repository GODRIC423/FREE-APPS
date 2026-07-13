# Script Rehearsal Room — Step-by-Step Guide

Script Rehearsal Room is a local-first practice studio for sales and discovery calls. You build a sectioned talk track out of short cue cards, drill the objections you fear with flip-style flashcards, rehearse out loud against a paced timer, and log honest self-scores so you can watch yourself improve. It's for founders, solo consultants, and anyone who has to make a call that matters — everything stays in your browser, and every export is a draft for human review (the app never calls, records, sends, or writes to a CRM).

## Getting started

- Open `index.html` directly in any modern browser, **or**
- Serve the folder locally and open the app path:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000/apps/day-12-script-rehearsal-room/
```

On your first visit the "How to use" guide opens automatically. Press `Esc` to close it, or reopen it anytime with the **How to use** button or the `?` key.

## Step-by-step walkthrough

1. **Load the demo (optional but recommended).** Click **Load demo** in the header. You'll see a complete rehearsal for a plumbing-shop discovery call: a filled scene, a five-section talk track, a six-card objection deck, and two logged sessions. This shows you what "done" looks like before you build your own.
2. **Set the scene.** In panel 1, pick the call type, name the prospect, write your single objective, and — most importantly — the boundary or promise you must not make. The scene appears at the top of every export, and filling it raises the Readiness score in the stat strip.
3. **Build the talk track.** Panel 2 holds script sections (Opening, Discovery questions, Value story, Objection handling, Close & next step by default — rename, delete, or add your own). Inside each section, click **+ Add talk-track card** and give each card a short cue (what the card is for) and the exact line you'll say. Watch the word count convert into estimated speaking time at 140 wpm — both per section and for the whole script.
4. **Stock the objection deck.** In panel 3, type an objection you dread and your best response, then click **Add to deck**. Each deck row stays editable, and the check / retry chips track how often you've nailed it versus needed work.
5. **Drill the flashcards.** Click the big card (or focus it and press `Enter`/`Space`) to flip it and reveal your response. Say your answer out loud *before* flipping, then grade yourself honestly with **Nailed it** or **Needs work** — grading unlocks only after you flip. Use **Shuffle** so you don't memorise the order, and **Skip** to pass without grading. Finishing the deck reshuffles it for another pass. Your grades feed the Objection mastery stat.
6. **Rehearse against the clock.** In panel 4, set a target length in minutes. The pace note tells you whether your script fits (comfortable / snug / over target) and what speaking pace it would need. Press **Start** and speak the script out loud — the pace hint tells you which section you should be wrapping and when, and the bar turns red if you run over.
7. **Finish & score.** Click **Finish & score** (or **Log session** in the history panel for an untimed entry). Rate your Opening, Discovery, Objections, and Close from 1–5, add a note about what stumbled, and save. Sessions stack newest-first with per-dimension chips, duration, and an average badge; the stat strip shows your latest average and trend arrow.
8. **Export & hand off.** In panel 5: **Copy run sheet** puts the full Markdown call plan on your clipboard (scene, talk track with timings, objection deck with mastery, pace checkpoints, session history table, and the guardrail note). **Print run sheet** produces a clean paper version. **Download JSON** backs up everything, **Sessions CSV** exports your score history, and **Import JSON** restores a backup. Every artifact is a draft for human review.

## Keyboard shortcuts

| Keys | Action |
| --- | --- |
| `?` | Open the How-to-use guide |
| `Esc` | Close any open dialog |
| `Ctrl/Cmd` + `S` | Copy the run sheet as Markdown |
| `Enter` / `Space` | Flip the focused flashcard |

## Your data & privacy

- Everything is stored in your browser's `localStorage` under the key `fable-remake:day-12-script-rehearsal-room:v1`. Nothing ever leaves your machine — no accounts, no cookies, no analytics, no network calls.
- **Download JSON** creates a full backup you can move between browsers or machines; **Import JSON** restores it (imports are validated, so a corrupt file can't break the app).
- **Reset all** (with confirmation) wipes the stored data. Deleting individual cards, sections, objections, or sessions shows an **Undo** toast for 7 seconds.

## Tips & good practice

- **Rehearse out loud, standing up.** Silent read-throughs feel fluent; speech reveals the clunky lines. The 140 wpm estimate only holds if you actually speak.
- **Write cue-sized cards, not paragraphs.** A card should be one beat of the call. If a line runs past two sentences, split it — you want glanceable prompts, not a teleprompter.
- **Grade "Needs work" generously.** The mastery percentage is only useful if it's honest. A card you fumbled once under pressure deserves another rep.
- **Target less talking than you think.** If the pace note says "comfortable", that's good — discovery calls are won by listening, and slack in the plan is where the prospect talks.
- **Log a session after every real call too.** Score how the live call actually went; the trend line across rehearsals and real calls tells you what to drill next.

## Troubleshooting

- **My data disappeared.** localStorage is per browser *and* per profile. Check you're in the same browser/profile, and that the page isn't open in a private/incognito window (those discard storage on close). Restore from a JSON backup if you have one.
- **The timer's pace hints say "Add talk-track cards".** Pace hints need script content — add at least one card with words in it, and check your target minutes are set.
- **Copy to clipboard doesn't work.** Some browsers restrict the clipboard on `file://` pages. Open the "Preview the Markdown run sheet" section and copy manually, or serve the folder with `python3 -m http.server`.
- **Import JSON is rejected.** The file must be a JSON export from this app (or match its shape). Re-export from the source browser rather than hand-editing the file.

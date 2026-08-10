# Objection Dojo — Step-by-Step Guide

Objection Dojo turns sales objections into trained reflexes. You build a library of the real objections your prospects raise — each with its root cause, your counter, and a proof point — then drill them like flashcards with spaced repetition (again/hard/easy scheduling), watch your confidence heat rise per category, and climb from white belt to black. It's built for founders, consultants, and AEs who freeze or ramble when a prospect pushes back, and who want reps, not theory.

## Getting started

Open `apps/12-objection-dojo/index.html` directly in any modern browser — it is fully self-contained (no internet needed, nothing installed). Or serve the repo root with any static server and navigate to the same path.

## Walkthrough

1. **First open.** The "How to use" guide appears automatically. Close it with **Esc** or the "Begin training" button; reopen anytime with **?** or the "How to use" button.
2. **Load the demo.** Click **Load demo** to see a black-belt library: the fictional "Clearlane RevOps Retainer" with 12 realistic objections across all seven categories, live heat bars, a streak, and a rank. Explore it, then **Reset** (click twice to confirm) when you're ready to build your own.
3. **Set your offer.** Expand **"My offer — context the Copilot prompts embed"** above the library. Fill in the offer name, description (what it is, price, promise), and ICP. Every Claude prompt embeds this context, so richer input means sharper output.
4. **Stock the library.** Click **New objection** (or press **N**). Enter the prospect's *exact words* (real quotes beat paraphrases), the category, the root cause underneath, your counter (acknowledge, reframe, proof, question back), and a proof point. Save. Edit with the pencil icon; delete with the trash icon — deletes give you a 7-second **Undo** toast.
5. **Enter the mat.** Press **D** or click **Drill due cards**. Each card shows the objection first — say your counter *out loud*, then press **Space** to reveal, then grade yourself: **1 = Again** (blank/fumbled — card resets to box 0, returns in 10 minutes), **2 = Hard** (shaky — returns tomorrow), **3 = Easy** (reflex — schedules out along 1 / 3 / 7 / 14 / 30 days as its box climbs). "Again" cards recycle to the end of the session queue. A session summary shows your again/hard/easy split.
6. **Read the heat.** The status strip shows your **streak** inside the enso, your overall **belt rank** (mastery = average box level across the library), and **confidence heat by category** with per-category belts and due counts. Click any heat row to filter the library to that category.
7. **Train with Claude Copilot.** In the right rail, three actions each build a complete, context-rich prompt from your live data: **Scout new objections** (10 new ones with root causes, counters, proof points to gather), **Grade my counter** (pick a card; Claude scores empathy/reframe/proof/advance and rewrites it), and **Spar with a hard prospect** (a full roleplay brief that presses your weakest categories for 5+ rounds, then scores you). Click **Copy prompt**, paste into claude.ai — works with the standard $20 Claude subscription, no API key. Paste Claude's verdicts into **Sensei notes**; they save automatically.
8. **Export your scroll.** **Copy Markdown** (or **Ctrl/Cmd+S**) copies the whole library as clean Markdown for docs and wikis. **JSON** downloads a full backup; **Import** restores it (or loads a teammate's dojo). **CSV** exports the library for spreadsheets. **Print** produces a clean, ink-friendly objection playbook.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `?` | Open the how-to guide |
| `Esc` | Close dialogs / leave drill mode |
| `N` | New objection |
| `D` | Drill due cards |
| `Space` / `Enter` | Reveal counter (in drill) |
| `1` / `2` / `3` | Grade again / hard / easy (in drill) |
| `Ctrl/Cmd + S` | Copy library as Markdown |

## Your data & privacy

Everything lives in your browser's localStorage under the key `bizdev:12-objection-dojo:v1`. Nothing is sent anywhere — the app makes zero network requests. Use **JSON export** for backups or to move between machines/browsers, and **Import** to restore. Clearing browser data clears your dojo, so export before you purge.

## Pro tips

- **Write counters for the ear, not the eye.** If you can't say it in one breath, shorten it. The drill forces you to speak; use that.
- **One category per week.** Click a weak heat bar, filter the library, rewrite every counter in that category, then drill it daily until the belt changes color.
- **Grade honestly.** "Easy" means it came out instantly and clean. If you hesitated, it's "Hard". The schedule only works if the grades are true.
- **Harvest calls, not brainstorms.** After every real call, add the objections you actually heard — verbatim. Your library should sound like your market, not like a sales book.
- **Close the loop with Claude.** After a sparring session, paste the scorecard into Sensei notes and update the counters it flagged before your next drill.

## Troubleshooting

- **The guide won't open with `?`** — click into empty page space first; the shortcut is ignored while you're typing in a field. The "How to use" button always works.
- **"Nothing to drill" toast** — no cards are due yet. Use "Drill entire library" for a full workout, or wait for the schedule to bring cards back.
- **My streak shows 0 but I trained recently** — the streak counts consecutive calendar days with at least one graded rep; missing a full day resets it (your best streak is preserved).
- **Import fails** — the file must be a JSON export from this app (or match its shape). Open it in a text editor and confirm it starts with `{` and contains an `objections` array.
- **Nothing saves** — some browsers block localStorage for `file://` pages in private/incognito windows. Use a normal window, or serve the folder with a static server.

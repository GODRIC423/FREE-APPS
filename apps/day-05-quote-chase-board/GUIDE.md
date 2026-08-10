# Quote Chase Board — Step-by-Step Guide

Quote Chase Board is a local-first pipeline board for anyone who sends quotes and then has to chase them: trades and home-service businesses, freelancers, small agencies. It tracks every outstanding quote by stage, shows exactly how long each one has been sitting untouched, totals what your open pipeline is worth, and drafts the follow-up note for you — while never sending anything itself. Every message is a draft a human reviews first.

## Getting started

- Easiest: open `index.html` directly in any modern browser.
- Or serve the folder locally:

```bash
python3 -m http.server 8000
```

then open `http://localhost:8000/apps/day-05-quote-chase-board/` in your browser.

No install, no build step, no account. Everything runs and stays in your browser.

## Step-by-step walkthrough

1. **Take the tour.** On first open the "How to use" guide appears automatically (reopen it any time with the header button or the `?` key). Close it with `Esc` when you're ready.
2. **Load the demo.** Click **Load demo** to fill the board with a realistic seven-quote pipeline. You'll see the five lanes populate and the stat strip update. This is the fastest way to understand the board before entering your own data — **Reset** clears it later.
3. **Add a real quote.** Click **+ New quote** (or press `N`). The editor opens with the customer field focused. Fill in customer/job (required — it highlights if left blank), contact name, owner, quote value, and your honest win probability. Value and probability feed the pipeline math, so keep them realistic.
4. **Set the stage.** Every quote lives in one lane: **Draft** (written but not sent), **Sent**, **Negotiating**, **Won**, or **Lost**. Use the stage dropdown, or the quick buttons — **Mark sent** stamps today as the last touch and schedules a follow-up in 3 days if none is set; **Mark won/lost** closes the quote and locks probability to 100%/0%.
5. **Watch staleness and due dates.** Each open card shows a day-count chip: green under 4 days since the last touch, amber from 4 days ("aging"), red from 8 days ("stale"). A second chip tracks the follow-up date — "due in 2d", "due today", or "3d overdue". Click **Log touch today** whenever you actually contact the customer so the counts stay honest.
6. **Draft the follow-up note.** Select a quote and look at the Follow-up drafter panel. Pick a tone — *Friendly check-in*, *Direct ask*, or *Final nudge* — and it writes a complete note (subject line included) from the quote's stage, value, and age. Draft-stage quotes get a "here's your quote" send note instead. Edit the text freely, then **Copy note** to paste it into your own email/SMS app, or **Save into quote notes** to keep it with the quote. Nothing is ever sent from this app.
7. **Read the stat strip.** Four live numbers at the top: open pipeline value, weighted value (value × probability), follow-ups due now (with overdue count), and stale quotes with the dollar value at risk. They recompute on every edit.
8. **Export your chase plan.** The Export & handoff panel always shows the current chase plan in Markdown — stats, the chase queue ordered by urgency, draft notes for the top three, and a full board snapshot. **Copy Markdown** (or `Ctrl/Cmd+S`) for your notes app, **Download CSV** for a spreadsheet, **Download JSON** for a full backup, **Import JSON** to restore it, or **Print plan** for a clean one-page handout.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `?` | Open/close the How to use guide |
| `Esc` | Close dialogs |
| `N` | New quote |
| `Ctrl/Cmd+S` | Copy the chase plan Markdown |

## Your data & privacy

- All data lives in your browser's `localStorage` under the key `fable-remake:quote-chase-board:v1`. Nothing leaves your machine — no network requests, accounts, cookies, or analytics.
- **Download JSON** makes a full backup; **Import JSON** restores it (imports are validated, so a corrupt file can't break the board).
- **Reset** permanently clears the board in this browser (it asks for confirmation first). Deleting a single quote offers a 7-second **Undo**.

## Tips & good practice

- **Chase overdue before big.** The chase queue puts overdue follow-ups first, then sorts by weighted value — trust it. A small overdue quote decays faster than a big fresh one.
- **Log touches religiously.** The staleness colors are only as honest as your "Log touch today" habit. A board full of false green is worse than no board.
- **Keep probabilities honest.** Weighted value is your realistic pipeline. If everything is at 80%, the number means nothing.
- **Escalate tone gradually.** Friendly at the first follow-up, direct at the second, final nudge to force a decision — then actually close the file. Lost with a clean exit beats permanently stale.
- **Review every draft before sending.** The generator can't know about pricing changes, schedule conflicts, or customer mood. That judgment is yours.

## Troubleshooting

- **My quotes disappeared.** localStorage is per browser and per profile — check you're in the same browser/profile, and that the page isn't open in a private/incognito window. Restore from a JSON backup if you have one.
- **Import fails with "no quotes array".** The file must be a JSON export from this app (an object with a `quotes` array). Re-export from the source browser rather than hand-editing.
- **The stat strip shows $0 but I have quotes.** Open pipeline only counts Draft, Sent, and Negotiating quotes — Won and Lost are excluded on purpose. Check the stage of each quote.
- **Copy buttons do nothing.** Some browsers block the clipboard on `file://` pages. Use the fallback (the app selects the text for you), serve the folder with `python3 -m http.server`, or copy from the export preview manually.

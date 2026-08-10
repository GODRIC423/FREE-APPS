# Win/Loss Ledger — Step-by-Step Guide

Win/Loss Ledger is a self-contained web app for running structured post-mortems on every deal you close, won or lost. It's built for founders, BD reps, and revenue leaders who *feel* like they know why deals slip through their fingers — but have never actually written the pattern down where the whole team can see it. Log the outcome, the competitor, the price factor, and the drivers; the app turns that into a live pattern dashboard, a lessons board, and quarterly readouts you can hand to leadership.

## Getting started

Open `apps/20-win-loss-ledger/index.html` directly in any modern browser — it's a single, fully self-contained file with no build step, no server, and no account. You can also serve the whole `bizdev-30` repo root with any static file server and navigate to this app's folder. Everything runs locally; nothing you type ever leaves your browser.

## Walkthrough: first open to exported artifact

1. **Load the demo.** Click **Load demo** in the header to see a fully-worked ledger — eleven closed deals across four segments, six sources, and a handful of repeat competitors — so you can see the pattern dashboard and lessons board doing real work before you touch your own data.
2. **Post-mortem a closed deal.** Click **New entry** (or press `n`). Mark it **WON** or **LOST**, fill in the account, deal name, close date, and value, then set the segment, source, and competitor (leave competitor blank if none was in the room).
3. **Tag the price factor and drivers.** Price factor is a single honest read on whether price helped or hurt you. Drivers are a multi-select of the forces that actually decided the deal — pick every one that applies; these tags are what power the pattern dashboard.
4. **Write what happened and the lesson.** The narrative is the honest account for your own memory. The lesson is one sharp sentence: what does this deal prove that should change how you sell next time? Leave it blank if you haven't decided yet — the card will nudge you to come back to it.
5. **Save the entry** and watch the hero stat band, the pattern dashboard, and the quarter summary update live.
6. **Read the pattern dashboard.** Three SVG bar charts show win rate by source, by segment, and by competitor, computed from every entry in the ledger. Green bars read strong (≥60%), gold reads a coin-flip, red reads weak (≤40%) — each bar also shows the sample size, so a 100% win rate on one deal reads very differently from 100% on twelve.
7. **Pin lessons that are actually proven.** Open any entry with a lesson written and click **Pin to lessons board**. That board on the right rail becomes your accumulating playbook — delete a pin any time with Undo available for 7 seconds.
8. **Check the Quarter summary.** Pick a quarter from the dropdown to see its win-rate dial, value won/lost, average deal size, and the top win driver, top loss driver, and most-faced competitor for that quarter alone.
9. **Use the Claude Copilot** (see below) to turn your ledger into an interview script, a pattern analysis, or a quarterly readout — using your own $20 Claude subscription, no API key required.
10. **Export.** Copy the whole ledger as Markdown, download the full state as JSON for backup, or download a CSV of the deal log for a spreadsheet.

## Using the Claude Copilot prompts

The Copilot panel on the right rail has three actions. Each one builds a complete, ready-to-paste prompt that embeds your live ledger data as readable markdown — you're not typing anything into an API, and no key is required. The workflow:

1. Click **Copy prompt** on the action you want (or **Preview** first to read it).
2. Open [claude.ai](https://claude.ai) in a browser tab, start a new chat with any standard Claude subscription, and paste.
3. Read Claude's answer, then copy the useful parts back into the **Claude's findings** notes box in the Copilot panel — it saves with your ledger.

The three actions:
- **Run a win/loss interview script** — pick a specific closed deal; Claude writes a phased interview script (12–16 questions) tailored to what you already know, so it digs into *why*, not *what*.
- **Find patterns across my entries** — sends your full ledger plus the computed win rates by source/segment/competitor; Claude identifies the strongest patterns, flags thin-sample noise, and gives you three concrete actions.
- **Write the quarterly readout** — compiles the selected quarter's deals and stats into a leadership-ready document: executive summary, headline metrics, what worked, what cost you deals, two notable deals, and recommended bets.

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `n` | New ledger entry |
| `?` | Open this guide |
| `Ctrl`/`Cmd` + `S` | Copy the whole ledger as Markdown |
| `Esc` | Close any open panel, drawer, or modal |

## Your data & privacy

Everything you enter is stored only in your browser's `localStorage`, under the key `bizdev:20-win-loss-ledger:v1`. Nothing is uploaded, synced, or sent anywhere — there is zero runtime network activity in this app. Use **Export → Download JSON** regularly to back up your ledger (especially before **Reset**, which offers a one-click backup first). To move your ledger to another browser or computer, download the JSON on one machine and use **Export → Import JSON…** on the other.

## Pro tips

1. **Log deals the week they close, not the week you remember them.** The narrative field decays fast — write it while the deal is still fresh, even if the lesson takes another week to crystallize.
2. **Leave competitor blank on purpose when there wasn't one.** The "No competitor named" bucket in the pattern dashboard is often the single highest win-rate row in the whole ledger — it's your best evidence for shortening the sales cycle.
3. **Don't force a lesson you don't believe yet.** An empty lesson field is honest; a padded one pollutes the lessons board. Come back to it after the "Find patterns" Copilot prompt gives you language to work with.
4. **Rematches against the same competitor are gold.** When you win a deal against a competitor who beat you before, write exactly what changed in the lesson — that's the most actionable pattern the ledger can produce.
5. **Run the quarterly readout before the review meeting, not during it.** Paste Claude's draft into your notes app a day early and edit it down; it reads far better cold than live.

## Troubleshooting

- **My data disappeared after closing the browser.** Check that you're not in a private/incognito window — those clear `localStorage` on close. Also confirm you didn't clear site data or cookies for this file's origin. Regular JSON exports are the safest backup regardless.
- **The "How to use" guide keeps reopening every time I load the app.** It auto-opens once per browser profile until you close it (via the button, `Esc`, or clicking outside it) — that click sets a `seenGuide` flag saved with your ledger. If you use **Reset**, the flag clears too and the guide will reopen once.
- **Import says "not a ledger file."** The importer expects a JSON file previously exported from this app (via **Export → Download JSON** or the reset screen's **Backup first**). A CSV, a JSON from a different bizdev-30 app, or a hand-edited file missing the `deals`/`lessons` arrays will be rejected rather than silently corrupting your ledger.
- **A Copilot action button is disabled (greyed out).** The interview and patterns actions need at least one logged deal; the quarterly readout needs at least one deal closed in the currently selected quarter. Log an entry or pick a different quarter from the Quarter summary dropdown.

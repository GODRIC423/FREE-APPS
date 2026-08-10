# BD Command Deck — Step-by-Step Guide

BD Command Deck is a ship's-bridge-styled weekly scorecard for solo founders, freelancers, and small BD/sales teams who run their own pipeline. Each week you log five numbers — outreach, conversations, proposals, wins, revenue — against targets, and the deck turns them into brass-and-glass gauges, a conversion waterfall that names your weakest stage, a trend rail, an on-target streak, and a quarter report you can hand to yourself (or an accountability partner) every Friday. Everything runs in one HTML file in your browser — no account, no server, no data leaving your machine.

## Getting started

Open `apps/30-bd-command-deck/index.html` directly in any modern browser — it is fully self-contained (fonts, icons, and code are all embedded). Alternatively, serve the repo root with any static server and browse to the same path. On first open, the "How to run the deck" guide appears automatically.

## Walkthrough

1. **Load the demo run.** Click *Load demo* in the header. You get a realistic 15-week run from April through July 2026: a slow start, a mid-quarter slump where reply rates collapsed, a subject-line fix, and a 7-week on-target streak carrying into the next quarter. Study how the waterfall, streak, and quarter report all react to the same underlying weeks, then *Reset* when ready to log your own.
2. **Log your first week.** Click *Log week* in the Ship's Log panel (or press `N`). It defaults to the Monday after your most recent entry, or this week if you're starting fresh.
3. **Fill the instrument cluster.** Each of the five metrics gets its own brass-rimmed gauge — the needle shows your actual number, and the bright brass tick marks your weekly target. Type directly into the number field under any gauge; the gauge, the waterfall, and every rollup update live.
4. **Read the trend rail.** Five glass-tube sparklines track each metric across your last 8 logged weeks, with a dashed line at target and the newest point lit green, amber, or red depending on whether that week hit target.
5. **Read the conversion waterfall.** Outreach → Conversations → Proposals → Wins, each stage as a brass-connected bar, with the conversion rate labeled between stages. The lowest of the three rates is called out in red as your weakest stage — that's the one worth fixing first, not the one that feels most urgent.
6. **Run the weekly review ritual.** Below the waterfall: three prompts — *What worked*, *What stalled*, and a *Next bets* checklist. Add bets with the input field or `Enter`, check them off, reorder with the up/down arrows, or delete (with a 7-second undo). A "ritual logged" badge appears once all three are filled in.
7. **Switch to the Quarter Report.** Click *Quarter Report* in the view toggle (or press `Q`). See quarter totals against a pace-adjusted target (your weekly target × weeks actually logged, so a partial quarter isn't penalized), a quarter waterfall, quarter-over-quarter weekly-pace deltas, every week in a printable table, and a Captain's Log that rolls up your worked/stalled notes plus every open bet still outstanding in that quarter.
8. **Use the Claude Copilot prompts.** Click *Claude Copilot* in the header. Four actions, each generating a complete prompt embedding your live numbers:
   - **Analyze my weakest stage** — a revenue-ops read on your real bottleneck, root causes, and ranked fixes.
   - **Plan next week from my numbers** — turns your last 4 weeks, streak, and last week's open bets into specific numeric targets and 3 priority actions.
   - **Write my accountability update** — a short, human status note for a manager, partner, or mastermind group.
   - **Synthesize my review ritual** — finds recurring blockers and bets you keep deferring across your last 6 weekly reviews.
   Click *Copy prompt*, then paste it into [claude.ai](https://claude.ai) — it works with the standard $20 Claude subscription, no API key needed. Paste Claude's reply back into the **Paste Claude's answer back** box — it autosaves with the rest of your log.
9. **Ship the log.** Use *Export*: copy the full Ship's Log as Markdown (`Ctrl/Cmd+S` does the same), download the full state as JSON, download a weeks CSV, import a previous JSON export, or print a clean quarter report.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `?` | Open the guide |
| `N` | Log a new week |
| `Q` | Toggle Bridge Log / Quarter Report |
| `↑` / `↓` | Move selection up/down the ship's log |
| `Ctrl / Cmd + S` | Copy the full ship's log as Markdown |
| `Esc` | Close the open dialog, or clear the selected week |

## Your data & privacy

All data lives in your browser's localStorage under the key `bizdev:30-bd-command-deck:v1`. Nothing is ever sent anywhere — the app makes zero network requests. **Export JSON regularly** (Export → Download JSON) as your backup; import it on any other machine to restore your log. Clearing browser site data wipes the deck.

## Pro tips

- Set your targets (header → *Calibrate*) to numbers you can actually hit on a normal week, not your best-ever week — the streak and the gauges are only useful if "on target" means something real.
- Log the week even when it's bad. A red week with an honest "what stalled" note is worth more than a skipped week — the streak resets either way, but only one of them teaches you anything.
- Check the weakest-stage callout before you add more outreach volume. If the bottleneck is reply rate, more volume through a broken message just produces more silence, faster.
- Treat "Next bets" as a promise to next week's you, not a wish list — the Quarter Report's open-bets rollup will show you exactly which promises you keep breaking.
- Run *Synthesize my review ritual* every few weeks, even when things are going well — recurring wins are worth turning into permanent habits before you forget why they worked.

## Troubleshooting

- **The guide keeps opening on launch** — it opens until it's been closed once per browser profile; close it with `Esc` or the × and it stays closed (stored in `seenGuide`).
- **Copy buttons do nothing** — some browsers block the clipboard on `file://` pages. The app falls back to a hidden-textarea copy; if that also fails, use Export → Download JSON or select the prompt text manually.
- **My log vanished** — you're likely in a different browser, profile, or private window; localStorage is per-profile. Restore from your last JSON export via Export → Import JSON.
- **Import fails** — the file must be a JSON export from BD Command Deck (or match its shape). The importer runs everything through a normalizer, so partial files load with sensible defaults, but non-JSON files are rejected.
- **The quarter report says "no weeks logged"** — you haven't logged any week that falls in the quarter you're viewing. Use the `‹` / `›` arrows in the Quarter Report to step to a quarter that has entries, or log a new week for the current one.

# Traction Bullseye — Step-by-Step Guide

Traction Bullseye is a nineteen-channel testing range built on the Bullseye Framework: every acquisition channel starts in the Untested outer ring, gets promoted to the Testing ring for a cheap experiment, and — if the evidence holds up — gets promoted again to the Focus ring at the bullseye, where you go all-in. A hard guardrail caps you at three active channels (Testing + Focus) at once, so you can't spread yourself thin across nineteen half-tried ideas. It's built for early-stage founders, indie hackers, and consultants trying to find their first repeatable channel to 100 customers, plus a built-in Claude Copilot that turns your live board into ready-to-paste prompts.

## Getting started

Open `apps/29-traction-bullseye/index.html` directly in any modern browser — the file is fully self-contained (fonts, icons, and styles are embedded; nothing loads from the network). You can also serve the repo root with any static server and browse to the same path.

## Walkthrough

1. **First open.** The "How to run the range" guide appears automatically on first visit. Close it with *Got it* or `Esc`; reopen anytime with `?` or the *How to use* button.
2. **Set your aim.** Fill in the bar under the header: your company, offer (with price point), audience/ICP, and target customer count (defaults to 100 — the app's namesake). These feed the center dial on the board and every Copilot prompt.
3. **Load the demo** to see a board "done well": a remote-team tool with 3 active channels (one in Focus, two in Testing), a channel demoted back to Untested after a no-go result, real cost/customer numbers, and a stocked learnings feed. *Reset* (with confirmation) when you want a clean range.
4. **Pick a channel.** Click a marker on the bullseye board, or a row in the channel list on the right. Every one of the nineteen classic traction channels starts on the Untested outer ring. Use the search box or the ring filter to narrow the list.
5. **Promote it to Testing.** In the channel panel, click *Promote to Testing*. The focus guardrail allows only 3 active channels (Testing + Focus, combined) at once — if you're already at capacity, the button explains which discipline to apply: demote one before adding a fourth.
6. **Log a cheap test.** Click *New experiment* and fill in the hypothesis (a falsifiable claim), the cheap test itself (the smallest thing that gets a real signal), and its cost in dollars and hours.
7. **Record the result.** Once you have a signal, set the result — Promising, No-go, or Inconclusive — log any customers won, and write one sentence of what you learned. That sentence automatically appears in the Learnings feed below the board. Promising channels can be promoted to Focus; no-go channels get demoted back to Untested.
8. **Use the Range Officer (Claude Copilot).** Pick one of four actions — *Design a cheap test*, *Interpret my results*, *Pick my next ring moves*, *Turn learnings into a playbook*. The panel generates a complete prompt from your live board (or the selected channel). Click *Copy prompt*, paste it into claude.ai — this works with the standard $20 Claude subscription, no API key. Paste the useful parts of the answer into *Log Claude's answer*; it saves with your board.
9. **Export.** The *Export* button offers: Copy Markdown report (the whole board as a readable document), Download JSON (complete state, re-importable), Download CSV (a flat experiment table for spreadsheets), Import JSON, and Print (a clean stylesheet renders just the report).

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `?` | Open the guide |
| `Esc` | Close dialogs and the channel panel |
| `/` | Focus the channel search |
| `Ctrl/Cmd + S` | Copy the Markdown board report |
| `→` / `←` | Promote / demote the open channel a ring |

## Your data & privacy

Everything lives in your browser's localStorage under the key `bizdev:29-traction-bullseye:v1`. Nothing is transmitted anywhere — there is no server, no account, no analytics. Use *Download JSON* for backups or to move machines, and *Import JSON* to restore. Clearing browser data clears the board — back up first.

## Pro tips

- Respect the guardrail even when it's tempting not to. Three active channels tested properly beats eight tested halfheartedly — that's the entire discipline of the Bullseye Framework.
- Write the hypothesis as a falsifiable claim ("if we do X, Y will happen, because Z") before you run the test, not after — it keeps you honest about what actually counts as a win.
- A test that comes back Inconclusive is not a channel to abandon — it usually means you tested the wrong variable. Log what you'd test next in the learning field, then use *Interpret my results* to get a second opinion.
- Keep the cost fields honest, even at $0. The Testing Spend stat in the header is your real cost-to-learn — cheap is the entire point of the framework.
- Run *Pick my next ring moves* every time you complete a test. It's the fastest way to avoid the trap of holding a channel out of sunk-cost attachment.

## Troubleshooting

- **The guide doesn't open with `?`** — click anywhere on the page background first; the shortcut is ignored while you're typing in a field.
- **I can't promote a channel** — you're at the 3-active guardrail. Open an active channel (Testing or Focus) and demote it first, then promote the one you want.
- **Copy buttons do nothing** — some browsers restrict the clipboard on `file://` pages; the app falls back to a hidden-textarea copy, but if that also fails, use Export → Download instead, or serve the folder over `http://localhost`.
- **My data vanished** — you may be in a different browser/profile or a private window; localStorage is per-profile. Restore from your last JSON backup via Export → Import JSON.
- **Import says it can't read the file** — it expects JSON exported by this app. Open the file and check it starts with `{ "v": 1`.

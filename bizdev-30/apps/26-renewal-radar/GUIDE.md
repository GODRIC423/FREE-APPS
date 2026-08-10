# Renewal Radar — Step-by-Step Guide

Renewal Radar is a phosphor-green, air-traffic-control-styled renewal management board for account managers, customer success leads, and founders who own their own renewals and keep getting surprised by a "we're not renewing" email. You track every client's usage/results/relationship health, work a T-90/T-60/T-30 renewal playbook per account, run save plays on anything at risk, and flag expansion opportunities as you spot them — all on a radar scope where distance from center is literally time to renewal. Everything runs in one HTML file in your browser — no account, no server, no data leaving your machine.

## Getting started

Open `apps/26-renewal-radar/index.html` directly in any modern browser — it is fully self-contained (fonts, icons, and code are all embedded). Alternatively, serve the repo root with any static server and browse to the same path. On first open, the "How to run the radar" guide appears automatically.

## Walkthrough

1. **Read the guide, then close it.** It only auto-opens once; reopen anytime with `?` or the *How to use* button.
2. **Load the demo portfolio.** Click *Load demo* in the header. You get eight realistic accounts spanning every zone and status: a cruising enterprise account with an expansion flag, a T-90 account drifting into "watch", a T-30 account about to close clean, an overdue enterprise account mid-save, a startup that lost its champion, a "saved" success story from last quarter, and a churned account with a postmortem. Study it, then *Reset* when ready to build your own book.
3. **Add your own clients.** Click *New client* (or press `N`). Set the name, segment, owner, ARR, and renewal date on the detail screen. A full T-90/T-60/T-30 play template and a save-play template are seeded automatically — edit or delete anything that doesn't fit.
4. **Set health signals honestly.** Three sliders per client — *Usage*, *Results*, *Relationship* — each 0–100 with a hint underneath describing what to look for. Their average is the composite health score, which (combined with contact recency) drives the automatic status: Healthy, Watch, or At risk. Override the status manually any time — for example, force "At risk" the moment a champion leaves, even if the numbers haven't caught up yet.
5. **Log touchpoints — silence is a signal.** Every time you talk to a client, log it in the *Touchpoints* panel. No contact in 45+ days automatically trips the at-risk flag, independent of how healthy the account looks on paper — this is the whole point of the app.
6. **Work the renewal plays.** Each client carries three checklists — T-90, T-60, T-30 — with due dates computed from the renewal date. The window that matches today is highlighted `ACTIVE`. Check items off, add your own, reorder with the arrows.
7. **Watch the At-risk queue and the Expansion tab.** The radar scope and the roster both surface risk, but the *At-risk queue* tab sorts by urgency and shows save-play progress at a glance; the *Expansion* tab lists every flagged upsell opportunity with its estimated value. Work each save plan to completion in the client's *Save play* panel, with a free-text plan narrative next to the checklist.
8. **Run Copilot missions.** Press `C` (or *Copilot*). Pick a client and one of four actions:
   - **Draft T-90 kickoff email** — opens the renewal conversation early, with a QBR ask.
   - **Draft the T-60 value-recap email** — proves value before the renewal gets hard.
   - **Plan a save for this client** — root-causes the risk and builds a dated recovery plan.
   - **Write the renewal proposal outline** — structures the ask, including any flagged expansion.
   Hit *Copy prompt*, then paste it into [claude.ai](https://claude.ai) — it works with the standard $20 Claude subscription, no API key. Paste the reply back into the *Paste Claude's answer back* box to keep it with the portfolio.
9. **Ship the portfolio.** Use *Export*: copy the whole portfolio as Markdown (`Ctrl/Cmd+S` does the same), download JSON as a backup, download the roster as CSV for your CRM, or import a previously exported JSON. *Print* from your browser produces a clean paper renewal pack.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `?` | Open the guide |
| `N` | New client |
| `C` | Claude Copilot on/off |
| `Ctrl / Cmd + S` | Copy the portfolio as Markdown |
| `Esc` | Close a dialog, or go back to the scope view |
| `Enter` | Add the entry you are typing in any checklist or the touchpoint field |

## Your data & privacy

All data lives in your browser's localStorage under the key `bizdev:26-renewal-radar:v1`. Nothing is ever sent anywhere — the app makes zero network requests. **Export JSON regularly** (Export > Download JSON) as your backup; import it on any other machine to restore the portfolio. Clearing browser site data wipes the radar.

## Pro tips

- Log a touchpoint the same day it happens, even a one-line "left voicemail." The silence clock only resets when something is actually logged — good hygiene here is the entire early-warning system.
- Score health signals like you'd defend them in a forecast call, not like you're being nice. A relationship score of 80 for a champion who hasn't replied in three weeks defeats the purpose.
- Use the status override sparingly, but use it. Health scores lag reality — a champion resigning is instant risk the sliders won't reflect for weeks.
- Run the T-90 kickoff Copilot prompt the day an account crosses into the T-90 ring on the radar, not the day someone remembers to. Early and boring beats late and heroic.
- Revisit "Saved" accounts a quarter later. The Ferro & Vance demo entry shows the pattern: mark the save, then check back before quietly reverting the status to auto.

## Troubleshooting

- **The help window keeps opening on launch** — it opens until it has been closed once per browser profile; close it with `Esc` or the X and it stays closed (stored in `seenGuide`).
- **Copy buttons do nothing** — some browsers block the clipboard on `file://` pages. The app falls back to a hidden-textarea copy; if that also fails, use Export > Download JSON or select the prompt text manually.
- **A client shows "At risk" but the health numbers look fine** — check the silence badge. No touchpoint logged in 45+ days forces the account to read as at-risk regardless of the health sliders; log a touchpoint or check the status override.
- **My data vanished** — you are likely in a different browser, profile, or private window; localStorage is per-profile. Restore from your last JSON export via Export > Import JSON.
- **Import fails** — the file must be a JSON export from Renewal Radar (or match its shape). The importer runs everything through a normalizer, so partial files load with sensible defaults, but non-JSON files are rejected.

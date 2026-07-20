# Battlecard Bay — Step-by-Step Guide

Battlecard Bay is a naval-war-room-styled competitive battlecard system for founders, sales reps, and small BD teams who keep losing deals to the same three competitors. You build one armed battlecard per competitor (strengths, weaknesses, "mines to lay", and objection-counter-proof rows), track your real win rate against each of them, and pull up counters in big type mid-call. Everything runs in one HTML file in your browser — no account, no server, no data leaving your machine.

## Getting started

Open `apps/06-battlecard-bay/index.html` directly in any modern browser — it is fully self-contained (fonts, icons, and code are all embedded). Alternatively, serve the repo root with any static server and browse to the same path. On first open, the "How to run the Bay" guide appears automatically.

## Walkthrough

1. **Read the guide, then close it.** It only auto-opens once; reopen anytime with `?` or the *How to use* button.
2. **Load the demo fleet.** Click *Load demo* in the header. You get a finished bay: four competitors (an enterprise incumbent, a cheap point tool, a legacy regional player, and the status quo) with counters, landmines, and a logged win/loss history. Study it, then wipe it via *Reset* when ready to build your own.
3. **Fly your flag.** On the fleet screen, fill in *Our pitch — the flag we fly*: one paragraph on what you sell, to whom, and why you win. Every counter you write and every Copilot prompt gets sharper once this exists.
4. **Put contacts on scope.** Click *New contact* for each competitor you actually meet in deals. Set the threat tier — *Primary threat* contacts sit on the inner radar ring, *On watch* on the outer. Click any blip on the radar (or any roster card) to open its battlecard.
5. **Arm the battlecard.** On the card: name and tagline, their positioning (how they sell against you), then four magazines:
   - **Strengths — respect these**: what they are genuinely good at (never strawman).
   - **Weaknesses — attack surface**: where they consistently fall short.
   - **Mines to lay**: diligence-sounding questions to plant early that detonate in the competitor's own demo.
   - **Counter-battery**: numbered rows of *objection heard → counter to say verbatim → proof point*. Reorder rows with the arrows so the most common objections sit on top.
6. **Log every engagement.** In the *Engagement log*, add each deal where this competitor appeared: name, outcome (won / lost / open), and a one-line reason. The win-rate dials — per card and fleet-wide — are computed live from this log. Log the losses too; that is the whole point.
7. **Action stations on live calls.** Press `Q` (or the red *Action stations* button). Type what the prospect just said; matching counters, mines, and weaknesses appear in big type with proof points. Filter to one competitor when you know who you are up against. Press `Esc` to stand down.
8. **Run Copilot sorties.** Press `C` (or *Copilot*). Pick a target competitor, choose an action, and hit *Copy prompt*:
   - **Recon their positioning** — rebuilds the competitor's public story and lists gaps in your card plus a verification checklist.
   - **Generate counter-battery** — 5 new objection-counter-proof rows plus fresh landmines.
   - **Wargame: roleplay them** — Claude plays their best rep in a bake-off; say "debrief" to get scored.
   - **Quarterly fleet brief** — audits every card, finds your biggest revenue leak, plans the quarter.
   Paste the prompt into [claude.ai](https://claude.ai) — it works with the standard $20 Claude subscription, no API key. Paste useful output into the card's *Intel locker* or the Copilot *Debrief locker* (both auto-save), then promote the best lines into real counters.
9. **Ship the dossier.** Use *Export*: copy the whole fleet as Markdown (`Ctrl/Cmd+S` does the same), download JSON as a backup, download the engagement log as CSV for your CRM, or import a previously exported JSON. *Print* from your browser produces a clean paper battlecard pack.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `?` | Open the guide |
| `Q` | Action stations (quick-draw) on/off |
| `C` | Claude Copilot on/off |
| `Ctrl / Cmd + S` | Copy fleet dossier as Markdown |
| `Esc` | Close any panel, menu, or dialog |
| `Enter` | Add the entry you are typing in any list |

## Your data & privacy

All data lives in your browser's localStorage under the key `bizdev:06-battlecard-bay:v1`. Nothing is ever sent anywhere — the app makes zero network requests. **Export JSON regularly** (Export > Download JSON) as your backup; import it on any other machine to restore the fleet. Clearing browser site data wipes the bay.

## Pro tips

- Write counters in the first person, ready to say out loud. If you would not say the sentence on a call, it does not belong in the counter field.
- Give every counter a proof point; if the proof does not exist yet, write `TO BUILD:` in front of it — that list becomes your enablement backlog.
- Track "do nothing" as a competitor. In most pipelines the status quo beats every vendor; it deserves the best battlecard.
- Before a known bake-off, run the *Wargame* prompt twice: once cold, once after refreshing the card. The delta is your prep.
- After each loss, add one line to the engagement note starting with "Fix:" — the quarterly fleet brief prompt will pick these up.

## Troubleshooting

- **The help window keeps opening on launch** — it opens until it has been closed once per browser profile; close it with `Esc` or the X and it stays closed (stored in `seenGuide`).
- **Copy buttons do nothing** — some browsers block the clipboard on `file://` pages. The app falls back to a hidden-textarea copy; if that also fails, use Export > Download JSON / select the prompt text manually.
- **My data vanished** — you are likely in a different browser, profile, or private window; localStorage is per-profile. Restore from your last JSON export via Export > Import JSON.
- **Import fails** — the file must be a JSON export from Battlecard Bay (or match its shape). The importer runs everything through a normalizer, so partial files load with defaults, but non-JSON files are rejected.
- **`Q`/`C` shortcuts don't fire** — they are disabled while you are typing in a field, so you can type the letters normally. Click any empty area first, then press the key.

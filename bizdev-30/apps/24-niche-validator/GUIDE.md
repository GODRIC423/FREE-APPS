# Niche Validator — Step-by-Step Guide

Niche Validator is a gold-assay-office-styled tool for founders, freelancers, and small agencies who are about to pick a niche and want to do it with evidence instead of vibes. You bring in the niches you're actually considering, weigh each one on the same five criteria (pain intensity, budget, reachability, competitive field, and your edge), log real evidence — quotes, forum posts, data points — and stamp a formal decision record once you're honestly done assaying. Everything runs in one HTML file in your browser: no account, no server, no data leaving your machine.

## Getting started

Open `apps/24-niche-validator/index.html` directly in any modern browser — it is fully self-contained (fonts, icons, and code are all embedded). Alternatively, serve the repo root with any static server and browse to the same path. On first open, the "How to run an assay" guide appears automatically.

## Walkthrough

1. **Read the guide, then close it.** It only auto-opens once; reopen anytime with `?` or the *How to use* button.
2. **Load the demo assay.** Click *Load demo* in the header. You get a finished board: five candidate niches for a fictional ops consultant, each with scores, real-feeling evidence entries, and two of them carrying a stamped decision (one validated, one rejected). Study it, then *Reset* when ready to build your own.
3. **Write what you sell.** On the board, fill in "What you sell — context for every reading." Every Copilot prompt gets sharper once this exists.
4. **Set the assay weights.** In "The Assay Weights," set 1–5 grains per criterion based on what actually constrains your situation — if distribution is your bottleneck, weight reachability and your edge higher than budget. These weights apply to every specimen on the board at once, and every karat reading recomputes live when you change them.
5. **Bring in your candidates.** Click *New specimen* for each niche you're genuinely considering. Give each a name, a one-liner, and a description of who exactly and why now.
6. **Score honestly.** Open a specimen and set the five sliders 0–10:
   - **Pain intensity** — how urgent and costly the problem is for them right now.
   - **Budget** — can they pay a real price, is money already earmarked.
   - **Reachability** — can you find them and get in front of them affordably.
   - **Open field** — score high for a clear competitive field, low for brutal.
   - **Your edge** — do you have an unfair right-to-win: network, proof, insight.
   The karat gauge (0–24kt, borrowed from gold purity) and the percentage beneath it recompute live from your scores and weights.
7. **Log real evidence.** In the evidence log, paste quotes, forum posts, call notes, or data points, tagging each as *supports*, *against*, or *neutral*. The small balance glyph on each card and in the log tilts toward whichever side currently outweighs the other — an honest signal you're accumulating real evidence, not just a hopeful score.
8. **Compare side by side.** Check "Compare" on 2–4 specimen cards (or press `V`), then open the comparison table for every criterion, the weighted reading, and the evidence tally in one view.
9. **Run Copilot passes.** Press `C` or click *Copilot*, pick a target specimen, and choose an action:
   - **Generate evidence questions** — sharp, falsifiable research questions per criterion, plus a fastest kill test.
   - **Steelman the case AGAINST** — the strongest honest argument to kill your top niche before you spend real money on it.
   - **Draft the outreach test** — a complete 7-day cheap test: target list, channel, message, and success metric.
   - **Full board audit** — ranks every candidate by true validation strength (not just score), flags contradictions, and calls the quarter.
   Copy the prompt into [claude.ai](https://claude.ai) — it works with the standard $20 Claude subscription, no API key. Paste useful answers into the *Assay notebook* (auto-saves), then fold the good parts back into scores, evidence, or the decision.
10. **Stamp the decision.** When the evidence and the reading feel honest, stamp the specimen VALIDATED, REJECTED, or PARKED with a rationale and a next step. Stamped decisions appear in the *Decision Register* on the board and are pulled into every export.
11. **Ship the ledger.** Use *Export*: copy the whole assay ledger as Markdown (`Ctrl/Cmd+S` does the same), download JSON as a backup, download the comparison table as CSV, or import a previously exported JSON. *Print* from your browser produces a clean paper assay report.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `?` | Open the guide |
| `N` | Add a new specimen |
| `C` | Claude Copilot on/off |
| `V` | Open comparison (needs 2+ specimens selected) |
| `Ctrl / Cmd + S` | Copy the full assay ledger as Markdown |
| `Esc` | Close any panel or dialog, or step back to the board |
| `Enter` | Submit the evidence entry you are typing |

## Your data & privacy

All data lives in your browser's localStorage under the key `bizdev:24-niche-validator:v1`. Nothing is ever sent anywhere — the app makes zero network requests. **Export JSON regularly** (Export > Download JSON) as your backup; import it on any other machine to restore the board. Clearing browser site data wipes the assay.

## Pro tips

- Set your weights *before* you score your first niche, not after. Weighting the criteria to flatter whichever niche you already like defeats the whole point of the tool.
- Evidence beats opinion. A niche sitting at 18kt with zero evidence logged is a hunch wearing a lab coat — the *Full board audit* Copilot action is specifically designed to catch this.
- Run *Steelman the case AGAINST* on your current front-runner before you commit budget, even if it feels unnecessary. The exercise is cheapest the moment before you spend money, not after.
- Track a "do nothing" or "status quo" niche alongside real candidates if it helps — the open-field and edge criteria make it obvious when you're really competing against inertia, not a competitor.
- Reopen a stamped decision instead of deleting the specimen when new evidence changes your mind. The reasoning trail is more valuable than a clean board.

## Troubleshooting

- **The help window keeps opening on launch** — it opens until it has been closed once per browser profile; close it with `Esc` or the X and it stays closed (stored in `seenGuide`).
- **Copy buttons do nothing** — some browsers block the clipboard on `file://` pages. The app falls back to a hidden-textarea copy; if that also fails, use Export > Download JSON or select the prompt text manually.
- **The Compare button won't open anything** — it requires at least 2 specimens checked via the "Compare" checkbox on their cards; the header button shows a live count once you've selected some.
- **My data vanished** — you are likely in a different browser, profile, or private window; localStorage is per-profile. Restore from your last JSON export via Export > Import JSON.
- **Import fails** — the file must be a JSON export from Niche Validator (or match its shape). The importer runs everything through a normalizer, so partial files load with defaults, but non-JSON files are rejected.
- **`N`/`C`/`V` shortcuts don't fire** — they are disabled while you are typing in a field, so you can type those letters normally. Click any empty area first, then press the key.

# Lead Magnet Lab — Step-by-Step Guide

Lead Magnet Lab is a single-file workbench for inventing, scoring, and shipping lead magnets that actually convert. It is built for consultants, agencies, fractional executives, and B2B founders who know they need a magnet but keep shipping the wrong one: you put every concept on a bench, assay each on **pain relevance × speed-to-value × ease to build**, pick a lead candidate by the numbers, then take it through outline, landing-page copy, and a launch checklist — all in one place, all saved in your browser.

## Getting started

- Open `apps/10-lead-magnet-lab/index.html` directly in any modern browser — it is fully self-contained (no server, no network, no account).
- Or serve the repo root with any static server and browse to the same path.

## Walkthrough

1. **First open.** The "How to run the lab" guide appears automatically. Read it once; reopen anytime with the `?` key or the *How to use* button.
2. **Load the demo.** Click *Load demo* to see a finished lab: Ledgerline, a fractional CFO studio, with six scored concepts, a chosen lead candidate, a full outline, drafted landing copy, and a partly-run launch checklist. Reset when you are ready to start your own.
3. **Set your lab context** (right rail): describe your ICP and your paid offer. This text is embedded in every Claude Copilot prompt, so specificity here pays off everywhere.
4. **Stage 01 — Concept Bench.** Click *New concept* for each magnet idea. Give it a title, pick a format (checklist, template, calculator, swipe file, mini-guide, email course, quiz, toolkit, teardown, workshop), write the one-sentence promise, and set build effort (S/M/L).
5. **Assay each concept.** Drag the three sliders (0–5): pain relevance, speed-to-value, ease to build. The dial computes the **Attraction Index** — pain × speed × ease scaled to 0–100 — and the board auto-ranks. Use the format filter and the *Shelved* toggle to manage a big bench; shelve weak concepts instead of deleting them.
6. **Choose the lead candidate.** Click the magnet icon on the winner. It gets the red badge, and stages 02–04 default to it (you can still switch concepts with the *Working on* selector in each stage).
7. **Stage 02 — Outline Protocol.** Add 6–9 sections, each with a payoff-first heading and one bullet per line. Reorder with the arrow buttons; delete shows an Undo toast for a few seconds.
8. **Stage 03 — Page Label.** Fill headline (60-char counter), subhead, 3–5 benefit bullets, CTA button text, proof line, and form microcopy. The live specimen label on the right renders your opt-in page as you type.
9. **Stage 04 — Release Checklist.** Work the pre-seeded launch list across Build → Page → Distribution → Follow-up; add your own steps. The progress ring tracks completion.
10. **Claude Copilot** (right rail): four actions — *Synthesize 10 magnet ideas*, *Outline the lead candidate*, *Write the landing page copy*, *Peer-review my page copy*. Each compiles your live lab state into a complete prompt. Click *Copy prompt*, paste it into claude.ai (works with the standard $20 Claude subscription — no API key), then paste the useful output into the *Results log*, which is saved with your lab.
11. **Export.** From the *Export* dialog: copy the full **lab report as Markdown**, download **JSON** (full state), download the **scoreboard CSV**, **print** a clean paper report, or **import** a JSON backup (validated on the way in).

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `?` | Open the How-to-use guide |
| `Ctrl/Cmd + S` | Copy the lab report as Markdown |
| `Esc` | Close any open dialog |
| `Enter` (in "Add a launch step") | Add the step |

## Your data & privacy

Everything lives in your browser's localStorage under the key `bizdev:10-lead-magnet-lab:v1`. Nothing is ever sent anywhere — there is zero network activity. Use *Export → Download JSON* for backups or to move machines, and *Import JSON* to restore. *Reset* offers a one-click backup before wiping.

## Pro tips

- Score honestly on **ease**: a 5×5×1 concept (Index 20) loses to a 4×4×5 (Index 64) — that is the point of multiplying instead of averaging.
- Bias toward "do the work for them" formats (calculator, template, swipe file). They score higher on speed-to-value than anything that merely explains.
- Write the promise before the title. If the promise needs two sentences, the magnet is too big.
- Run the *Peer-review* Copilot action **before** publishing the page — it checks the copy against the outline for overselling.
- Revisit the bench quarterly: shelve the launched magnet's concept and promote the #2.

## Troubleshooting

- **My data vanished.** localStorage is per-browser and per-profile; private/incognito windows discard it on close. Restore from a JSON export, and keep one after major sessions.
- **Import says the file is invalid.** It must be a JSON file previously exported by this app (or matching its schema). Open it in a text editor and confirm it starts with `{` and contains `"concepts"`.
- **Copy buttons do nothing.** Some browsers restrict the clipboard on `file://` pages; the app falls back automatically, but if it still fails, open the prompt/preview, select the text, and copy manually.
- **The `?` shortcut does not open the guide.** It is ignored while you are typing in a field — click any empty area first, then press `?`.
- **Printing shows the app instead of the report.** Use *Export → Print lab report* (or your browser's Print) — the print stylesheet swaps the screen UI for the report automatically; make sure "Background graphics" is off for the cleanest output.

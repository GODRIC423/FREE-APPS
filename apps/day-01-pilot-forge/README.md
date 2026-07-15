# Pilot Forge — The Drafting Room

An industrial drafting table where a service-business AI pilot gets engineered. A rough idea goes on the blueprint sheet; a scoped, priced, provable pilot comes off it — live schematic, fit gauge, loss calculation, proof schedule, work orders, and an issued brief.

## Highlights

- **Live blueprint schematic** — the general-arrangement drawing (intake → pilot wedge → human gate → proof artifact → owner) redraws itself from your specification, proof window included as a dimension line.
- **Engraved fit gauge** — the needle sweeps 0–100 across six weighted factors; the inspection record shows every factor's points, reason, and a fix when it runs weak.
- **Loss calculation block** — monthly/yearly leak, recoverable revenue, suggested pilot fee, and owner payback, ruled out in mono digits.
- **Schedule of proof** — day-by-day milestones drafted from your wedge and proof window; tick, redraw, add, strike (with undo), or redraft.
- **Work-order clipboards** — drag cards across Queued / On the bench / Signed off, or walk them with the arrows; striking a card offers Undo.
- **Issue the drawing** — copy a full Markdown brief, file/load a JSON copy, or print the issued sheet. The APPROVED FOR PROOF stamp only lands once the gauge clears 60.

## Run

Open `index.html` directly, or serve the folder locally:

```bash
python3 -m http.server 8000
```

Then open `/apps/day-01-pilot-forge/` in your browser.

See [GUIDE.md](./GUIDE.md) for a full step-by-step walkthrough.

## Security boundary

- Static, local-first browser app: only `index.html`, `styles.css`, `app.js`. No build step, no external resources — fonts are embedded locally as data URIs and the app makes zero network requests.
- No API keys, tokens, `.env` files, databases, accounts, or network calls. All data stays in this browser's `localStorage`.
- Outputs are draft/local artifacts and should be human-reviewed before customer/public use — Pilot Forge never contacts customers or runs live actions.

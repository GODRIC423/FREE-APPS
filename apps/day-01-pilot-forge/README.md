# Pilot Forge

Turn a rough service-business idea into a scoped AI pilot you can actually pitch — fit score with reasons, ROI case, editable proof plan, action board, and an exportable brief.

## Highlights

- **Pilot-fit score with visible reasons** — six weighted factors, each with points, an explanation, and a tip when it is weak.
- **Live ROI calculator** — monthly/yearly leak, recoverable revenue, suggested pilot fee, and owner payback multiple.
- **Editable proof plan** — day-by-day milestones generated from your wedge and proof window; edit, check off, add, or regenerate.
- **Drag-and-drop action board** — To do / In progress / Done, with arrow buttons and undo on delete.
- **Export & handoff** — copy a full Markdown brief, download/import JSON, or print a clean one-page brief.

## Run

Open `index.html` directly, or serve the folder locally:

```bash
python3 -m http.server 8000
```

Then open `/apps/day-01-pilot-forge/` in your browser.

See [GUIDE.md](./GUIDE.md) for a full step-by-step walkthrough.

## Security boundary

- Static, local-first browser app: only `index.html`, `styles.css`, `app.js`. No build step, no external resources.
- No API keys, tokens, `.env` files, databases, accounts, or network calls. All data stays in this browser's `localStorage`.
- Outputs are draft/local artifacts and should be human-reviewed before customer/public use — Pilot Forge never contacts customers or runs live actions.

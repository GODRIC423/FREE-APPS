# Local Biz Snapshot

Build prospect dossiers on local businesses — profile, evidence-based lead-leak likelihoods, a recommended first wedge, and one human next step. Everything is manually entered; nothing is scraped.

## Highlights

- Multi-prospect pipeline with an at-a-glance fit score per business
- Leak-likelihood scoring driven by observable signals, each with reasons and evidence notes
- Auto wedge recommendation that targets your strongest-evidence leak (with manual override)
- Compare view that ranks all prospects by fit score
- Export as Markdown dossier, JSON, comparison CSV, or a clean printed document

## Run

Open `index.html` directly, or serve the folder locally:

```bash
python3 -m http.server 8000
```

Then open `/apps/day-11-local-biz-snapshot/` in your browser.

See [GUIDE.md](./GUIDE.md) for a full step-by-step walkthrough.

## Security boundary

- Static, local-first browser app: only `index.html`, `styles.css`, `app.js`. No build step, no external resources.
- No API keys, tokens, `.env` files, databases, or private local state are included.
- No backend, shell, GitHub, private-repo, CRM, webhook, payment, or account-writing access.
- Data persists only in your browser's `localStorage`.
- All outputs are draft/local artifacts and must be human-reviewed before any customer-facing or public use.

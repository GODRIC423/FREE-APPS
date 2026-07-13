# Technician Brief Builder

Turn messy office notes into a dispatch-ready, one-page job brief — customer context, reported issue, parts checklist, risk flags, and a no-promise boundary the tech can't miss.

- **Job-type templates** (HVAC, plumbing, electrical, appliance, maintenance, install, inspection) that seed first checks, hazards, boundaries, and suggested parts
- **Parts & tools checklist builder** with quantities, suggested chips, and packed tracking
- **Auto-detected risk flags** from your notes, plus manual flags with severity and mitigations
- **Brief completeness meter** and a four-point dispatch sign-off gating "DISPATCH READY"
- **Printable one-page brief**, Markdown copy, and JSON export/import — all local drafts

## Run

Open `index.html` directly, or serve the folder locally:

```bash
python3 -m http.server 8000
```

Then open `/apps/day-07-technician-brief-builder/` in your browser.

See [GUIDE.md](GUIDE.md) for a full step-by-step walkthrough.

## Security boundary

- Static, local-first browser app: `index.html`, `styles.css`, `app.js` only. No backend, accounts, cookies, or network calls; data persists in `localStorage`.
- No API keys, tokens, `.env` files, databases, or private local state are included.
- No CRM, webhook, payment, dispatch, or customer-contact access. Outputs are draft/local artifacts and must be human-reviewed before customer or public use.

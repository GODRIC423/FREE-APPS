# Intake Form Builder

Design a service intake form — fields, sections, required flags — with a live preview, a privacy/PII audit, and an exportable spec. Local-first, draft-only: nothing is published and no customer data is ever collected.

- **Build fields in place:** add, edit, duplicate, delete (with undo), and reorder by drag or buttons; 11 field types across 7 sections.
- **Live preview:** the requester's view, grouped by section, with realistic mock inputs.
- **Privacy audit:** flags sensitive asks (SSNs, card/bank numbers, health data, credentials, protected characteristics), missing consent, required overload, file-upload metadata risk, and data-minimization issues.
- **Health score with reasons:** 0–100 with every deduction and bonus itemized.
- **Export & handoff:** copy Markdown, download Markdown/JSON/CSV, print — plus JSON import for backup/restore.

## Run

Open `index.html` directly, or serve the folder locally:

```bash
python3 -m http.server 8000
```

Then open the matching `/apps/day-20-intake-form-builder/` path in your browser.

Full walkthrough: see [GUIDE.md](./GUIDE.md).

## Security boundary

- Static, local-first browser app: only `index.html`, `styles.css`, `app.js`. No CDNs, no fonts, no fetch/XHR, no analytics.
- No API keys, tokens, backends, accounts, webhooks, CRM, or payment access. State lives in `localStorage` only.
- All outputs are draft artifacts for human review before any customer or public use.

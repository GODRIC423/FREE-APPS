# Proof Vault

Catalog your wins as reusable, approval-gated proof cards — a local-first evidence library for case studies that are safe to show.

- **Card library** with tags, full-text search, status filters, and readiness scoring
- **Five-point redaction checklist** per card (names, secrets, financials, visuals, third-party data) that gates the workflow
- **Approval workflow** — Captured → Redaction review → Pending approval → Approved, with named-approver sign-off
- **Case-study angle generator** — metric-led, problem→solution, before/after, and trust-angle drafts from any card
- **Export & handoff** — Markdown evidence pack, JSON backup/import, CSV, and a print-ready report

## Run

Open `index.html` directly, or serve the folder locally:

```bash
python3 -m http.server 8000
```

Then open `/apps/day-13-proof-vault/` in your browser. See **[GUIDE.md](GUIDE.md)** for a full step-by-step walkthrough.

## Security boundary

Static, local-first browser app: exactly `index.html`, `styles.css`, and `app.js`. No API keys, tokens, databases, backends, network calls, accounts, or tracking — all data stays in this browser's localStorage. Every export is a draft for human review: redact and obtain explicit approval before any customer-facing or public use.

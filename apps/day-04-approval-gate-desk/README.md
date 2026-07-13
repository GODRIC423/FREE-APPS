# Approval Gate Desk

A local-first human review queue for AI-drafted customer messages: approve, edit, or reject every draft before a person sends it — with an append-only, hash-chained audit log.

## Highlights

- **Review queue** with status, risk, and text filters; high-risk pending drafts sort to the top.
- **Automatic risk flags** — the desk scans drafts for guarantees, pricing promises, pressure tactics, legal exposure, and personal data (with manual override).
- **Inline edit before approve** — the original AI text is preserved, and edited approvals are logged as "approved with edits".
- **Rejection reason taxonomy** — every rejection requires a categorized reason, so failure patterns become visible.
- **Immutable decision log** — timestamped, append-only, hash-chained entries; exportable as audit CSV, Markdown packet, JSON, or a printable report.

## Run

Open `index.html` directly, or serve the folder locally:

```bash
python3 -m http.server 8000
```

Then open the matching `/apps/day-04-approval-gate-desk/` path in your browser.

See [GUIDE.md](./GUIDE.md) for a full step-by-step walkthrough.

## Security boundary

- Static, local-first browser app: only `index.html`, `styles.css`, `app.js`. No build step, no CDNs, no fonts, no network calls.
- No API keys, tokens, `.env` files, databases, accounts, or private local state are included; persistence is `localStorage` only.
- No backend, shell, GitHub, CRM, webhook, payment, or account-writing access is included.
- Outputs are draft/local artifacts and must be human-reviewed before customer or public use — the app records decisions; it never sends anything.

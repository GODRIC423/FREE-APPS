# SOP Builder

Write repeatable operating procedures — trigger, owner, inputs, steps, quality checks, and exception paths — entirely in your browser.

- **Multi-SOP library** with per-procedure completeness scores, duplicate, delete (with undo), and JSON import/export.
- **Reorderable step editor**: drag or arrow-key steps into order, each with its own owner, tool, and duration; runtime is summed live.
- **Quality-check checklist and exception paths** ("if X, do Y, escalate to Z") so the SOP is safe to delegate.
- **Completeness score (0–100%)** across Basics / Steps / Quality checks / Exceptions, with a "Fix next" list.
- **Printable SOP document**, Markdown copy, JSON library download, and steps CSV — all drafts for human review.

## Run

Open `index.html` directly, or serve the folder locally:

```bash
python3 -m http.server 8000
```

Then open `/apps/day-14-sop-builder/` in your browser.

See **[GUIDE.md](./GUIDE.md)** for a full step-by-step walkthrough.

## Security boundary

- Static, local-first app: only `index.html`, `styles.css`, `app.js`. No build step, no CDNs, no fetch/XHR, no fonts, no analytics.
- No API keys, tokens, `.env` files, databases, accounts, or private local state are included.
- No backend, shell, GitHub, CRM, webhook, payment, or account-writing access is included.
- All data stays in this browser's `localStorage`. Outputs are draft/local artifacts and should be human-reviewed before customer-facing or public use.

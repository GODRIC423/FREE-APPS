# The Field Manual (SOP Builder)

Author standard operating procedures as crisp field-manual pages — trigger, owning role, required inputs, numbered steps, an inspection checklist, and "in case of" exception paths — entirely in your browser.

- **A shelf of tabbed manuals** (multi-SOP library) with per-manual document codes (`SOP-01`), completeness, duplicate, delete (with undo), and JSON import/export.
- **A numbered procedure page (§2)**: drag or arrow-key steps into order, with each step's owner, tool, and minutes kept as margin notes; runtime is summed live in the document control block.
- **Inspection checklist (§3) with stamp-style ticks and red-edged "In case of" boxes (§4)** ("if X, do Y, escalate to Z") so the manual is safe to hand over.
- **A certification seal (§5)** — a 0–100% structural score across Basics / Steps / Quality checks / Exceptions that inks in as you write, with a "Fix next" list.
- **The issued page**: a printable manual page, Markdown copy, JSON library download, and steps CSV — all drafts for human review.

## Run

Open `index.html` directly, or serve the folder locally:

```bash
python3 -m http.server 8000
```

Then open `/apps/day-14-sop-builder/` in your browser.

See **[GUIDE.md](./GUIDE.md)** for a full step-by-step walkthrough.

## Security boundary

- Static, local-first app: only `index.html`, `styles.css`, `app.js`. No build step, no CDNs, no fetch/XHR, no network fonts (the typefaces are OFL-licensed and embedded locally as data URIs), no analytics.
- No API keys, tokens, `.env` files, databases, accounts, or private local state are included.
- No backend, shell, GitHub, CRM, webhook, payment, or account-writing access is included.
- All data stays in this browser's `localStorage`. Outputs are draft/local artifacts and should be human-reviewed before customer-facing or public use.

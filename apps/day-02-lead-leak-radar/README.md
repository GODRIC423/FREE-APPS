# Lead Leak Radar

Find where a local business is losing leads, put a monthly dollar figure on every leak, and get a prioritized fix plan — all in a single local-first page.

- **Channel-by-channel leak audit** — missed calls, web forms, shared inbox, booking drop-off, sent quotes, social DMs, or custom channels, each with its own audit check, first fix, and proof metric.
- **Severity scoring + radar** — every channel gets a 0–100 severity score (leak rate, response delay, dollars at stake) and is plotted on a live radar: closer to center = hotter leak, blip size = monthly $ leak.
- **Monthly $ leak math** — lost leads/month, monthly $ leak, and recoverable value computed live from your close rate, recovery rate, and per-channel estimates.
- **Prioritized 30-day fix plan** — ranked by confidence-weighted recoverable dollars per unit of effort, with quick wins flagged.
- **Exportable radar report** — copy Markdown, download JSON (re-importable) or CSV, or print a clean owner-ready report.

## Run

Open `index.html` directly, or serve the folder locally:

```bash
python3 -m http.server 8000
```

Then open `/apps/day-02-lead-leak-radar/` in your browser.

See **[GUIDE.md](./GUIDE.md)** for a full step-by-step walkthrough.

## Security boundary

This is a **static, local-first browser app**: only `index.html`, `styles.css`, and `app.js` run, with state kept in `localStorage`.

- No API keys, tokens, `.env` files, databases, or private local state are included.
- No backend, shell, GitHub, private-repo, CRM, webhook, payment, or account-writing access is included.
- Outputs are draft/local artifacts and should be human-reviewed before customer/public use.

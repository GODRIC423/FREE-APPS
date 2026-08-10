# Owner Report Studio

Compose a daily or weekly owner report — metrics with deltas, wins, risks, decisions needed — and know exactly when it's ready to send.

- **Metric rows with deltas:** current vs prior period, $/#/%/hrs formats, up-good or down-good per metric, live Δ and Δ% with a trend summary.
- **Report health checklist:** 8 checks (summary, priors, owned decisions, owned actions…) roll up into a live score and a "Ready to send" badge.
- **Clean printable report:** the preview prints as a one-page owner report; chrome and editors disappear.
- **Export & handoff:** copy Markdown (Ctrl/Cmd+S), download .md, metrics CSV, JSON backup + import.
- **Local-first:** dark/light theme, demo data, undo on delete — all state in this browser's localStorage.

## Run

Open `index.html` directly, or serve the folder locally:

```bash
python3 -m http.server 8000
```

Then open the matching `/apps/day-03-owner-report-studio/` path in your browser.

See **[GUIDE.md](./GUIDE.md)** for a full step-by-step walkthrough.

## Security boundary

- Static, local-first browser app: only `index.html`, `styles.css`, `app.js`. No build step, no external resources, no network requests.
- No API keys, tokens, `.env` files, databases, or private local state are included.
- No backend, shell, GitHub, private-repo, CRM, webhook, payment, or account-writing access is included.
- Outputs are draft/local artifacts and should be human-reviewed before customer/public use.

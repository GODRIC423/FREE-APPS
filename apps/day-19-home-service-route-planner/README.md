# Home Service Route Planner

Plan a home-service day offline: stop cards, priorities, appointment windows, drive buffers, manual route ordering, and a printable per-tech dispatch sheet — no maps API, no accounts.

- Per-technician routes with computed arrival/departure times from day start, drive buffers, and on-site durations
- Time-window conflict warnings, emergency-priority checks, and a day-capacity meter per tech
- Manual reorder controls plus one-click "sort by window, then priority"
- Export & handoff: copy Markdown, print (one page per tech), download CSV/JSON, import JSON
- Dark/light themes, undo for deletes, keyboard shortcuts, autosave to this browser

## Run

Open `index.html` directly, or serve the folder locally:

```bash
python3 -m http.server 8000
```

Then open the matching `/apps/day-19-home-service-route-planner/` path in your browser.

See [GUIDE.md](./GUIDE.md) for a full step-by-step walkthrough.

## Security boundary

- Static, local-first browser app: only `index.html`, `styles.css`, `app.js`. No build step, no external resources.
- No API keys, tokens, `.env` files, databases, or private local state are included.
- No backend, shell, GitHub, private-repo, CRM, webhook, payment, or account-writing access is included.
- Outputs are draft/local artifacts and should be human-reviewed before customer/public use — the planner uses your buffer assumptions, not live traffic.

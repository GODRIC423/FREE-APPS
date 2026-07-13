# Warm Outreach Lab

Draft human-reviewed warm outreach to local businesses — one noticed issue, one proof point, one low-pressure ask per prospect.

## Highlights

- **Prospect cards with research notes** — business, contact, channel, noticed issue, proof point, ask, and claims to avoid, tracked through a simple pipeline.
- **Personalization slots + genericness lint** — compose drafts with `{{business}}`-style slots and get a 0–100 personalization score that flags canned openers, hype words, missing specifics, and me-heavy writing.
- **Follow-up cadence planner** — apply a 3- or 4-touch template from a start date, check touches off, and see due/overdue touches at a glance.
- **Pipeline stats** — prospects, send-ready drafts, touches due, and reply rate, live.
- **Export & handoff** — Markdown packet, JSON download/import, pipeline CSV, and a print-ready packet. Undo for deletes, dark/light theme, keyboard shortcuts.

## Run

Open `index.html` directly, or serve the folder locally:

```bash
python3 -m http.server 8000
```

Then open `/apps/day-09-warm-outreach-lab/` in your browser.

Full walkthrough: see [GUIDE.md](./GUIDE.md).

## Security boundary

This is a **static, local-first browser app**: only `index.html`, `styles.css`, and `app.js` run, and data lives in your browser's localStorage.

- No API keys, tokens, `.env` files, databases, or private local state are included.
- No backend, shell, GitHub, private-repo, CRM, webhook, payment, or account-writing access is included.
- Outputs are draft/local artifacts and must be human-reviewed before any customer or public use — the app never sends anything.

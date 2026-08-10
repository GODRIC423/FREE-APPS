# Daily Cash Board

A cash-first daily control room: every offer, follow-up, booked call, invoice, and collection on one board, sorted by what moves money today.

- **Live cash metrics** — weighted cash-in potential, cash at risk (overdue), due-today count, and value closed today.
- **Five cash lanes** with per-lane totals, due-state chips, and red overdue highlighting.
- **Today's top 3 focus picker** — star the moves that matter; the list resets each morning.
- **End-of-day summary** — copy as Markdown, download JSON/CSV, or print. Undo for deletes, import/export, dark & light themes.
- **Local-first** — everything lives in your browser's localStorage. No network, no accounts.

## Run

Open `index.html` directly, or serve the folder locally:

```bash
python3 -m http.server 8000
```

Then open `/apps/day-15-daily-cash-board/` in your browser.

See [GUIDE.md](./GUIDE.md) for a full step-by-step walkthrough.

## Security boundary

- Static, local-first app: only `index.html`, `styles.css`, `app.js`. No API keys, tokens, `.env` files, databases, or private local state.
- No backend, shell, GitHub, CRM, webhook, payment, or account-writing access.
- Outputs are draft/local artifacts and must be human-reviewed before any customer-facing, billing, or public use.

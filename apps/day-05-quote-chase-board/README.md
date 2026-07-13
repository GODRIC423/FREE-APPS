# Quote Chase Board

Track outstanding quotes on a five-lane pipeline board and drive every follow-up — with staleness day-counts, live pipeline value, and a draft-only follow-up note generator.

- **Pipeline board by stage** — Draft, Sent, Negotiating, Won, Lost, each lane totalled.
- **Staleness indicators** — day counts since the last touch (fresh / aging / stale) plus due-today and overdue follow-up flags.
- **Live pipeline stats** — open value, probability-weighted value, follow-ups due, and dollar value at risk in stale quotes.
- **Follow-up drafter** — generates an editable note per quote in three tones (friendly, direct, final nudge); copy it, never sent from the app.
- **Export & handoff** — Markdown chase plan, CSV for spreadsheets, JSON backup/import, and a clean print layout.

## Run

Open `index.html` directly, or serve the folder locally:

```bash
python3 -m http.server 8000
```

Then open the matching `/apps/day-05-quote-chase-board/` path in your browser.

Full walkthrough: [GUIDE.md](./GUIDE.md)

## Security boundary

- Static, local-first browser app: only `index.html`, `styles.css`, `app.js`. No network requests, backend, accounts, cookies, or analytics — data stays in this browser's `localStorage`.
- No API keys, tokens, `.env` files, databases, or private local state are included.
- All outputs (notes, plans, exports) are drafts for human review before any customer or public use. The app never contacts anyone.

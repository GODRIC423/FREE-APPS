# Meeting Follow-up Kit

Turn messy meeting notes into a structured recap — decisions, action items with owners and due dates, risks, open questions — plus a tone-adjustable follow-up email draft. Everything stays in your browser.

## Highlights

- **Meeting history** — keep multiple meetings, switch between them, delete with undo.
- **Structured capture** — quick-add decisions, risks & blockers, and open questions; scan raw notes and the kit suggests items to add with one click.
- **Action tracking** — owner, due date, and status (open / in progress / done) with automatic overdue flagging.
- **Follow-up email with tones** — Friendly, Professional, or Direct; the draft rewrites instantly.
- **Export & handoff** — copy a Markdown recap, download re-importable JSON or an actions CSV, print a clean recap page.

## Run

Open `index.html` directly, or serve the folder locally:

```bash
python3 -m http.server 8000
```

Then open `/apps/day-16-meeting-follow-up-kit/` in your browser.

See [GUIDE.md](./GUIDE.md) for a full step-by-step walkthrough.

## Security boundary

- Static, local-first: only `index.html`, `styles.css`, `app.js`. No build step, no CDNs, no fonts, no network calls of any kind.
- No API keys, tokens, accounts, cookies, or backend. Data persists in `localStorage` only.
- Outputs are **drafts for human review**. The kit never sends email, writes calendars or CRMs, or contacts customers.

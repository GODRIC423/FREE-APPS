# Script Rehearsal Room

Practice the sales or discovery call before it counts: build a talk track, drill objections, rehearse against the clock, and score yourself — all in your browser.

- **Script builder** — sections of short talk-track cards with live word counts and speaking-time estimates (140 wpm).
- **Objection flashcards** — flip-to-reveal drill mode with shuffle, honest self-grading, and a mastery percentage.
- **Paced rehearsal timer** — set a target length and get section-by-section pace hints while you speak out loud.
- **Session history** — log 1–5 self-scores per run (Opening / Discovery / Objections / Close) and watch the trend.
- **Export & handoff** — Markdown run sheet, printable version, JSON backup/import, and sessions CSV.

## Run

Open `index.html` directly, or serve the folder locally:

```bash
python3 -m http.server 8000
```

Then open `/apps/day-12-script-rehearsal-room/` in your browser.

Full walkthrough: see [GUIDE.md](./GUIDE.md).

## Security boundary

- Static, local-first app: only `index.html`, `styles.css`, and `app.js`. No build step, no external resources.
- No API keys, tokens, `.env` files, databases, backends, accounts, or network calls; data persists in `localStorage` only.
- Outputs are draft/local artifacts — human review and explicit approval are required before any customer-facing use.

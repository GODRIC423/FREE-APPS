# Service Triage Flow

Guide a call-taker through triaging an inbound service request — urgency, routing, next questions, and never a promise the business has to walk back.

## Highlights

- **Step-through triage wizard** that branches on urgency cues: caller → issue → safety checklist → logistics → review & route, with a fast-track when a severe hazard is confirmed.
- **Routing recommendation with reasons** — a live urgency score (0–100), category (Emergency / Same-day / Scheduled / Estimate / Callback), route destination, and a plain-English list of *why*. Negated phrases like "no smoke" are ignored by cue detection, and the call-taker can override the category.
- **Call log** of triaged requests with per-call snapshot, print, copy, and delete-with-undo.
- **Printable triage card** for the current call or any logged call, plus Markdown copy, JSON backup/import, and CSV export of the log.
- Dark/light theme, keyboard shortcuts, autosave to `localStorage`.

## Run

Open `index.html` directly, or serve the folder locally:

```bash
python3 -m http.server 8000
```

Then open the matching `/apps/day-08-service-triage-flow/` path in your browser.

See [GUIDE.md](./GUIDE.md) for a full step-by-step walkthrough.

## Security boundary

- Static, local-first browser app: only `index.html`, `styles.css`, `app.js`. No build step, no external resources.
- No API keys, tokens, `.env` files, databases, backend, CRM, webhook, payment, or account access. Data lives only in this browser's `localStorage`.
- Every output (Markdown, JSON, CSV, printed card) is a **draft for human review**. The app never contacts customers, books jobs, or promises price, ETA, availability, or outcome — a human dispatcher confirms all of that.

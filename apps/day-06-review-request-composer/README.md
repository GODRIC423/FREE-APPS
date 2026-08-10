# Review Request Composer

Craft low-pressure review requests tied to a real completed job — with timing guidance, tone presets, and a pressure lint — then send them yourself. Nothing is ever sent from this app.

## Highlights

- **Length-aware message variants:** SMS drafts with live character/segment counts, and email drafts with subject lines — five tone presets from "Warm & short" to "Professional (B2B)".
- **Timing advisor:** cooling-off day, 1–7 day prime window, staleness cliff, satisfaction gating, per-channel best send times, and one-follow-up-max guidance.
- **Do-not-pressure lint:** blocks incentives and star-begging (platform-policy violations), warns on gating, urgency, guilt framing, shouting, and over-asking — re-checked on every keystroke.
- **Per-customer ask queue:** ready / not-yet / hold verdicts, asked and reviewed tracking, undo-able deletes.
- **Export & handoff:** Markdown packet, JSON backup with import, CSV of the queue, and a clean print view.

## Run

Open `index.html` directly, or serve the folder locally:

```bash
python3 -m http.server 8000
```

Then open the matching `/apps/day-06-review-request-composer/` path in your browser.

See [GUIDE.md](./GUIDE.md) for a full step-by-step walkthrough.

## Security boundary

- Static, local-first browser app: only `index.html`, `styles.css`, `app.js`. No build step, no external resources, no network requests.
- No API keys, tokens, `.env` files, databases, backends, accounts, or tracking. All data stays in this browser's localStorage.
- Outputs are drafts/local artifacts only — a human reviews and manually sends every message before any customer or public use.

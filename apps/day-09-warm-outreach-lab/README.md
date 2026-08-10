# The Correspondence Desk — Warm Outreach Lab

A writer's desk for warm outreach to local businesses, where every prospect is a letter in progress — one noticed issue, one honest proof point, one gentle ask per letter. Drafted here, posted by a human.

## Highlights

- **A letter tray of envelopes** — each prospect is an envelope carrying a dossier: business, contact, channel, the noticed issue, the proof point, the ask, and claims to avoid, tracked from *Gathering notes* to *Reply received*.
- **Brass fill-in plates + the editor's pencil** — compose on a ruled letter sheet with `{{business}}`-style slots, and get a 0–100 grade stamped on the draft that flags canned openers, hype words, missing specifics, and me-heavy writing.
- **A string of postmarks** — apply a 3- or 4-letter follow-up cadence from a start date, stamp each postmark as it's posted, and see due/past-due postmarks at a glance.
- **The desk ledger** — letters in the tray, sealed-and-send-ready drafts, postmarks due, and reply rate, live in the header band.
- **Dispatch & handoff** — Markdown packet, JSON download/import, tray-ledger CSV, and a print-ready packet. Undo for discards and keyboard shortcuts throughout.

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

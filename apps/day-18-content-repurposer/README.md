# Content Repurposer

Turn one long-form piece — transcript, podcast, article, or build log — into a complete, claim-checked publishing packet. Drafts only, receipts required.

- **Per-platform draft cards** with live character counters against real limits: 3 YouTube title options (100), description (5,000), short post (280), LinkedIn (3,000), newsletter subject + blurb.
- **Chapter & timestamp builder** that auto-cuts chapters from your source across the runtime and validates YouTube's rules (00:00 start, ascending, 3+ chapters).
- **Claim-check lint** that flags superlatives, absolutes, bait wording, and any stat with no matching proof note.
- **Packet export**: Markdown copy, `.md`/JSON download, JSON import, and a print-clean review document — every export stamped with the human-approval boundary.
- Local-first: dark/light theme, autosave, demo scenario, undo for destructive actions, keyboard shortcuts.

## Run

Open `index.html` directly, or serve the folder locally:

```bash
python3 -m http.server 8000
```

Then open `/apps/day-18-content-repurposer/` in your browser.

See [GUIDE.md](./GUIDE.md) for a full step-by-step walkthrough.

## Security boundary

This is a **static, local-first browser app**: only `index.html`, `styles.css`, and `app.js` run, with state kept in `localStorage`.

- No API keys, tokens, `.env` files, databases, or private local state are included.
- No backend, network calls, accounts, tracking, or publishing integrations of any kind.
- All outputs are drafts and must be human-reviewed and approved before customer/public use.

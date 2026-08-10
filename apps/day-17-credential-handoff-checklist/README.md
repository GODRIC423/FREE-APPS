# Credential Handoff Checklist

Local-first access-custody tracker that stores **no secrets** — inventory who holds which access, flag custody risks, and generate offboarding revocation runbooks.

- **System inventory with risk flags**: no MFA, no backup owner, stale rotation, undocumented revocation — each ranked by severity.
- **Custody health score**: 0–100 with a letter grade; Owner/Admin/Billing access counts double.
- **Offboarding runbook generator**: pick the person leaving, get an ordered revoke → rotate → reassign → verify checklist with tracked progress.
- **Hard secret lint**: anything password-shaped (keys, tokens, JWTs, high-entropy strings, `password: …`) is blocked from being saved in any field, and scrubbed on import.
- **Custody report export**: Markdown copy, JSON download/import, CSV, and a clean print layout.

## Run

Open `index.html` directly, or serve the folder locally:

```bash
python3 -m http.server 8000
```

Then open the matching `/apps/day-17-credential-handoff-checklist/` path in your browser.

See **[GUIDE.md](./GUIDE.md)** for a full step-by-step walkthrough.

## Security boundary

- Static, local-first browser app: only `index.html`, `styles.css`, `app.js`. No CDNs, no fonts, no network requests, no accounts; data stays in this browser's `localStorage`.
- The app tracks custody **metadata only** — it never stores, encrypts, transmits, rotates, or revokes actual credentials, and a hard lint blocks password-shaped values from being saved.
- All outputs are draft/local artifacts and must be human-reviewed and approved before real handoff, revocation, or any customer/public use.

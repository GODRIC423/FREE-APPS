# FREE APPS

A curated public export of local-first static app prototypes.

**Browse the gallery:** open [`index.html`](index.html) — a self-contained App Studio landing page
with search, category filters, and click-to-preview screenshots of every app. No build step, no
dependencies, no network calls.

## Security posture

- Only static app files are included: `index.html`, `styles.css`, `app.js`, and generated public READMEs.
- The landing gallery (`index.html`) and the `screenshots/` previews are also fully static: vanilla
  HTML/CSS/JS with no frameworks, no external CDNs, and no network requests.
- Runtime token files, LAN phone-preview bridges, build scripts, caches, databases, `.env` files, and local machine paths are excluded.
- The studio export's internal authoring runtime (`dc-runtime` / `support.js`), the `*.dc.html`
  source, and the Adeul design-system bundle (which documents private founder repositories) are
  **deliberately excluded** — the public gallery is a clean re-implementation of the same look.
- These apps do not include backend code, shell access, GitHub credentials, private-repo access, CRM/webhook writes, payment/account integrations, or external CDNs.

## Apps

Each app links to its source folder; preview images live in [`screenshots/`](screenshots/) and are
shown in the [gallery](index.html).

- [Day 01 — Pilot Forge](apps/day-01-pilot-forge/)
- [Day 02 — Lead Leak Radar](apps/day-02-lead-leak-radar/)
- [Day 03 — Owner Report Studio](apps/day-03-owner-report-studio/)
- [Day 04 — Approval Gate Desk](apps/day-04-approval-gate-desk/)
- [Day 05 — Quote Chase Board](apps/day-05-quote-chase-board/)
- [Day 06 — Review Request Composer](apps/day-06-review-request-composer/)
- [Day 07 — Technician Brief Builder](apps/day-07-technician-brief-builder/)
- [Day 08 — Service Triage Flow](apps/day-08-service-triage-flow/)
- [Day 09 — Warm Outreach Lab](apps/day-09-warm-outreach-lab/)
- [Day 10 — Pilot Pricing Calculator](apps/day-10-pilot-pricing-calculator/)
- [Day 11 — Local Biz Snapshot](apps/day-11-local-biz-snapshot/)
- [Day 12 — Script Rehearsal Room](apps/day-12-script-rehearsal-room/)
- [Day 13 — Proof Vault](apps/day-13-proof-vault/)
- [Day 14 — SOP Builder](apps/day-14-sop-builder/)
- [Day 15 — Daily Cash Board](apps/day-15-daily-cash-board/)
- [Day 16 — Meeting Follow-up Kit](apps/day-16-meeting-follow-up-kit/)
- [Day 17 — Credential Handoff Checklist](apps/day-17-credential-handoff-checklist/)
- [Day 18 — Content Repurposer](apps/day-18-content-repurposer/)
- [Day 19 — Home Service Route Planner](apps/day-19-home-service-route-planner/)
- [Day 20 — Intake Form Builder](apps/day-20-intake-form-builder/)

## Audit

See [`SECURITY_AUDIT.md`](SECURITY_AUDIT.md).

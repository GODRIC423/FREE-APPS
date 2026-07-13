# FREE APPS — Claude Fable 5 Remake

A complete remake of the original 20-app collection: every app rebuilt from scratch as a polished, local-first browser tool with a unified design system and a step-by-step instruction guide.

## What changed in the remake

- **Rebuilt UI** — shared design system across all 20 apps: dark/light themes, responsive layouts, accessible components, consistent buttons/panels/toasts.
- **Step-by-step guides** — every app has a `GUIDE.md` walkthrough *and* a built-in "How to use" panel that opens automatically on first visit.
- **Sturdier data** — versioned localStorage keys with normalization (corrupt or legacy data never crashes an app), JSON export **and** import, undo for deletions.
- **Keyboard support** — `?` opens help, `Esc` closes dialogs, `Ctrl/Cmd+S` exports the main artifact.
- **Less cruft** — the accumulated cross-app "bridge" panels were replaced with one clean Export & Handoff section per app.
- **Print-ready output** — each app's main artifact prints as a clean document.

## Run

Open [`index.html`](index.html) for the app gallery, or serve the repo locally:

```bash
python3 -m http.server 8000
```

Then browse to `http://localhost:8000/`.

## Security posture (unchanged)

- Static app files only: `index.html`, `styles.css`, `app.js`, plus `README.md` and `GUIDE.md` per app.
- Zero external resources: no CDNs, no web fonts, no fetch/XHR, no analytics.
- No backend, accounts, credentials, CRM/webhook writes, or payment integrations.
- All data stays in your browser's localStorage; outputs are drafts for human review.

## Apps

| Day | App | Guide |
| --- | --- | --- |
| 01 | [Pilot Forge](apps/day-01-pilot-forge/) | [Guide](apps/day-01-pilot-forge/GUIDE.md) |
| 02 | [Lead Leak Radar](apps/day-02-lead-leak-radar/) | [Guide](apps/day-02-lead-leak-radar/GUIDE.md) |
| 03 | [Owner Report Studio](apps/day-03-owner-report-studio/) | [Guide](apps/day-03-owner-report-studio/GUIDE.md) |
| 04 | [Approval Gate Desk](apps/day-04-approval-gate-desk/) | [Guide](apps/day-04-approval-gate-desk/GUIDE.md) |
| 05 | [Quote Chase Board](apps/day-05-quote-chase-board/) | [Guide](apps/day-05-quote-chase-board/GUIDE.md) |
| 06 | [Review Request Composer](apps/day-06-review-request-composer/) | [Guide](apps/day-06-review-request-composer/GUIDE.md) |
| 07 | [Technician Brief Builder](apps/day-07-technician-brief-builder/) | [Guide](apps/day-07-technician-brief-builder/GUIDE.md) |
| 08 | [Service Triage Flow](apps/day-08-service-triage-flow/) | [Guide](apps/day-08-service-triage-flow/GUIDE.md) |
| 09 | [Warm Outreach Lab](apps/day-09-warm-outreach-lab/) | [Guide](apps/day-09-warm-outreach-lab/GUIDE.md) |
| 10 | [Pilot Pricing Calculator](apps/day-10-pilot-pricing-calculator/) | [Guide](apps/day-10-pilot-pricing-calculator/GUIDE.md) |
| 11 | [Local Biz Snapshot](apps/day-11-local-biz-snapshot/) | [Guide](apps/day-11-local-biz-snapshot/GUIDE.md) |
| 12 | [Script Rehearsal Room](apps/day-12-script-rehearsal-room/) | [Guide](apps/day-12-script-rehearsal-room/GUIDE.md) |
| 13 | [Proof Vault](apps/day-13-proof-vault/) | [Guide](apps/day-13-proof-vault/GUIDE.md) |
| 14 | [SOP Builder](apps/day-14-sop-builder/) | [Guide](apps/day-14-sop-builder/GUIDE.md) |
| 15 | [Daily Cash Board](apps/day-15-daily-cash-board/) | [Guide](apps/day-15-daily-cash-board/GUIDE.md) |
| 16 | [Meeting Follow-up Kit](apps/day-16-meeting-follow-up-kit/) | [Guide](apps/day-16-meeting-follow-up-kit/GUIDE.md) |
| 17 | [Credential Handoff Checklist](apps/day-17-credential-handoff-checklist/) | [Guide](apps/day-17-credential-handoff-checklist/GUIDE.md) |
| 18 | [Content Repurposer](apps/day-18-content-repurposer/) | [Guide](apps/day-18-content-repurposer/GUIDE.md) |
| 19 | [Home Service Route Planner](apps/day-19-home-service-route-planner/) | [Guide](apps/day-19-home-service-route-planner/GUIDE.md) |
| 20 | [Intake Form Builder](apps/day-20-intake-form-builder/) | [Guide](apps/day-20-intake-form-builder/GUIDE.md) |

## Audit

See [`SECURITY_AUDIT.md`](SECURITY_AUDIT.md) for the original collection's audit. The remake preserves the same boundary: no secrets, no network calls, no backend.

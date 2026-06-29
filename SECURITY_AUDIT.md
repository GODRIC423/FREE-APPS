# FREE APPS Security Audit

Generated: 2026-06-28T18:29:00.719635+00:00

## Scope

- Curated export from the 30 App Daily Ritual source tree.
- Copied only static browser source files per app: `index.html`, `styles.css`, `app.js`.
- Excluded runtime LAN token files, phone-preview servers, build scripts, caches, databases, `.env`, and local launchers.

## Gallery update (2026-06-29)

A visual landing gallery and per-app preview screenshots were added from the "Free App Download
Studio" export. The following studio assets were reviewed and **deliberately excluded** to keep the
public export clean and consistent with this posture:

- `support.js` — the `dc-runtime` authoring framework (depends on bundled React/ReactDOM globals; not a standalone page).
- `App Studio.dc.html` / `.thumbnail` — internal design-canvas authoring source, not a renderable static page.
- `_ds/` Adeul design-system bundle (`_ds_bundle.js`, `readme.md`, token CSS) — its readme documents **private** founder repositories and internal surfaces (CRM, cockpit app); not suitable for a public export.

Instead, `index.html` was re-implemented as a self-contained gallery (vanilla HTML/CSS/JS, no
frameworks, no external CDNs, no network calls) that reproduces the studio look. Secret/credential,
local-path, and external-URL scans of all added assets returned clean (the only `token`/`secret`
string matches were the design-token CSS filenames and app copy such as "without ever writing the
secret into the app").

### Added files

- `index.html` — sha256-prefix `46c951595bd4de77`
- `screenshots/day-01.jpg` — sha256-prefix `6390ceb5d68f85ab`
- `screenshots/day-02.jpg` — sha256-prefix `c1aeedb7e34a96f1`
- `screenshots/day-03.jpg` — sha256-prefix `94a2ec16070f9c9d`
- `screenshots/day-04.jpg` — sha256-prefix `3e748cc6589c46b3`
- `screenshots/day-05.jpg` — sha256-prefix `10c2b6d7ac40a8bb`
- `screenshots/day-06.jpg` — sha256-prefix `1e4e84feb0e0f95f`
- `screenshots/day-07.jpg` — sha256-prefix `5b0ff6988676023f`
- `screenshots/day-08.jpg` — sha256-prefix `0308587a041f7a5f`
- `screenshots/day-09.jpg` — sha256-prefix `154404f6289648d0`
- `screenshots/day-10.jpg` — sha256-prefix `6676cd89e2621470`
- `screenshots/day-11.jpg` — sha256-prefix `530a6f654dd101dd`
- `screenshots/day-12.jpg` — sha256-prefix `7dda6ac4c69ba76b`
- `screenshots/day-13.jpg` — sha256-prefix `972dc4a2261d4305`
- `screenshots/day-14.jpg` — sha256-prefix `6325dfa56f1a63a7`
- `screenshots/day-15.jpg` — sha256-prefix `db19f7a360f0bfff`
- `screenshots/day-16.jpg` — sha256-prefix `2f2cd58e4b7d1bd4`
- `screenshots/day-17.jpg` — sha256-prefix `0a866cf3ec5daf26`
- `screenshots/day-18.jpg` — sha256-prefix `40e1bceb50e23fea`
- `screenshots/day-19.jpg` — sha256-prefix `af73ae5eb8038083`
- `screenshots/day-20.jpg` — sha256-prefix `84dd0fbbc671762a`

## Summary

- Apps processed: 20
- Apps clean for public static export: 20
- Apps blocked: 0

| Day | App | Status | Notes |
|---:|---|---|---|
| 01 | Pilot Forge | clean | No secrets, external network calls, private paths, dangerous JS primitives, or backend/bridge files in curated export. |
| 02 | Lead Leak Radar | clean | No secrets, external network calls, private paths, dangerous JS primitives, or backend/bridge files in curated export. |
| 03 | Owner Report Studio | clean | No secrets, external network calls, private paths, dangerous JS primitives, or backend/bridge files in curated export. |
| 04 | Approval Gate Desk | clean | No secrets, external network calls, private paths, dangerous JS primitives, or backend/bridge files in curated export. |
| 05 | Quote Chase Board | clean | No secrets, external network calls, private paths, dangerous JS primitives, or backend/bridge files in curated export. |
| 06 | Review Request Composer | clean | No secrets, external network calls, private paths, dangerous JS primitives, or backend/bridge files in curated export. |
| 07 | Technician Brief Builder | clean | No secrets, external network calls, private paths, dangerous JS primitives, or backend/bridge files in curated export. |
| 08 | Service Triage Flow | clean | No secrets, external network calls, private paths, dangerous JS primitives, or backend/bridge files in curated export. |
| 09 | Warm Outreach Lab | clean | No secrets, external network calls, private paths, dangerous JS primitives, or backend/bridge files in curated export. |
| 10 | Pilot Pricing Calculator | clean | No secrets, external network calls, private paths, dangerous JS primitives, or backend/bridge files in curated export. |
| 11 | Local Biz Snapshot | clean | No secrets, external network calls, private paths, dangerous JS primitives, or backend/bridge files in curated export. |
| 12 | Script Rehearsal Room | clean | No secrets, external network calls, private paths, dangerous JS primitives, or backend/bridge files in curated export. |
| 13 | Proof Vault | clean | No secrets, external network calls, private paths, dangerous JS primitives, or backend/bridge files in curated export. |
| 14 | SOP Builder | clean | No secrets, external network calls, private paths, dangerous JS primitives, or backend/bridge files in curated export. |
| 15 | Daily Cash Board | clean | No secrets, external network calls, private paths, dangerous JS primitives, or backend/bridge files in curated export. |
| 16 | Meeting Follow-up Kit | clean | No secrets, external network calls, private paths, dangerous JS primitives, or backend/bridge files in curated export. |
| 17 | Credential Handoff Checklist | clean | No secrets, external network calls, private paths, dangerous JS primitives, or backend/bridge files in curated export. |
| 18 | Content Repurposer | clean | No secrets, external network calls, private paths, dangerous JS primitives, or backend/bridge files in curated export. |
| 19 | Home Service Route Planner | clean | No secrets, external network calls, private paths, dangerous JS primitives, or backend/bridge files in curated export. |
| 20 | Intake Form Builder | clean | No secrets, external network calls, private paths, dangerous JS primitives, or backend/bridge files in curated export. |

## File hashes

### Day 01 — Pilot Forge

- `apps/day-01-pilot-forge/README.md` — sha256-prefix `ead747e8df01fa80`
- `apps/day-01-pilot-forge/app.js` — sha256-prefix `2f0d7dabff9b4056`
- `apps/day-01-pilot-forge/index.html` — sha256-prefix `abd97728953a979e`
- `apps/day-01-pilot-forge/styles.css` — sha256-prefix `635e1e4ac54954f8`
### Day 02 — Lead Leak Radar

- `apps/day-02-lead-leak-radar/README.md` — sha256-prefix `574d31476f2c45c3`
- `apps/day-02-lead-leak-radar/app.js` — sha256-prefix `d6d93f1f8cfa95b7`
- `apps/day-02-lead-leak-radar/index.html` — sha256-prefix `564b13a82885f957`
- `apps/day-02-lead-leak-radar/styles.css` — sha256-prefix `1d1724e3e624441e`
### Day 03 — Owner Report Studio

- `apps/day-03-owner-report-studio/README.md` — sha256-prefix `35ae3c12db363af2`
- `apps/day-03-owner-report-studio/app.js` — sha256-prefix `12242d8e306c5094`
- `apps/day-03-owner-report-studio/index.html` — sha256-prefix `3e9a3ed8be934a0e`
- `apps/day-03-owner-report-studio/styles.css` — sha256-prefix `58e27b1a665ccdcc`
### Day 04 — Approval Gate Desk

- `apps/day-04-approval-gate-desk/README.md` — sha256-prefix `6e351c9953dfacde`
- `apps/day-04-approval-gate-desk/app.js` — sha256-prefix `f542930a2c1cfbf8`
- `apps/day-04-approval-gate-desk/index.html` — sha256-prefix `fa85752273747628`
- `apps/day-04-approval-gate-desk/styles.css` — sha256-prefix `455046ebacfc8c1c`
### Day 05 — Quote Chase Board

- `apps/day-05-quote-chase-board/README.md` — sha256-prefix `51b6cd8791807a5d`
- `apps/day-05-quote-chase-board/app.js` — sha256-prefix `965fbb8efe99171d`
- `apps/day-05-quote-chase-board/index.html` — sha256-prefix `5b62945236f74521`
- `apps/day-05-quote-chase-board/styles.css` — sha256-prefix `2bb5d7cfa00e2c47`
### Day 06 — Review Request Composer

- `apps/day-06-review-request-composer/README.md` — sha256-prefix `bf3997f497d904df`
- `apps/day-06-review-request-composer/app.js` — sha256-prefix `d72a8dea2701d948`
- `apps/day-06-review-request-composer/index.html` — sha256-prefix `277777d52d5845db`
- `apps/day-06-review-request-composer/styles.css` — sha256-prefix `5552f5f3bd7942a1`
### Day 07 — Technician Brief Builder

- `apps/day-07-technician-brief-builder/README.md` — sha256-prefix `c40cb1f17a696394`
- `apps/day-07-technician-brief-builder/app.js` — sha256-prefix `34631d2c26ba6586`
- `apps/day-07-technician-brief-builder/index.html` — sha256-prefix `36e0aa41ed15d700`
- `apps/day-07-technician-brief-builder/styles.css` — sha256-prefix `faee29b9247adc53`
### Day 08 — Service Triage Flow

- `apps/day-08-service-triage-flow/README.md` — sha256-prefix `4abe779d46ab1a2d`
- `apps/day-08-service-triage-flow/app.js` — sha256-prefix `83a11f8286f92159`
- `apps/day-08-service-triage-flow/index.html` — sha256-prefix `28fd5e0ca657fe14`
- `apps/day-08-service-triage-flow/styles.css` — sha256-prefix `910037753f8dad33`
### Day 09 — Warm Outreach Lab

- `apps/day-09-warm-outreach-lab/README.md` — sha256-prefix `8bc210375f190e1f`
- `apps/day-09-warm-outreach-lab/app.js` — sha256-prefix `298b4ee0cb583f43`
- `apps/day-09-warm-outreach-lab/index.html` — sha256-prefix `9060741e10dddef9`
- `apps/day-09-warm-outreach-lab/styles.css` — sha256-prefix `14ce76955292c5c3`
### Day 10 — Pilot Pricing Calculator

- `apps/day-10-pilot-pricing-calculator/README.md` — sha256-prefix `49411354ada14a22`
- `apps/day-10-pilot-pricing-calculator/app.js` — sha256-prefix `b9a8d2cfe0b2af21`
- `apps/day-10-pilot-pricing-calculator/index.html` — sha256-prefix `636eaa7c322de112`
- `apps/day-10-pilot-pricing-calculator/styles.css` — sha256-prefix `130680ae93bfaf79`
### Day 11 — Local Biz Snapshot

- `apps/day-11-local-biz-snapshot/README.md` — sha256-prefix `bd5f8a416b981941`
- `apps/day-11-local-biz-snapshot/app.js` — sha256-prefix `3e74a547b8aab191`
- `apps/day-11-local-biz-snapshot/index.html` — sha256-prefix `b7e099d2dfb9d02c`
- `apps/day-11-local-biz-snapshot/styles.css` — sha256-prefix `0572f58d30b68b46`
### Day 12 — Script Rehearsal Room

- `apps/day-12-script-rehearsal-room/README.md` — sha256-prefix `8b3df54e1af323fe`
- `apps/day-12-script-rehearsal-room/app.js` — sha256-prefix `e177236ce445bbed`
- `apps/day-12-script-rehearsal-room/index.html` — sha256-prefix `af1065678a7fbd0c`
- `apps/day-12-script-rehearsal-room/styles.css` — sha256-prefix `593b899331599936`
### Day 13 — Proof Vault

- `apps/day-13-proof-vault/README.md` — sha256-prefix `7771cbcd8c0505fe`
- `apps/day-13-proof-vault/app.js` — sha256-prefix `da38c4210edf6f3f`
- `apps/day-13-proof-vault/index.html` — sha256-prefix `87dd04fc351a4df0`
- `apps/day-13-proof-vault/styles.css` — sha256-prefix `e583b46779dc2228`
### Day 14 — SOP Builder

- `apps/day-14-sop-builder/README.md` — sha256-prefix `3a5995a206461868`
- `apps/day-14-sop-builder/app.js` — sha256-prefix `142a1398167f6896`
- `apps/day-14-sop-builder/index.html` — sha256-prefix `6ca7fd37c2628e70`
- `apps/day-14-sop-builder/styles.css` — sha256-prefix `ee0b57a29541bbb0`
### Day 15 — Daily Cash Board

- `apps/day-15-daily-cash-board/README.md` — sha256-prefix `ee2ba946fc690edd`
- `apps/day-15-daily-cash-board/app.js` — sha256-prefix `fb321c927ba43818`
- `apps/day-15-daily-cash-board/index.html` — sha256-prefix `42d3327ad9c30bc7`
- `apps/day-15-daily-cash-board/styles.css` — sha256-prefix `866f4bbae0b28f96`
### Day 16 — Meeting Follow-up Kit

- `apps/day-16-meeting-follow-up-kit/README.md` — sha256-prefix `16c44275f2cf9427`
- `apps/day-16-meeting-follow-up-kit/app.js` — sha256-prefix `2f98fdae31993a1e`
- `apps/day-16-meeting-follow-up-kit/index.html` — sha256-prefix `a9edb992700d4397`
- `apps/day-16-meeting-follow-up-kit/styles.css` — sha256-prefix `bba2107d557291ac`
### Day 17 — Credential Handoff Checklist

- `apps/day-17-credential-handoff-checklist/README.md` — sha256-prefix `2f31406967d9332b`
- `apps/day-17-credential-handoff-checklist/app.js` — sha256-prefix `d1b7b1fc2fb4c6ef`
- `apps/day-17-credential-handoff-checklist/index.html` — sha256-prefix `b0581064869a94d7`
- `apps/day-17-credential-handoff-checklist/styles.css` — sha256-prefix `274acb7cf9768b59`
### Day 18 — Content Repurposer

- `apps/day-18-content-repurposer/README.md` — sha256-prefix `c47f8322c8343522`
- `apps/day-18-content-repurposer/app.js` — sha256-prefix `3946a9b5415dbd00`
- `apps/day-18-content-repurposer/index.html` — sha256-prefix `0070a58153562b7a`
- `apps/day-18-content-repurposer/styles.css` — sha256-prefix `0592b65296d0b2be`
### Day 19 — Home Service Route Planner

- `apps/day-19-home-service-route-planner/README.md` — sha256-prefix `7c5c1df1e9e0d486`
- `apps/day-19-home-service-route-planner/app.js` — sha256-prefix `9de14547358ab170`
- `apps/day-19-home-service-route-planner/index.html` — sha256-prefix `8a88c056451e1043`
- `apps/day-19-home-service-route-planner/styles.css` — sha256-prefix `60e0a98d1df76242`
### Day 20 — Intake Form Builder

- `apps/day-20-intake-form-builder/README.md` — sha256-prefix `ca53bc9efdfa4c74`
- `apps/day-20-intake-form-builder/app.js` — sha256-prefix `4035f0d33916fc6c`
- `apps/day-20-intake-form-builder/index.html` — sha256-prefix `485cd16365c1d804`
- `apps/day-20-intake-form-builder/styles.css` — sha256-prefix `7dc670643676a448`

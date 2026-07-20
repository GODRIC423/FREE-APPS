# BizDev 30 — monetizable business-development apps

Thirty single-purpose business-development tools, each built as a **single self-contained HTML file** (React 19 + Tailwind CSS 4 + Lucide icons, bundled — no CDN, no network at runtime) with full custom graphics and its own visual identity.

**The operating model:** everything runs on a **$20/month Claude subscription plus free tools** — nothing else to buy, no API keys. Each app includes a **Claude Copilot** panel that packages your working data into expert prompts you paste into [claude.ai](https://claude.ai). The app does the structure, storage, math, and exports; Claude does the thinking.

**The business model:** every app is designed to be **sold independently**. Each ships with:

- `GUIDE.md` — a step-by-step instruction guide from first open to exported artifact.
- `MONETIZE.md` — a per-app sales playbook: who buys it, positioning options, suggested pricing, free-to-start sales channels (Gumroad, Lemon Squeezy, Ko-fi, Payhip), a launch checklist, and upsell paths.

## Run

Open [`index.html`](index.html) for the catalog, or open any `apps/<slug>/index.html` directly — each app is fully self-contained and works offline. To serve the whole repo:

```bash
python3 -m http.server 8000
```

## Rebuild from source

Each app's React source lives in `apps/<slug>/src/`. To rebuild:

```bash
cd bizdev-30
npm install
node build-app.mjs <slug>     # one app
node build-app.mjs --all      # everything
```

## The catalog

| # | App | Purpose |
| --- | --- | --- |
| 01 | ICP Architect | Define & score Ideal Customer Profiles; rank prospects against a weighted fit matrix |
| 02 | Cold Email Forge | Cold email sequences with merge fields, spam/length lint, subject A/B |
| 03 | Discovery Call Copilot | Question banks, live call sheet, post-call scorecards |
| 04 | Proposal Studio | Service proposals: section library, pricing tables, print-perfect output |
| 05 | Case Study Factory | Client wins → case studies with interview capture and consent tracking |
| 06 | Battlecard Bay | Competitor battlecards with objection counters and live quick-draw mode |
| 07 | Partner Pipeline | Channel partnerships: fit scoring, lanes, co-marketing ideas |
| 08 | Referral Engine | Referral program design + weekly ask queue with scripts |
| 09 | LinkedIn Cadence Planner | BD content calendar, hook bank, drafts with counters |
| 10 | Lead Magnet Lab | Score magnet concepts, outline the winner, draft landing copy |
| 11 | Pricing Bench | Good/better/best packaging with margin math and price-test log |
| 12 | Objection Dojo | Spaced-repetition objection drills with confidence heat |
| 13 | Cadence Composer | Multi-channel follow-up sequences on a visual timeline |
| 14 | Deal Qualifier | MEDDICC-style qualification with gap flags and honest scores |
| 15 | Territory Mapper | Segments, verticals, account tiers, coverage math |
| 16 | Outreach A/B Journal | Message experiments with reply-rate math and verdicts |
| 17 | Event Prep Kit | Event target lists, talk tracks, day-of cards, follow-up queue |
| 18 | Testimonial Harvester | Social-proof pipeline with rights checklist and proof wall |
| 19 | Narrative Deck Builder | Sales story beats before slides; outline export |
| 20 | Win/Loss Ledger | Deal post-mortems and the patterns behind them |
| 21 | Meeting ROI Auditor | Meeting cost vs pipeline impact; keep/shrink/kill/async |
| 22 | Champion Tracker | Stakeholder influence×support mapping per account |
| 23 | RFP Answer Vault | Reusable answer library with freshness and assembly |
| 24 | Niche Validator | Niche scoring: pain, budget, reachability, competition, edge |
| 25 | Service Productizer | Custom work → fixed-scope offers with scope-creep lint |
| 26 | Renewal Radar | Client health, renewal timelines, save-plays |
| 27 | Expansion Matrix | Whitespace grid of accounts × offers |
| 28 | Conference ROI Planner | Event decisions with cost model + expected-pipeline math |
| 29 | Traction Bullseye | Channel experiments to your first 100 customers |
| 30 | BD Command Deck | Weekly BD scorecard: targets, waterfall, review ritual |

## Boundaries

- All data stays in the browser (localStorage) with JSON export/import. No accounts, no tracking, no backend.
- Claude Copilot features generate prompts for you to paste into claude.ai — the apps never call any API themselves.
- Outputs are drafts for human review before customer-facing use.

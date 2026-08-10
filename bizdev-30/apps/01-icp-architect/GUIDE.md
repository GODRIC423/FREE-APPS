# ICP Architect — Step-by-Step Guide

ICP Architect is a drafting studio for Ideal Customer Profiles. You draw each profile as a working "sheet" — firmographics, pains, buying triggers, disqualifiers — then define weighted fit criteria and measure real prospects against the sheet, criterion by criterion. The result is a ranked, honest prospect list that tells you where to spend Monday morning. It is built for founders, consultants, agencies, and BD/sales leads who want to qualify on evidence instead of vibes. Everything runs in your browser; nothing leaves your machine.

## Getting started

Open `apps/01-icp-architect/index.html` directly in any modern browser — it is fully self-contained (fonts, styles, and code are all inlined). Alternatively, serve the repository root with any static server and navigate to the same path. No install, no account, no network.

## Walkthrough

1. **First open.** The "How to use the studio" guide appears automatically on your first visit. Close it with `Esc` or the button; reopen anytime with `?` or the **How to use** header button.
2. **Load the demo (recommended).** Click **Load demo** in the header. You get two finished sheets (a SaaS RevOps profile and a post-acquisition CRM consolidation profile) and nine surveyed prospects — a complete picture of the app "done well". Reset from the header when you want a blank studio.
3. **Draft a sheet.** On tab **A · Drafting Table**, click **New sheet**. Give it a sheet number (e.g. `SHT-01`), a profile name, and a one-line thesis a stranger could verify from the outside.
4. **Fill the four blocks.** Firmographics (industry, headcount, revenue band, geography, business model, stack signals); Pains (what hurts, in the buyer's words); Buying triggers (observable "why now" events); Disqualifiers (the red-pencil list — if any line is true, walk away).
5. **Define fit criteria and weights.** In section 05, add 5–8 *verifiable* checks and weight each 1–5 (5 = load-bearing wall, 1 = trim). Reorder with the arrow buttons; strike with the trash icon (an Undo toast appears for ~7 seconds).
6. **Log prospects.** Switch to **B · Site Survey** and click **Log prospect**. Name the company, add its domain, and choose which sheet it is measured against.
7. **Score, 0 to 3.** In the survey field card, rate each criterion: 0 miss, 1 partial, 2 solid, 3 exact (click a selected rating again to clear it). The weighted fit (0–100), tier stamp (A ≥ 75, B ≥ 55, C ≥ 35, D below), and coverage update live. Tick **Disqualified** to strike a company from the ranking regardless of score, and record which disqualifier it tripped.
8. **Read the ranking honestly.** The survey ranks by weighted fit with disqualified entries at the bottom. Scores computed from less than 60% of criteria carry a `LOW` coverage flag — treat those as rumors, not measurements. Filter by sheet, tier, or search (`/`), and sort by fit, recency, or name.
9. **Consult Claude.** On tab **C · Claude Copilot**, pick a sheet and use the three actions — **Site investigation** (deep research: market map, watering holes, monitorable trigger signals, message angles), **Red-pen review** (a ruthless critique that rewrites your sheet), and **Twenty lookalikes** (named companies to investigate, calibrated on your scored prospects). Each writes a complete prompt with your live data serialized inside. Click **Copy prompt**, paste it into claude.ai — it works with the standard $20 Claude subscription, no API key needed. Paste the useful parts of Claude's answer into the **Findings ledger**; it saves with the sheet.
10. **Export the drawings.** The **Export** menu offers: Copy Markdown portfolio (all sheets + ranked surveys), Download JSON (full state), Download prospects CSV, Import JSON, and Print active sheet (a clean, print-styled artifact). `Ctrl/Cmd+S` copies the markdown portfolio from anywhere.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `?` | Open the how-to guide |
| `Esc` | Close menus, drawers, and dialogs |
| `Ctrl / Cmd + S` | Copy the markdown portfolio to the clipboard |
| `/` | Focus search on the Site Survey |
| `Enter` | Commit a new list entry (pains, triggers, disqualifiers) |

## Your data & privacy

All data lives in your browser's localStorage under the key `bizdev:01-icp-architect:v1`. Nothing is sent anywhere — the app makes zero network requests. Use **Export → Download JSON** for backups or to move machines, and **Export → Import JSON** to restore. Clearing browser site data erases the studio, so export before you clean.

## Pro tips

- **Two sheets beat six.** Keep profiles few and sharp; if a sheet describes two different buyers, split it and let the scores settle the argument.
- **Write criteria you can verify from outside.** "Values quality" is unscoreable; "hired a VP Sales in the last 2 quarters" is a LinkedIn search.
- **Let disqualifiers do the heavy lifting.** A 90-fit company that trips a disqualifier is a distraction with good firmographics. Strike it and note why.
- **Run the Red-pen review before your first outreach batch,** not after. Ten minutes of critique saves a hundred bad emails.
- **Re-score quarterly.** Fit drifts — a Tier A prospect that raised, hired, and migrated CRMs six months ago is a different company now.

## Troubleshooting

- **The help dialog doesn't open with `?`** — click into empty page space first; the shortcut is ignored while you are typing in a field.
- **Copy buttons do nothing** — some browsers block the clipboard on `file://` pages. The app falls back automatically; if it still fails, use **View** on a prompt and copy from the textarea manually.
- **My import was rejected** — the file must be a JSON previously exported by this app (or matching its shape). Open it and check it contains `"icps"` and `"prospects"` arrays.
- **A prospect shows `UNFILED`** — its sheet was deleted. Open the prospect and assign a sheet in the field card; the ratings for matching criterion IDs are preserved.
- **Scores look too generous** — check coverage. With only 2 of 8 criteria rated, the score is computed over what's rated and flagged `LOW`; rate the rest before trusting it.

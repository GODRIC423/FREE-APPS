# RFP Answer Vault — Monetization Notes

## Who buys it

Small-to-mid B2B services and software teams who answer RFPs, RFIs, or security questionnaires without dedicated proposal-management software (think Responsive/RFPIO, which run $15-40k/year and require a sales process to even get a quote). The buyer is usually a solo proposal manager, a sales engineer who got stuck owning "the RFP folder," or a founder/ops lead at a 5-50 person agency or SaaS company who just lost three days to an RFP that repeated last quarter's questions almost verbatim. The pain is concrete: canonical answers live scattered across old Word docs and Slack DMs, nobody knows which answer is still accurate, and every RFP starts from a blank page instead of a search bar.

## Positioning

1. "The RFP answer library your last three proposals should have shared, but didn't."
2. "Stop rewriting the same answer. Search it, adapt it, ship it."
3. "A vault, not a Word doc graveyard — every answer has an owner, a verified date, and a staleness warning before it embarrasses you."

## Suggested pricing

$29-$49 one-time for the single-user license. This sits comfortably below "another SaaS subscription to justify" for a solo buyer while reflecting that it replaces a genuinely painful, recurring task. A simple two-tier structure works well:
- **Standalone ($29-$39):** the self-contained HTML file, single-user license.
- **Team pack ($79-$99):** same file plus a short setup walkthrough (video or doc) covering shared JSON handoff between teammates, since the app has no built-in multi-user sync.

No recurring fee is appropriate here — there's no server cost to the buyer and no ongoing hosting on your end, which is also the honest pitch: "you own this file forever, no subscription."

## Where to sell — free-to-start marketplaces

- **Gumroad** — best fit for a single polished HTML deliverable with a demo screenshot/GIF; strong for direct, no-fee-until-sale listings.
- **Lemon Squeezy** — similar to Gumroad, handles tax/VAT automatically, good if you plan to sell internationally.
- **Payhip** — simple digital-download storefront, low friction for a $29-$49 one-time product.
- **Ko-fi Shop** — works if you already have an audience there (e.g. from BD/sales content), lower discovery otherwise.

## Launch checklist

1. Record a 60-90 second screen capture: load the demo vault, click a drawer to filter, assemble a response by picking three questions from the vault, show a stale-answer warning, then open Copilot and copy a prompt. This is the whole pitch in one clip.
2. Take 3-4 static screenshots: the vault grid with the cabinet hero, an answer's freshness badges (fresh/aging/stale side by side), the assembler with the gap list visible, and the Copilot drawer with a generated prompt.
3. Write landing copy anchored on the pain, not the features: "You've answered this exact question before. Where is it?" — then show the search-first vault as the answer.
4. Post in communities where proposal/RFP pain is common: r/sales, r/msp (for MSPs who eat security questionnaires constantly), Indie Hackers, and any Slack/Discord communities for fractional sales ops or agency operators.
5. Reach out directly to 5-10 people in your network who've complained about an RFP in the last month — a direct DM with the demo GIF converts far better than a cold marketplace listing at this price point.
6. Cross-list on Gumroad and Lemon Squeezy simultaneously; keep pricing identical across both to avoid confusion.
7. Add it to any "sales/BD tools" roundup posts or directories you can find (there are several low-effort submission directories for indie tools) — cheap, evergreen discovery.

## Upsell paths

- **Vault setup service** — offer to interview a buyer for 60-90 minutes and populate their first 20-30 canonical answers for them ($150-$300 flat), which also doubles as a natural upsell conversation once they've bought the tool and felt the empty-vault problem.
- **Industry starter packs** — pre-written canonical-answer sets for common verticals (SaaS security questionnaires, healthcare/HIPAA vendor RFPs, government/public-sector RFPs) sold as JSON import files at $19-$39 each; low marginal cost once written once, high perceived value to a buyer starting from zero.
- **Niche editions** — a re-skinned edition tuned for a specific buyer type (e.g. an "MSP Security Questionnaire Vault" with categories pre-set for the SOC 2 / cyber-insurance questions MSPs answer constantly) sold as its own listing at the same price point.

## License note

Buyers get the single self-contained `index.html` file (or the source `src/` folder if you choose to include it) under a single-user license: one person, unlimited personal use, no resale or redistribution of the file itself. Make clear in the listing that there is no cloud sync or multi-user login built in — data lives in that user's browser via localStorage, with manual JSON export/import as the backup and sharing mechanism. State plainly that this is a one-time purchase with no guaranteed future updates, though offering goodwill bug fixes for major issues is reasonable and builds trust for repeat/team sales.

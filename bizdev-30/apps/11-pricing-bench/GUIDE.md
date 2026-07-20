# Pricing Bench — Step-by-Step Guide

Pricing Bench is a workshop for engineering service pricing: build a good/better/best package ladder, read true margins on dial gauges, log every price you quote as a test, and pick the value metric your price scales on. It is for consultants, agencies, and productized-service founders who currently price by gut feel and quiet discounting.

## Getting started

Open `apps/11-pricing-bench/index.html` in any modern browser — it is fully self-contained (no install, no internet, no account). Or serve the repo root with any static server and browse to the same path. Everything you type stays in your browser.

## Walkthrough

1. **First open** — the "How to use" guide appears automatically. Close it with Esc; reopen any time with `?` or the How to use button.
2. **Load the demo** — click **Load demo** in the header to see a fully worked bench: a dashboard-analytics service with a Toolbox / Workbench / Master Shop ladder, gauge readings, six logged price tests, and scored value metrics. Edit anything; it is your copy now.
3. **Name the work** — on the **Package Bench** tab, fill in the service, one-line promise, and ICP. These flow into every export and Copilot prompt.
4. **Build the ladder** — **Add package** (up to four). For each: name, tagline, price + unit, and the included features (add, edit inline, reorder with the arrows, delete with undo). Reorder whole packages with the left/right arrows.
5. **Set anchor and lead** — mark your highest tier as **Anchor** (its job is to make the middle price feel sane) and the tier most buyers should pick as **Lead**. The **bench check** panel inspects ladder count, step-up ratios, anchor placement, lead placement, and thin margins. Write your anchor rationale in the note — it exports with the sheet.
6. **The price ruler** — the hero graphic at the top plots every priced package on a measured ruler, with anchor and lead flagged. If your rungs are bunched together, you will see it instantly.
7. **Read the gauges** — on **Margin Gauges**, enter delivery hours, loaded hourly rate, and hard costs per package. Each dial shows true margin (red under 30%, brass 30–60%, green above), plus delivery cost, gross profit, and effective $/hour.
8. **Log every quote** — on **Price Test Log**, record each price you said out loud: date, package, price, segment, outcome (Accepted / Negotiated / Rejected / No decision), and what happened. The stat plates show accept rate — an accept rate near 100% is the bench telling you to raise — and the bars show acceptance by package. Export the log as CSV.
9. **Pick the value metric** — on **Value Metric**, add candidates (or **Add the classics** for five common ones) and score each 1–5 on: tracks value delivered, easy to measure and bill, predictable for the buyer, scales with your cost. Put the winner "on the bench".
10. **Bring in Claude** — in the **Claude Copilot** rail, pick an action (packaging structures, pricing stress-test, pricing-page copy, next price test). **Copy prompt** packs your entire bench state into a complete prompt; paste it into claude.ai (works with the standard $20 Claude subscription). Save the answer in the "Paste Claude's answer back" box — it persists with your bench.
11. **Export the artifact** — **Export** menu: Copy Markdown sheet (the full pricing sheet), Download JSON (complete state backup), Import JSON (restores a backup, with undo), Test log CSV. Printing the page produces a clean black-and-white spec sheet of packages, margins, metrics, and the test log.

## Keyboard shortcuts

| Key | Action |
|---|---|
| `?` | Open the How to use guide |
| `Esc` | Close dialogs and menus |
| `Ctrl/Cmd + S` | Copy the pricing sheet as Markdown |

## Your data & privacy

All data lives in your browser's localStorage under `bizdev:11-pricing-bench:v1`. Nothing is sent anywhere — there is no network traffic at all. Download JSON regularly as a backup; Import JSON restores it on any machine.

## Pro tips

- Price the middle first. Decide what the Lead package must earn, then build the entry rung down and the anchor up from it (roughly 0.5x and 2x).
- Log the flinch, not just the outcome. "Paused three seconds, then asked about annual billing" is more useful next quarter than "negotiated".
- Never let a gauge idle in the red. If a package can't clear 30% margin at a price the market accepts, cut scope — don't donate hours.
- Re-run the "Stress-test pricing" Copilot action after every five logged tests; it reads your log like data.
- Use the anchor note as policy: write down what you will never discount, so future-you can't improvise.

## Troubleshooting

- **The guide won't reopen with `?`** — click anywhere on the page first (a focused text field captures the keystroke), or use the How to use button.
- **Copy buttons do nothing** — some browsers block clipboard access on `file://` pages. Use the Export menu's Download JSON, or open the app via a local static server.
- **My data vanished** — localStorage is per-browser and per-profile, and clearing site data wipes it. Import your last JSON backup; if you had none, Load demo and rebuild (then start exporting JSON).
- **Import fails silently** — the file must be JSON exported by Pricing Bench (or shaped like it). The importer sanitizes unknown fields; a completely different JSON file yields an empty bench, which Undo reverses.
- **Print shows the app UI instead of the sheet** — make sure you print the page itself (Ctrl/Cmd+P), not a screenshot; background graphics off is fine, the sheet is ink-friendly by design.

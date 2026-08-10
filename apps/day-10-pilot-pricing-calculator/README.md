# Pilot Pricing Calculator

Price an AI pilot from recovered value, effort, and risk — and get a defensible floor–target–ceiling range with the full formula visible.

- **Value-based range with a visible breakdown** — every step from monthly leads to the recommended price is shown in a live formula table, plus deal-health flags (weak buyer ROI, floor above anchor, oversized scope).
- **Sensitivity levers** — value capture share, value horizon, delivery risk, proof clarity, and strategic fit, each showing its live multiplier or dollar effect, plus a ±30% recovery-rate scenario table.
- **Three packaging options** — flat pilot fee, monthly during proof, and performance-based (base + share of measured recovery) computed from the same range with expected/downside/upside totals.
- **Pricing memo export** — copy as Markdown, download JSON/CSV, print a clean one-pager, re-import saved scenarios.
- **Local-first** — dark/light theme, autosave to localStorage, demo scenario, keyboard shortcuts, no network.

## Run

Open `index.html` directly, or serve the folder locally:

```bash
python3 -m http.server 8000
```

Then open `/apps/day-10-pilot-pricing-calculator/` in your browser. See [GUIDE.md](./GUIDE.md) for a full step-by-step walkthrough.

## Security boundary

- Static, local-first browser app: only `index.html`, `styles.css`, `app.js`. No build step, no external resources.
- No API keys, tokens, backend, CRM, webhook, payment, or account access of any kind.
- All outputs are **drafts for human review** — this app never creates invoices, sends proposals, signs contracts, or contacts customers.

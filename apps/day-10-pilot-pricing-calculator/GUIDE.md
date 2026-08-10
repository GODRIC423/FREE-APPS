# Pilot Pricing Calculator — Step-by-Step Guide

This app helps consultants, agencies, and automation builders price an AI (or automation) pilot from first principles: what the broken workflow is leaking, what a pilot could plausibly recover, what it costs you to deliver, and how much risk each side carries. Instead of guessing a number, you get a defensible floor–target–ceiling range with the full formula visible, three packaging options computed from the same range, and an exportable pricing memo. Everything runs locally in your browser and every output is a draft for human review.

## Getting started

Open `index.html` directly in any modern browser, or serve the folder locally:

```bash
python3 -m http.server 8000
```

then visit `http://localhost:8000/apps/day-10-pilot-pricing-calculator/`. No install, no account, no network access needed.

## Step-by-step walkthrough

1. **Open the app and read the guide.** On your first visit the "How to use" dialog opens automatically. Close it with the X, `Esc`, or a click outside. You can reopen it any time with the `How to use` button or the `?` key.
2. **Load the demo.** Press `Load demo` in the header. You'll see a worked example — a plumbing company losing 18% of 140 monthly leads at $850 each — and every panel fills in: stats at the top, a formula breakdown, a price range, and three packaging cards. This shows you what "done" looks like before you enter your own numbers.
3. **Describe the pilot (panel 1 — Value model).** Enter the client/pilot name and the specific workflow being fixed. Then enter the value inputs: monthly leads or events, the leak/miss rate (%), the average job value, the expected recovery rate (%), and the proof window in weeks. As you type, the stat strip and all derived panels recompute live. These four numbers drive the "recovered value per month" figure that anchors the whole price.
4. **Enter delivery effort (panel 2 — Delivery effort).** Setup hours, weekly ops hours, and your loaded hourly rate. The readout below shows total effort hours, delivery cost, and your walk-away floor (cost + 15% margin, never below $750). Why it matters: any price below the floor means the pilot loses you money.
5. **Tune the sensitivity levers (panel 3).** Five sliders, each showing its live effect: *Value capture share* (what slice of the value horizon you charge for — typically 10–30%), *Value horizon* (how many months of recovered value the pilot is priced against), *Delivery risk* (adds a contingency premium up to ×1.25), *Proof clarity* (clear, measurable proof supports a higher price, up to ×1.15), and *Strategic fit* (great-fit clients earn a small discount, down to ×0.90). The chips next to each slider show the current dollar or multiplier effect.
6. **Read the formula breakdown (panel 4).** Every step from leads to the recommended target is a row in the table: missed opportunities, recovered value, proof-window value, value anchor, sensitivity adjustment, delivery cost, cost floor, and the final `max(floor, adjusted anchor)`. Below it, **Deal health** flags problems: floor above the value anchor, buyer ROI under 3×, an over-optimistic recovery rate, a too-long proof window, or a scope too heavy to call a pilot.
7. **Check the range and sensitivity (panel 5).** The bar shows the low–high band with the floor tick and target marker. Three cards explain the walk-away floor, recommended target, and stretch ceiling. The sensitivity table re-prices the pilot if the recovery rate comes in 30% worse or 30% better than assumed — useful for anticipating "what if it doesn't work that well?" in the sales conversation.
8. **Compare packaging (panel 6).** The same range is wrapped three ways: a **flat pilot fee** (simplest, 50/50 payment split), **monthly during proof** (+10% flexibility premium, with a suggested continuation retainer after proof), and **performance-based** (a base fee covering ~60% of your floor plus a share of measured recovered value, with expected/downside/upside totals). Each card says when it wins and what to watch out for.
9. **Export the memo (panel 7).** `Copy memo (Markdown)` puts the full pricing memo on your clipboard (also `Ctrl/Cmd+S`). `Download JSON` saves the complete state plus derived numbers for re-import later. `Download CSV` exports assumptions and outputs as a spreadsheet-friendly table. `Print memo` produces a clean one-page document. `Import JSON` restores a previously downloaded scenario. `Reset` clears everything (with a 7-second Undo in the toast).

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `?` | Open the how-to-use guide |
| `Esc` | Close the guide dialog |
| `Ctrl/Cmd + S` | Copy the pricing memo as Markdown |

## Your data & privacy

Everything you type stays in this browser's `localStorage` under the key `fable-remake:day-10-pilot-pricing-calculator:v1`. Nothing is sent anywhere — there is no server, no analytics, and no account. Use `Download JSON` to back up or move a scenario between machines, `Import JSON` to restore it, and `Reset` to clear the stored state.

## Tips & good practice

- **Price the value, defend with the cost.** Lead the conversation with recovered value and buyer ROI; keep the cost floor as your private walk-away number, not your opening number.
- **Quote a modest recovery rate.** 20–40% is believable for a first pilot. If the demo-level results show up, the renewal conversation prices itself.
- **Keep the buyer's ROI above 3×.** If the target price gives the buyer less than about 3× the value, expect pushback — improve the value model or lower the capture share.
- **Agree on measurement before performance pricing.** The performance package only works when "recovered value" has an agreed, attributable measurement from day one.
- **Keep pilots pilot-sized.** If effort passes ~80 hours or the window passes 12 weeks, split it into phases — the deal-health panel will flag this.

## Troubleshooting

- **My data disappeared.** localStorage is per-browser and per-profile. Check you're in the same browser/profile and not a private window. Re-import your last JSON export if you have one.
- **The stats show "—".** The price only computes once there's a value model (leads × leak × value × recovery) or delivery effort. Enter those, or press `Load demo`.
- **Copy does nothing.** Some browsers block the clipboard on `file://` pages. The memo textarea is auto-selected as a fallback — press `Ctrl/Cmd+C` — or serve the folder with `python3 -m http.server`.
- **Import fails.** Only JSON files exported by this app (or matching its field names) are accepted; anything else is rejected safely without touching your current inputs.

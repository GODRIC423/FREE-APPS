# Territory Mapper — Step-by-Step Guide

Territory Mapper is a planning bench for anyone who has to decide *where* to sell before deciding *how*: founders doing founder-led sales, fractional sales leaders, agency owners, and small B2B teams. You chart market segments (vertical × company size × geography), size the opportunity in each, put real account names on a tiered ledger (T1 named / T2 clustered / T3 programmatic), and check the whole plan against your actual rep capacity. The map — a hand-drawn-style cartographic chart — shows every segment as an island sized by expected opportunity, and the Surveyor's Verdict tells you where to plant the flag.

## Getting started

Open `apps/15-territory-mapper/index.html` directly in any modern browser — it is fully self-contained (no server, no network, no account). Or serve the repo root with any static server and navigate to the same path.

## Walkthrough

1. **First open.** The "How to use" guide appears automatically on your first visit. Close it with **Esc** or the "To the chart" button; reopen any time with **?** or the header button.
2. **Load the demo.** Click **Load demo** in the header (or the button on the empty map). You get a complete expedition: a data consultancy with four charted territories, fourteen ledger accounts, and capacity set for two reps. Use it to see what "done well" looks like, then Reset and build your own.
3. **Describe the expedition.** In the panel to the right of the chart, write 2–3 sentences about what you sell, at what price, and who carries accounts. This context is embedded in every Copilot prompt.
4. **Chart a territory.** Click **Chart a territory**. Name it, set vertical / size band / geography, then estimate: addressable accounts, average deal value, and win rate. Expected opportunity = accounts × avg deal × win rate, computed live. Rough numbers are fine — the Copilot's "Survey a segment" action exists to sharpen them.
5. **Read the map.** Each segment rises as an island sized by its share of total opportunity, with contour rings, the account count, and T1 count inscribed. The island with the flag is the surveyor's recommended focus. Click an island to highlight its segment card; use the up/down arrows on cards to reorder; edit or delete from the card (delete gives you a 7-second Undo — nothing is ever confirmed away).
6. **Fill the Account Ledger.** Add real company names with the quick-add row (Enter submits). Assign each to a territory, set an estimated value, and click a tier: **T1** (named, 1:1 pursuit), **T2** (clustered plays), **T3** (programmatic touch). Click an active tier again to untier. Filter by tier, territory, or search; the shown-total updates live.
7. **Check Coverage.** Set reps on territory and per-rep loads for each tier. The three dials show assigned accounts vs available slots (0–150%). A needle past the red 100% tick means that tier is over capacity — cut, demote, or hire.
8. **Run the Claude Copilot.** Pick a territory, then copy one of three prompts — *Survey a segment*, *Tune my tiering rules*, *Draft the vertical value prop*. Paste into [claude.ai](https://claude.ai) — they work with the standard $20 Claude subscription, no API key. Paste Claude's best findings into **Field notes**; they save with your chart and appear in exports.
9. **Export the plan.** The Export menu offers: Copy plan as Markdown (also **Ctrl/Cmd+S**), Download JSON (full state), Download accounts CSV, Import JSON, and Print — the print sheet is a clean one-page Territory Plan.

## Keyboard shortcuts

| Key | Action |
|---|---|
| `?` | Open the guide |
| `Esc` | Close dialogs and menus |
| `Ctrl/Cmd + S` | Copy the Territory Plan as Markdown |
| `Enter` (in account name field) | Add the account |

## Your data & privacy

Everything lives in your browser's localStorage under the key `bizdev:15-territory-mapper:v1`. Nothing is ever sent anywhere — there is no network code in the app. **Download JSON** is your backup; **Import JSON** restores it on any machine. Clearing browser data clears the chart, so export after big planning sessions.

## Pro tips

- **Chart 3–5 territories, not 10.** The map is a focusing tool; if everything is an island, nothing is a destination.
- **Let win rate carry your honesty.** Keep account counts optimistic if you must, but set win rate to what your last 10 deals actually showed.
- **T1 is a budget, not an honor.** If the T1 dial reads over 100%, you are pretending. Demote until the needle sits at ~90%.
- **Re-run "Survey a segment" quarterly** — paste last quarter's actuals into the expedition description first, and Claude's estimates get sharper.
- **Print before pipeline reviews.** The one-page plan sheet ends the "where should we focus" debate faster than any dashboard.

## Troubleshooting

- **The guide won't open with `?`** — click into empty page space first; the shortcut is ignored while you're typing in a field.
- **Copy buttons do nothing** — some browsers block the clipboard on `file://` pages. The app falls back to a hidden-textarea copy; if that also fails, use Export → Download instead.
- **Import fails with "not a valid Territory Mapper JSON"** — the file must be one produced by Download JSON. Open it and check it starts with `{"v":1`. Corrupt or foreign files are rejected safely; your current chart is untouched.
- **My chart vanished** — you may be in a private/incognito window or a different browser profile; localStorage is per-profile. Re-import your last JSON export.
- **An island has no label numbers** — its opportunity is $0. Set accounts, avg deal, and a non-zero win rate on the segment card.

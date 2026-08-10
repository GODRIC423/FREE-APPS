# Local Biz Snapshot — Step-by-Step Guide

Local Biz Snapshot turns your own research on a local business into a structured prospect dossier: who the business is, where its leads most likely leak (with evidence-based likelihood scores), which small "wedge" offer to lead with, and the single human next step. It is built for freelancers, agencies, and consultants who scout local businesses and want a disciplined, draft-only way to decide who to approach first. Nothing is scraped or sent anywhere — you enter what you personally observed, and every output is a draft for human review.

## Getting started

Open `index.html` directly in any modern browser, or serve the folder locally and browse to it:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/apps/day-11-local-biz-snapshot/
```

No install, no accounts. On your very first visit the "How to use" guide opens automatically.

## Step-by-step walkthrough

1. **Load the demo (optional but recommended).** Click **Load demo** in the toolbar. You get a three-prospect pipeline (a plumber, a dental clinic, a landscaper) with different leak profiles, so you can see how scores, recommendations, and the Compare view behave before entering your own data. **Reset** clears everything when you are done exploring.

2. **Create a prospect.** Click **+ New** in the Prospects panel (or press `N`). A blank dossier opens with the name field focused. The name is the only required field — the list, Compare table, and exports all use it, and the field is highlighted inline until you fill it.

3. **Fill the Profile section.** Record only what you can see publicly or were told directly: business type, market/area, contact person, public presence, trust signals, and observed friction. This app never fetches anything — you are the researcher, which keeps every claim in the dossier attributable to something you actually saw.

4. **Check leak signals.** Section 2 lists six common lead leaks (missed calls, slow quotes, form friction, weak proof, unclear booking, manual intake). Each has three observable signals. Check only signals you truly observed; the leak's likelihood badge and meter update live (1 signal = Possible 40%, 2 = Likely 70%, 3 = Very likely 90%). Add an evidence note — a date, a quote, what happened when you called — so the reason survives into the export.

5. **Set the fit sliders.** Revenue upside, proof visibility, and access ease each run 1–10. The fit score (0–100) combines your sliders (up to 60 points) with the leak evidence you recorded (up to 40 points) and lands in a band: **Hot wedge** (75+), **Worth a look** (55+), or **Needs proof**.

6. **Review the wedge recommendation.** The highlighted card recommends the wedge offer that targets your strongest-evidence leak, and says why (which leak, how many signals, its impact weight). Keep the wedge choice on **Auto** to follow the evidence, or override it with the dropdown — the card will tell you if your override disagrees with the evidence. Then write, in your own words, why this wedge fits and the one concrete human next step.

7. **Check the dossier preview.** Section 4 shows exactly what exports and printing will produce: profile, leak likelihoods with reasons, fit breakdown, wedge, next step, and the guardrail line. It updates as you type.

8. **Add more prospects and compare.** Repeat steps 2–7 for each business, then open the **Compare** tab. All prospects are ranked by fit score with their top leak, count of Likely-or-better leaks, wedge, and status. Use **Open** to jump back into any dossier, and **Copy table (Markdown)** to share the ranking.

9. **Export and hand off.** In Export & handoff: **Copy dossier (Markdown)** (`Ctrl/Cmd+S`) copies the active dossier; **Download JSON** saves your full state (re-importable via **Import JSON**); **Download comparison CSV** exports the ranked pipeline for a spreadsheet; **Print dossier** produces a clean one-page document. Every export carries the draft-only guardrail.

10. **Manage the pipeline.** Update each prospect's status (Researching → Dossier ready → Contacted / Parked) as you work. Deleting a prospect shows a 7-second **Undo** toast — no data is lost to a misclick.

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `?` | Open the How to use guide |
| `N` | New prospect |
| `Ctrl/Cmd` + `S` | Copy active dossier as Markdown |
| `Esc` | Close the guide dialog |

## Your data & privacy

Everything you enter lives only in this browser's `localStorage` (key `fable-remake:day-11-local-biz-snapshot:v1`). Nothing is transmitted anywhere — there are no accounts, cookies, analytics, or network calls. **Download JSON** gives you a portable backup you can re-import on any machine; **Reset** permanently clears the stored data after a confirmation.

## Tips & good practice

- **Only check signals you observed.** The likelihood scores are only as honest as your checkboxes. "I assume their form is bad" is not a signal; "the form asked me 9 fields on Tuesday" is.
- **Evidence notes win deals.** A dated, specific note ("called Tue 6:10pm — voicemail after 6 rings") turns a generic pitch into a credible observation the owner can verify.
- **Lead with the smallest wedge.** The recommended wedges are deliberately tiny — a one-week count, a three-field form, a follow-up rhythm. Prove value before proposing anything bigger.
- **Use Compare before outreach.** Rank first, then spend your energy on the top one or two prospects instead of half-researching ten.
- **Respect the guardrail.** Every export says it: verify facts manually and get human approval before contacting a business or making claims.

## Troubleshooting

- **My data disappeared.** localStorage is per browser and per profile. Check you are in the same browser/profile (and not a private window). Restore from a JSON export if you have one.
- **Import JSON fails.** The file must be a JSON export from this app (or its raw state object). If the toast says no prospects were found, the file's structure did not contain a valid `prospects` array.
- **The wedge recommendation is empty.** It appears only once at least one leak signal is checked — the recommendation follows evidence, not vibes.
- **Printing shows the whole page instead of the dossier.** Print from the Dossier view with a prospect selected — the **Print dossier** button does this for you and hides all app chrome automatically.

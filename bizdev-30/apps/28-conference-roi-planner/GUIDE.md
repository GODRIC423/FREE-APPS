# Conference ROI Planner — Step-by-Step Guide

Conference ROI Planner is an aviation-chart-styled decision tool for founders, BD/marketing leaders, and sales teams who are asked to justify conference and trade-show spend — or who are tired of watching the team say yes to every event out of FOMO. You log each candidate event with a full cost model (tickets, travel, booth, loaded time), an expected-pipeline model (conversations → meetings → deals), and a breakeven view, then record a GO / NO-GO decision you can defend. After the event, log the actuals and see the plan-vs-actual variance instantly. Everything runs in one HTML file in your browser — no account, no server, no data leaving your machine.

## Getting started

Open `apps/28-conference-roi-planner/index.html` directly in any modern browser — it is fully self-contained (fonts, icons, and code are all embedded). Alternatively, serve the repo root with any static server and browse to the same path. On first open, the "How the flight plan works" guide appears automatically.

## Walkthrough

1. **Load the demo route.** Click *Load demo* in the header. You get six realistic events spanning every stage — a cleared conference with a strong ROI, a flown trade show with logged actuals, a grounded (no-go) event with a documented reason, a cheap local meetup, a big undecided trade show with a booth, and a small high-ticket summit. Study how wildly different cost structures produce very different verdicts, then *Reset* when ready to build your own log.
2. **Add an event.** Click *New event* (or press `N`) in the Flight Log panel. Name it, set location, category, dates, and how many people are attending, and toggle **Exhibiting** if you're taking a booth — that unlocks the booth cost fields.
3. **Build the cost model.** On the *Cost Model* tab, fill in tickets/passes, flights, hotel, ground transport, meals per diem, booth costs (if exhibiting), and the **loaded day rate** for your team's time — what a selling day is actually worth if this person weren't traveling. The total cost updates live, with a composition bar showing where the money goes.
4. **Model the pipeline.** On the *Pipeline Model* tab, set the conversations you realistically expect across everyone attending, the conversation-to-meeting rate, the meeting-to-deal rate, and your average deal value. The funnel bars and the expected-revenue number update as you move the sliders.
5. **Read the breakeven view.** The *Breakeven & Decision* tab shows the ROI **altitude tape** (a vertical gauge — green is a clear GO, amber is borderline, red trails cost), the cost-vs-expected-revenue **runway bar** with a marked breakeven point, and how many deals or meetings you need just to break even.
6. **Make the call.** Record **Scouting**, **GO**, or **NO-GO**, who decided, and the rationale. The app shows a *suggested call* based on modeled ROI — it's a hint, not a verdict; you own the decision and the paper trail.
7. **Log actuals after the event.** On the *Post-Event Actuals* tab, click *Log actuals now* (this also marks a GO event as **Flown**), then enter what really happened — cost, conversations, meetings, deals, revenue. A plan-vs-actual table appears instantly, color-coded by whether you beat or missed each number.
8. **Use the Claude Copilot prompts.** Click *Claude Copilot* (header) or *Send to Copilot* (inside any dossier). Pick which event's data feeds the prompt, then choose an action:
   - **Build my target list** — turns the event profile into a 20-name target list with a research checklist and booth/session strategy.
   - **Draft pre-event outreach** — LinkedIn, email, warm re-engagement, and follow-up templates sized to the meetings you need to book.
   - **Write the post-event report** — a CFO-trusted readout: headline verdict, plan vs. actual, what worked, what to change, the recommendation.
   - **Pressure-test this business case** — a skeptical CFO stress-tests your assumptions and hands back a blunt GO / HOLD / NO-GO.
   Click *Copy prompt*, then paste it into [claude.ai](https://claude.ai) — it works with the standard $20 Claude subscription, no API key needed. Paste Claude's answer back into the notes box in the Copilot panel — it autosaves with that event.
9. **Ship the flight log.** Use *Export*: copy the full Flight Log as Markdown (`Ctrl/Cmd+S` does the same), download the full state as JSON, download an events CSV for a spreadsheet or board deck, import a previously exported JSON, or print a clean paper log for a budget review.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `?` | Open the guide |
| `N` | New event |
| `Ctrl / Cmd + S` | Copy the flight log as Markdown |
| `← / →` | Previous / next tab in the open dossier |
| `Esc` | Close the open dialog, or deselect the current event |

## Your data & privacy

All data lives in your browser's localStorage under the key `bizdev:28-conference-roi-planner:v1`. Nothing is ever sent anywhere — the app makes zero network requests. **Export JSON regularly** (Export → Download JSON) as your backup; import it on any other machine to restore your flight log. Clearing browser site data wipes it.

## Pro tips

- **Set the loaded day rate honestly.** It's the cost line most teams skip, and it's usually the biggest one for a 2-3 day event with 2+ people traveling. If you don't know your fully-loaded day rate, use `(annual comp + overhead) / ~230 working days` as a starting point.
- **Conversations, not badges scanned.** The pipeline model's "expected conversations" should be real conversations you can hold, not booth foot traffic — inflate this number and every downstream metric lies to you.
- **Use the annual budget field.** Set it once in the portfolio strip; the bar under it turns red the moment your committed (Cleared + Flown) spend crosses the line, before you're mid-quarter and surprised.
- **Log actuals even on grounded events you attended anyway.** The variance table doesn't require a GO status — if plans changed and you went, log it, so next year's decision uses real data instead of a stale forecast.
- **Run the pressure-test prompt before big-ticket events.** For anything with a booth or five-figure ticket cost, paste the pressure-test output into your decision rationale — it's the fastest way to catch an inflated conversion-rate assumption before you commit budget.

## Troubleshooting

- **The ROI shows `∞`.** This means the modeled total cost is $0 (a free local meetup, for instance) while expected revenue is greater than $0 — any pipeline "clears" a free event, so ROI is mathematically unbounded. Add a loaded time cost if you want a finite number to compare against paid events.
- **Breakeven deals/meetings show `—`.** These need an average deal value greater than $0 (and, for breakeven meetings, a meeting-to-deal rate greater than 0%) to divide by. Fill in the Pipeline Model tab.
- **My exported CSV/JSON looks empty after import.** Only files exported from this app's *Download JSON* pass validation; a CSV can't be re-imported (it's one-way, for spreadsheets). If a JSON import silently produces zero events, the file was likely corrupted or edited outside the app — try the original export again.
- **The guide keeps reopening every time I load the app.** This only happens once per browser profile; if it persists, your browser may be blocking localStorage (private/incognito mode with strict settings, or storage cleared on close) — check site data settings.

# Lead Leak Radar — Step-by-Step Guide

Lead Leak Radar helps a local service business (or the consultant auditing one) find every place leads quietly die — missed calls, unanswered forms, stale inboxes, abandoned bookings, unchased quotes, ignored DMs — and puts a monthly dollar figure on each leak. It scores every channel for severity, plots them on a radar so the hottest leaks are impossible to miss, and turns the audit into a prioritized 30-day fix plan you can export as a report. It runs entirely in your browser: no accounts, no tracking, no data leaves your machine.

## Getting started

- Easiest: open `index.html` directly in any modern browser (double-click it).
- Or serve the folder locally and browse to the app path:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/apps/day-02-lead-leak-radar/` in your browser.

On your first visit the "How to use" guide opens automatically. You can reopen it any time with the header button or the `?` key.

## Step-by-step walkthrough

1. **Load the demo (optional but recommended).** Click **Load demo** in the header. You'll see a worked HVAC scenario — five channels, live totals in the stat strip, blips on the radar, and a ranked fix plan. This shows you what a finished audit looks like before you start your own. Click **Reset** (it asks for confirmation) when you're ready to begin fresh.
2. **Fill in the business profile.** Enter the business name and type, then set the two global assumptions: **Close rate %** (of leads that get a real response, how many become paying jobs) and **Recovery rate %** (of the leaked value, how much a realistic fix wins back). Every dollar figure in the app derives from these two numbers, so estimate honestly — the stat strip recalculates as you type.
3. **Add a channel for every place leads arrive.** Pick a type from the dropdown (missed calls, web forms, shared inbox, booking drop-off, sent quotes, social DMs, or custom) and click **+ Add**. Each type arrives pre-filled with sensible defaults and carries its own audit checklist: what to check, the first fix, and the proof metric. Rename the channel to match reality (the name is required — an empty name gets a red outline).
4. **Estimate each channel's five numbers.** Inquiries per week, leak % (the share that never gets a real response), average response delay in hours, average job value in dollars, and confidence % (how much you trust your own estimate). The card instantly shows lost leads/month, $ leak/month, and recoverable $/month, plus a severity badge from Low to Critical.
5. **Read the radar.** Blips closer to the center are hotter leaks (the rings mark the 25/45/65 severity thresholds); blip size reflects the monthly $ leak; color matches the severity badge. Hover a blip for its exact numbers. The stat strip above totals everything: lost leads/month, monthly $ leak, recoverable value, and the overall radar severity score.
6. **Work the prioritized fix plan.** The plan ranks channels by confidence-weighted recoverable dollars per unit of effort — so a cheap fix on a big, well-evidenced leak outranks an expensive fix on a speculative one. **Quick win** chips mark low-effort, high-return fixes. Each entry gives the first fix, the audit check to run before touching anything, and the proof metric that shows whether the fix worked.
7. **Write the owner proof requirement.** In the profile panel, note what evidence the owner needs to believe a fix worked (e.g. "a daily missed-lead list with recovered bookings"). It's printed into every export so the plan ships with its own success criteria.
8. **Export the radar report.** In **Export & handoff**: **Copy Markdown** (also `Ctrl/Cmd+S`) copies the full report shown in the preview; **Download JSON** saves your complete state plus derived numbers (re-importable later via **Import JSON**); **Download CSV** exports the channel table for a spreadsheet; **Print report** produces a clean, chrome-free document for the owner meeting.
9. **Deleting and undoing.** The ✕ on a channel card deletes it and shows a toast with an **Undo** button for 7 seconds — no confirmation dialogs to click through. Reset is the only action that asks first.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `?` | Open the How to use guide |
| `Esc` | Close the guide/dialog |
| `Ctrl/Cmd + S` | Copy the Markdown radar report |

## Your data & privacy

- Everything you enter is stored in your browser's `localStorage` under the key `fable-remake:day-02-lead-leak-radar:v1`. Nothing is sent anywhere — there are no accounts, cookies, analytics, or network requests.
- **Download JSON** creates a portable backup; **Import JSON** restores it (imported files are validated, so a corrupt file can't break the app).
- **Reset** clears the profile and channels from this browser after a confirmation. Clearing your browser's site data has the same effect.

## Tips & good practice

- **Audit before you estimate.** Each channel card's plan entry tells you exactly what to check (call logs, a test form submission, inbox searches). Ten minutes of checking beats an hour of guessing.
- **Use confidence honestly.** A leak you measured from real call logs deserves 85%+; a hunch deserves 40%. The fix plan uses confidence to keep speculative leaks from jumping the queue.
- **Sent quotes are the classic hidden leak.** High job value, long delays, and zero follow-up make quotes a frequent Critical — add that channel even if you think it's fine.
- **Re-scan monthly.** After a fix ships, lower that channel's leak % to what you actually measure and export a fresh report — the before/after is your proof for the owner.
- **Treat the dollar figures as estimates, not promises.** They exist to rank work and size opportunity, not to guarantee revenue.

## Troubleshooting

- **My data disappeared.** localStorage is per browser and per profile — check you're in the same browser/profile (and not a private window). If you exported JSON earlier, use Import JSON to restore.
- **The report preview looks empty.** Add at least one channel — the summary, radar, and plan all derive from channels. Load the demo to verify the app works.
- **Copy does nothing.** Some browsers block the clipboard on `file://` pages; the app falls back automatically, but if it still fails, select the preview text and copy manually — or serve the folder with `python3 -m http.server`.
- **Print shows the whole app instead of the report.** Use the app's **Print report** button (or your browser's print on this page) — the print stylesheet swaps in the clean report automatically. If it doesn't, make sure "background graphics" isn't required and try another browser.

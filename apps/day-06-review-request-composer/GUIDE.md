# Review Request Composer — Step-by-Step Guide

Review Request Composer helps service businesses ask for customer reviews the right way: tied to a real completed job, timed for the prime window, written in a human voice, and checked against do-not-pressure rules before anyone hits send. It is built for owners, office managers, and technicians who want more honest reviews without nagging anyone — everything stays a draft, and every message is sent manually by you from your own phone or email client.

## Getting started

- Open `index.html` directly in any modern browser, or
- Serve the folder locally: `python3 -m http.server 8000`, then visit `http://localhost:8000/`.

No install, no build step, no account. All data lives in your browser's localStorage.

## Step-by-step walkthrough

1. **Load the demo.** Click **Load demo** in the header. You'll see six completed jobs in different states (ready, on hold, already asked, reviewed, an open issue). This shows every feature working before you enter real data. Use **Reset all** (Export & handoff panel) when you're ready to start clean.
2. **Fill the business profile.** In the left rail, enter your business name, your own name (the sender), and the review platform (Google, Yelp, Facebook, Nextdoor, or Other). Every generated draft weaves these in — a review ask from "Sam at Lakeside Plumbing" lands very differently than an anonymous blast.
3. **Add a customer.** Click **+ Add** in the Ask queue. Enter the customer or account name and the completed job. Both fields highlight if left empty — a review ask has to be tied to a real, nameable job.
4. **Log the facts that gate the ask.** Set the completed date (future dates are clamped to today) and the honest satisfaction signal: happy, problem solved, repeat customer, neutral, or had an issue. The timing advisor uses these to decide whether an ask is earned at all.
5. **Add one specific proof detail.** "Install finished a day early and the crew cleaned up the utility room" is what separates a personal thank-you from spam. Leaving it blank triggers a "Generic message" lint warning.
6. **Pick tone and channel.** Choose one of five tone presets (Warm & short, Grateful owner note, Technician handoff, Ultra low-pressure, Professional B2B) and toggle between **SMS** and **Email**. The SMS variant is length-aware — it drops the detail sentence if the message would exceed ~2 segments, and the meta line shows live character and segment counts. The email variant gets a subject line and a fuller body with a "reply first if anything's wrong" escape hatch.
7. **Edit freely, watch the lint.** The draft textarea is fully editable; edits are saved per channel. The **Pressure lint** panel re-checks on every keystroke for blockers (incentives, star-begging — both violate platform policy) and warnings (review gating, urgency, guilt framing, shouting, over-asking, over-length). **Regenerate** discards your edits and restores the template.
8. **Check the timing advisor.** The right panel gives a verdict (green light / almost / hold) plus itemized checks: the cooling-off day, the 1–7 day prime window, the 14-day staleness cliff, mood gating, and per-channel best send times. Already-asked customers get follow-up guidance (one gentle follow-up after a week, let it go after 30 days).
9. **Send it yourself, then keep score.** Copy the draft with **Copy draft**, paste it into your own messages app or email client, and send. Back in the app, click **Mark asked** — the queue tracks the ask date. When the review lands, click **Got review**; use **Skip** for asks you decide against, and **Back to queue** to reopen anything.
10. **Export the packet.** The Export & handoff panel renders a live Markdown packet (business profile, the selected ask in both SMS and email variants, lint results, timing checks, and the full queue table). Copy it as Markdown, download the full state as JSON (re-importable), download the queue as CSV, or print the packet as a clean document.

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `?` | Open the How-to-use guide |
| `Esc` | Close the guide |
| `Ctrl/Cmd + S` | Copy the Markdown packet to the clipboard |

## Your data & privacy

- Everything is stored in this browser's localStorage under the key `fable-remake:day-06-review-request-composer:v1`. Nothing leaves your machine — no network requests, no analytics, no accounts.
- **Backup / move:** use **Download JSON** to export the full state, and **Import JSON** on any other machine or browser to restore it. Imports are validated, so a corrupt file can't crash the app.
- **Reset all** clears the queue and business profile after a confirmation. Deleting a single customer shows an **Undo** toast for 7 seconds.

## Tips & good practice

- **Ask in the 1–7 day window.** Day-of asks feel transactional; after two weeks the memory (and the goodwill) has faded.
- **Never incentivize.** Discounts, gifts, or "in exchange for" wording violates Google and Yelp policy and can get your listing penalized — the lint blocks it for a reason.
- **One ask, one follow-up, then stop.** A second nudge after a week is fine. A third message costs more trust than the missing review is worth.
- **The detail is the message.** Reviews written after a specific prompt ("the crew finished early") are longer and more credible than ones prompted by "please review us."
- **Fix issues before asking.** If the satisfaction signal is "had an issue," the app holds the ask — an ask sent into an unresolved problem is how one-star reviews are born.

## Troubleshooting

- **"My data disappeared."** localStorage is per browser and per profile. Check that you're in the same browser/profile you used before, and that you're not in a private/incognito window. Use JSON export as a backup habit.
- **"The draft won't update when I change tone or details."** You've hand-edited that channel's draft, so the app preserves your edits. Click **Regenerate (discard edits)** to go back to the template.
- **"Copy doesn't work."** Some browsers block the clipboard on `file://` pages. Either serve the folder with `python3 -m http.server 8000`, or select the text manually and copy.
- **"The queue shows Hold but I know they're happy."** Check the completed date and satisfaction signal — a same-day completion or a "neutral" signal holds the ask. Update the facts and the verdict recomputes instantly.

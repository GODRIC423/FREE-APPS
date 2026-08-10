# Referral Engine — Step-by-Step Guide

Referral Engine is a workbench for designing a referral program and then actually working it, week after week. It has four parts: a program designer (the incentive, the ask moments, the channels), a referrer roster (the people who already trust your work, rated by relationship strength), a weekly ask queue (who to ask, through which channel, with a ready-drafted script), and a referral funnel (every intro tracked from first mention to closed deal). It is built for freelancers, agencies, consultants, and small B2B teams who know referrals are their best channel but have never turned it into a system. Everything runs in your browser; nothing leaves your machine.

## Getting started

Open `apps/08-referral-engine/index.html` directly in any modern browser — it is fully self-contained (fonts, styles, and code are all inlined, zero network calls). Alternatively, serve the repository root with any static server and navigate to the same path. No install, no account.

## Walkthrough

1. **First open.** The "How to use Referral Engine" guide opens automatically on your first visit. Close it with `Esc` or the X button; reopen anytime with `?` or the **How to use** header button.
2. **Load the demo (recommended).** Click **Load demo** in the header to see Northbeam Studio's referral engine — an eight-person roster, a week of queued asks, and seven referrals moving through the funnel. A confirmation-free Undo toast lets you snap back to a blank pond.
3. **Design the drop — Program tab.** Name your program, describe what you sell in plain words, and set an average deal value. Pick an incentive type (cash, service credit, a meaningful gift, a charity donation, or reciprocal referrals), fill in exactly what the referrer gets — and, if double-sided, what the referred person gets — and choose when it pays out (on a qualified intro, a meeting held, or a closed deal). Choose the moments you'll actually ask at (right after a win, at project wrap-up, quarterly) and the channels your relationships already live in. Write your "rules of the pond" — the promises you make to referrers about speed and fairness. A live program card at the bottom shows the pitch as it reads today.
4. **Fill your first ring — Roster tab.** Add the people who already trust your work: clients, past clients, partners, peers, friends. Rate relationship strength honestly on a 1–5 scale (the ripple glyph fills in as strength rises) — the engine sorts suggested asks by this. Search and filter by relationship type as the roster grows.
5. **Queue this week's asks — Ask Queue tab.** The "Suggested next drops" strip surfaces your strongest, least-recently-asked referrers first. Click one to queue it, or queue directly from the roster with **Queue ask**. Each queued item gets a channel-specific script auto-drafted from your program (a full email, a call plan, a short LinkedIn/text line, or an in-person cue) — edit it freely in place, then **Copy script** and send it through the real channel.
6. **Mark and track.** After sending, mark the ask Sent or Replied — this automatically updates the referrer's "last asked" date so the suggestions stay honest. Earlier weeks collapse into a history you can expand.
7. **Log every ripple — Funnel tab.** When an intro actually happens, log it with **Log referral**: who it is, which referrer sent them, an estimated value, and the stage (Intro made → Conversation → Proposal → Won, or Lost). The funnel chart redraws live, showing exactly where ripples die and the pipeline/won dollar totals.
8. **Let Claude sharpen it — Copilot rail.** Four actions build complete, ready-to-paste prompts from your live program, roster, and funnel data: personalize an ask for one specific referrer, design three incentive structures for your price point, write a three-touch thank-you sequence, or audit your funnel and plan next week's three best asks. Click **Copy prompt**, paste into claude.ai — it works with the standard $20 Claude subscription, no API key. Paste anything worth keeping back into the **Claude's answer** notes box; it saves with your data.
9. **Export and repeat.** The Export menu offers Copy Markdown (the whole program as one readable brief), Download JSON (full state backup), roster and referrals CSVs, JSON import, and a print-styled one-pager. `Ctrl/Cmd+S` copies the Markdown brief from anywhere. Come back every week — the engine only works if you keep turning it.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `?` | Open the how-to guide |
| `Esc` | Close any open dialog |
| `Ctrl / Cmd + S` | Copy the full Markdown program brief |

## Your data & privacy

Everything lives in your browser's localStorage under the key `bizdev:08-referral-engine:v1`. The app makes zero network requests. Use **Export → Download JSON** for backups or to move to another machine, and **Export → Import JSON** to restore (imports replace current state, with a short Undo window). Clearing your browser's site data erases the engine, so export before you clean.

## Pro tips

- **Ask fewer people, more personally.** A queue of 2–3 sharply personalized asks each week beats a blast to twenty. The weekly target field exists to keep you from overreaching.
- **Rate strength honestly, not hopefully.** The suggested-drops list is only useful if a 5 really means "inner ring." Inflated ratings just move weak relationships to the front of the queue.
- **Never ask the same person twice in 30 days.** Write that rule into "Rules of the pond" and let the "last asked" column keep you honest.
- **The funnel tells you what to fix, not just what happened.** A sharp drop between Conversation and Proposal means your qualifying call needs work — that's a better use of Copilot's weekly-plan prompt than raw volume.
- **Thank people before the deal closes, not just after.** The Copilot thank-you sequence includes a 48-hour touch specifically because gratitude with zero outcome pressure is what keeps a referrer generous.

## Troubleshooting

- **The guide keeps reopening every visit.** It should only auto-open once (tracked via `seenGuide` in localStorage). If your browser is set to block or clear site storage on exit, the flag never persists — check site data settings for the folder you're opening the file from.
- **My data disappeared after loading the demo.** Loading the demo replaces the working state, but a toast with an **Undo** button appears for several seconds right after — click it to restore what you had. If you dismissed the toast, check whether you exported a JSON backup earlier.
- **A queued script still shows a stale detail after I edited the program.** Scripts are drafted at the moment you queue an ask or change its channel; editing the program afterward does not retroactively rewrite scripts already in the queue. Delete and re-queue the ask, or edit the script text directly.
- **Import says "not valid JSON."** Only re-import a file this app exported (Export → Download JSON). Hand-edited or partial files often break JSON syntax — validate the file in any text editor first.
- **Print output looks different from the on-screen view.** That's intentional — printing renders a separate, ink-friendly one-pager (program summary, roster table, funnel counts, referrals table) rather than the dark ripple UI, so it reads cleanly on paper.

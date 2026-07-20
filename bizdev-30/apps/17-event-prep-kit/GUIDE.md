# Event Prep Kit — Step-by-Step Guide

Event Prep Kit turns a conference, trade show, or meetup into a working pipeline machine instead of a bag of business cards. You build an event dossier before doors open (target list with why-them, talk tracks, icebreakers, a prep checklist), run the floor from a big-type day-of card view, convert scribbles into a follow-up queue the moment the badge scan is still warm, and close the loop with an honest ROI recap. It is built for founders, BD reps, and consultants who attend events to sell — not just to "be seen." Everything runs in your browser; nothing leaves your machine.

## Getting started

Open `apps/17-event-prep-kit/index.html` directly in any modern browser — it is fully self-contained (fonts, styles, and code are all inlined). Alternatively, serve the repository root with any static server and navigate to the same path. No install, no account, no network.

## Walkthrough

1. **First open.** The "How to use Event Prep Kit" guide appears automatically on your first visit. Close it with `Esc` or the **Got it** button; reopen anytime with `?` or the header's **How to use** button.
2. **Load the demo (recommended).** Click **Load demo** to see a fully worked event — SaaS Connect 2026 — with six scored targets, three talk tracks, a prep checklist, five follow-ups in flight, and real ROI numbers. Reset from the header when you want a blank badge.
3. **Issue your event.** Click **New event**, then set the name, dates, venue/city, and — most importantly — the **Mission**: the one sentence that defines what "worth it" looks like in numbers (e.g. "8 qualified meetings, 25 logged conversations").
4. **Build the target list (01 Dossier).** Click **Add target** for each of the 5–10 people worth crossing the floor for. Fill in role, company, a real **why-them**, and a specific **opener** — if you cannot write a why-them, they are foot traffic, not a target. Set the priority track (A = must-meet, B = strong, C = opportunistic) and search/filter the wall as it grows.
5. **Load your lines.** Add **Talk tracks** (a 20-second intro, a why-now story, a pricing deflection) written the way you would actually say them out loud, plus a handful of **Icebreakers**. Work through the **Prep checklist** before you travel.
6. **Work the floor (02 Day-of).** This tab is deliberately big-type and low-friction: unmet targets are sorted by track, each with a one-tap **Stamp MET** and **Missed** toggle. The moment you talk to someone, stamp them and scribble what they said, what you promised, and the next step — ten words now beats a blank memory tonight. Run the **Day-of checklist** and glance at talk tracks in large type from the same screen.
7. **Queue follow-ups (03 Follow-up).** Click **Queue met targets** to pull every stamped conversation into the queue with your scribbles attached as context. Set channel (Email/LinkedIn/Phone/Text), a due date, and move status from *To send* through *Sent* → *Replied* → *Meeting booked* as things progress. Send inside 48 hours while you are still a face, not a name.
8. **Ask the Copilot.** The staff-pass panel on the right builds a complete, ready-to-paste Claude prompt from your live data for four jobs: research a specific target, write your 20-second intro, draft follow-ups from your scribbles, and judge your ROI honestly. Click **Copy prompt**, paste it into claude.ai — it works with the standard $20 Claude subscription, no API key needed. Paste the useful parts of the answer into the **Claude's answers** notes box; it saves with the event.
9. **Face the numbers (04 ROI recap).** Log all-in cost, pipeline target, conversations, deals created, and pipeline attributed. The funnel chart (targets → conversations → follow-ups sent → replies → meetings) and the pipeline-multiple dial draw themselves. Copy the Slack-ready recap when you're done.
10. **Keep the artifact.** The **Export** menu offers: Copy Markdown dossier (the whole event as one document), Download JSON (full state, all events), Import JSON, Follow-up queue CSV, and Print dossier (clean print stylesheet). `Ctrl/Cmd+S` copies the Markdown dossier from anywhere.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `?` | Open the how-to guide |
| `Esc` | Close dialogs and menus |
| `Ctrl / Cmd + S` | Copy the Markdown dossier |
| `1`–`4` | Jump between Dossier, Day-of, Follow-up, and ROI recap |
| `Enter` | Add a checklist item while typing in its field |

## Your data & privacy

All data lives in your browser's localStorage under the key `bizdev:17-event-prep-kit:v1`, scoped per-browser and covering every event you create. Nothing is sent anywhere — the app makes zero network requests. Use **Export → Download JSON** for backups or to move machines, and **Export → Import JSON** to restore. Clearing browser site data erases the kit, so export before you clean.

## Pro tips

- **If you can't write a why-them, cut the target.** A badge without a reason is a distraction with a lanyard.
- **Scribble inside ten minutes, not at the hotel.** Details you're certain you'll remember at 6pm are gone by 9pm — the Day-of tab is built for speed for exactly this reason.
- **Queue met targets before you leave the building.** The follow-up window that actually converts is the first 48 hours; everything after that is a cold reintroduction.
- **Rehearse the talk track out loud, not silently.** Written pitches and spoken pitches are different animals — the prep checklist has a line for this on purpose.
- **Run the ROI Copilot prompt even when the event felt great.** Gut feel and the pipeline multiple frequently disagree; let the numbers have the final word on the next invite.

## Troubleshooting

- **The help dialog doesn't open with `?`** — click into empty page space first; the shortcut is ignored while you're typing in a field.
- **Copy prompt / Copy Markdown does nothing** — some browsers block clipboard access on `file://` pages. The app falls back to a manual-select method automatically; if it still fails, select the text in the field and copy manually.
- **My import was rejected** — the file must be JSON previously exported by this app (or matching its shape, with an `events` array). Malformed or unrelated JSON is discarded safely — nothing gets corrupted.
- **A target I stamped MET isn't in the follow-up queue** — go to 03 Follow-up and click **Queue met targets**; targets are only queued on demand so you can review before committing.
- **The pipeline-multiple dial looks flat at 0x** — it needs both **All-in cost** and **Pipeline attributed** filled in on the ROI recap tab; until cost is nonzero the multiple has nothing to divide by.

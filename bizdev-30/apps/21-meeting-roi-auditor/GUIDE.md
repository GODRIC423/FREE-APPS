# Meeting ROI Auditor — Step-by-Step Guide

Meeting ROI Auditor is a time-and-motion study for your calendar. It turns every recurring meeting into a loaded dollar figure — attendee count × hourly rate × duration × cadence — so you can stamp an honest verdict (Keep, Shrink, Kill, or Make async) instead of just feeling vaguely over-scheduled. It's built for founders, sales leaders, and operators who run — or sit inside — too many recurring meetings and want a defensible, numbers-first case for cutting the ones that don't move pipeline.

## Getting started

Open `apps/21-meeting-roi-auditor/index.html` directly in any modern browser — it's a fully self-contained file with no server, no account, and no network calls. (You can also serve the repo root with any static file server if you prefer a URL over a local file.) The app remembers everything in your browser's local storage, so closing the tab doesn't lose your work.

## Walkthrough

1. **Load the demo.** Click **Load demo** in the header to see an 11-meeting audit for a mid-size sales team, already stamped with verdicts, a live cost model, and a working meeting policy. Use it to see what "audited well" looks like before you touch your own calendar.
2. **Log your first meeting.** Click **New meeting** (or press `n`). Fill in the title, type, cadence (daily/weekly/biweekly/monthly/one-time), and duration in hours.
3. **Add attendees and loaded rates.** For each attendee, enter a name or role and their loaded hourly rate — not just salary, but salary plus overhead (benefits, taxes, overhead), which is usually 1.25–1.4× base pay. Don't have exact numbers? Use round estimates; the audit is meant to change decisions at the "is this obviously too expensive" level, not to survive a finance audit.
4. **Set the pipeline link.** Mark the meeting **Direct** (tied to an active deal or account), **Indirect** (enablement, coaching, ops — one step removed from revenue), or **No pipeline link**. This one field is the whole thesis of the app: meetings with no link are the ones most likely to be cut.
5. **Save it, then stamp a verdict** right on the card: **Keep**, **Shrink** (set a target length — the app computes exactly how many hours and dollars a week that reclaims), **Kill**, or **Make async**. The header's stopwatch dial and the Weekly Audit panel update immediately — no refresh, no recompute button.
6. **Build your Meeting Policy** below the log. Add rules (length caps, pipeline-link requirements, expiry windows), reorder them with the arrow buttons, and retire ones that stopped working instead of deleting the evidence they existed.
7. **Use the Claude Copilot panel** on the right. Each of the four actions builds a complete, ready-to-paste prompt around your live audit data:
   - **Draft the async replacement** — pick a killed/async meeting; get a format, cadence, fill-in template, and rollout message.
   - **Write the decline-with-grace message** — pick any meeting; get a tactful message matched to its verdict.
   - **Design my meeting policy** — sends your numbers and draft rules; get a publish-ready policy doc.
   - **Audit my week for more time to reclaim** — sends your full log; get a second opinion that challenges your Keep verdicts.
   Click **Copy prompt**, open [claude.ai](https://claude.ai) in another tab, paste, and read the answer. This works with the standard $20/month Claude subscription — no API key, no extra cost. Paste anything worth keeping back into the **Claude's answer** box in the Copilot panel; it saves with your audit.
8. **Export your work.** Use the **Export** menu to copy the weekly audit as Markdown (for a Slack post or doc), download the full state as JSON (for backup), download the meeting log as CSV (for a spreadsheet), or print the audit. `Ctrl/Cmd+S` copies the weekly audit Markdown from anywhere in the app.

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `n` | Open the new-meeting editor |
| `?` | Open this guide |
| `Ctrl/Cmd+S` | Copy the weekly audit as Markdown |
| `Esc` | Close any open modal or drawer |

## Your data & privacy

Everything you enter — meetings, attendees, rates, verdicts, policy rules, Claude's answers — is stored only in your browser's `localStorage`, under the key `bizdev:21-meeting-roi-auditor:v1`. Nothing is sent anywhere; the app makes zero network requests. Use **Download JSON** regularly if the data represents real work, and keep the file somewhere safe — clearing browser data, using a different browser, or private/incognito mode will not carry your audit with you. **Import JSON** on the Export menu restores a previously exported file.

## Pro tips

1. **Rate honestly, not generously.** A junior SDR at $65/hr loaded and a VP at $190/hr loaded in the same standup tells you exactly whose time is the expensive part of that meeting — don't average it away.
2. **The "no pipeline link" stat in the header is the whole point.** If that number stays high week over week, your policy isn't working yet, regardless of how many meetings you've killed.
3. **Shrink before you kill.** Most meetings don't need to disappear — they need to lose 15 minutes of throat-clearing. The Shrink verdict reclaims real hours without the political cost of cancelling something outright.
4. **Re-run the audit monthly, not once.** Meetings creep back. A six-week policy expiry rule (see the demo policy) forces a re-justification instead of letting zombie recurrences survive by default.
5. **Use the decline-with-grace prompt before you cancel anything live.** A well-framed message that cites the actual cost data lands very differently than "let's cancel this."

## Troubleshooting

- **My changes aren't showing up after I reopen the file.** Confirm your browser allows localStorage for local files (some browsers restrict storage on `file://` pages in strict privacy modes). If storage is blocked, export JSON before closing the tab and re-import it next time.
- **The demo won't load / nothing happens when I click "Load demo."** This replaces your current audit. If you have unsaved custom data, export JSON first — Load demo overwrites the working state (there's no undo for this one, by design, since it's a full swap).
- **A verdict button doesn't seem to do anything.** Verdicts are stamped directly on the meeting card by clicking one of the five pills (TBD/KEEP/SHRINK/KILL/ASYNC) — there's no separate "save" step for a verdict change; it's live. If you're mid-edit in the drawer, close or save the drawer first.
- **The Copy prompt button says "Log a meeting first."** The four Copilot actions need at least one meeting in your log to build a meaningful prompt (or, for "Draft the async replacement" and "Write the decline-with-grace message," a specific meeting selected from the dropdown). Add a meeting, or load the demo.

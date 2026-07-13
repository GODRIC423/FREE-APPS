# Warm Outreach Lab — Step-by-Step Guide

Warm Outreach Lab is a local-first drafting bench for reaching out to local businesses the honest way: you notice one real, checkable issue, offer one honest proof point, and make one low-pressure ask. It's for freelancers, consultants, and small agencies who want outreach that reads personal — with a lint that catches template-ish writing, a follow-up cadence planner, and pipeline stats. Everything stays in your browser; the app never sends a message.

## Getting started

- **Easiest:** double-click `index.html` (or drag it into a browser tab).
- **Or serve it locally:**

  ```bash
  python3 -m http.server 8000
  ```

  then open `http://localhost:8000/apps/day-09-warm-outreach-lab/` in your browser.

On your very first visit the "How to use" guide opens automatically. Dark mode is the default; the theme toggle in the header switches and remembers your choice.

## Step-by-step walkthrough

1. **Load the demo (recommended first).** Click **Load demo** in the header. You'll see four realistic prospects — a coffee shop mid-cadence, an auto shop with a deliberately terrible generic draft, a yoga studio that replied, and a plumber still in research. Why: it shows every feature populated before you commit your own data.
2. **Add your first prospect.** Click **+ New prospect** (or press `N`). A fresh research card opens with the business name focused. The name is required — the field highlights inline until you fill it.
3. **Fill the research card.** Add the contact's first name, industry/local context, and channel. Then the three ingredients: **Noticed issue** (one specific, checkable thing — "the online-order link in your bio 404s on mobile"), **Proof point** (one honest line about why you), and **Low-pressure ask** (something answerable in one line). Also note **constraints** — claims you must not make. Why: specific research is what separates warm outreach from spam.
4. **Compose the draft with slots.** In the draft panel, write your message and click chips like `{{contact}}`, `{{noticed}}`, `{{proof}}`, `{{ask}}` to insert personalization slots at the cursor. The resolved preview on the right fills them from the research card live; unfilled slots show highlighted in red.
5. **Fix what the genericness lint flags.** The lint scores your resolved draft 0–100 and lists every deduction: canned openers ("I hope this finds you well"), hype words ("guaranteed", "skyrocket"), never naming the business, not referencing the noticed issue, missing or multiple asks, me-heavy writing, links, shouting. Green checkmarks show what you got right. Aim for **70+** — that's when a draft counts as "send-ready" in the stats. Try the Hartline Auto Care demo draft to see a spectacular failure.
6. **Plan the follow-up cadence.** Pick a template — Gentle 3-touch (day 0/4/12), Standard 4-touch (0/3/8/16), or Slow burn (0/7/21/42) — set the start date, and click **Apply cadence**. Each touch has a hint for what that message should do. Check touches off as a human completes them; due and overdue touches are color-coded and counted in the stat strip. Touches pause automatically once a prospect replies, books a meeting, or is passed.
7. **Track the pipeline.** Move the status along Researching → Drafting → Ready → Sent → Replied / Meeting booked (or Passed). The stat strip updates live: prospects, send-ready drafts, touches due, and reply rate (replies + meetings over contacted).
8. **Export for human review.** In **Export & handoff**: **Copy Markdown packet** (research card + resolved draft + lint report + cadence + guardrail, also on `Ctrl/Cmd+S`), **Download JSON** (full state, re-importable), **Pipeline CSV** (one row per prospect for a spreadsheet), or **Print packet** for a clean paper copy. Every export carries the draft-only guardrail — a human verifies and sends.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `?` | Open the help guide |
| `Esc` | Close the help dialog |
| `Ctrl/Cmd + S` | Copy the Markdown packet (selected prospect, or pipeline overview) |
| `N` | New prospect (when not typing in a field) |
| `Enter` / `Space` | Open the focused prospect card |

## Your data & privacy

- Everything is stored in your browser's `localStorage` under the key `fable-remake:day-09-warm-outreach-lab:v1`. Nothing ever leaves your machine — no network calls, no analytics, no accounts.
- **Download JSON** makes a full backup; **Import JSON** restores it (imports are validated, so a corrupt file can't crash the app).
- **Reset** in the header clears all data after a confirmation. Deleting a single prospect shows an **Undo** toast for 7 seconds.

## Tips & good practice

- **One noticed issue beats three.** A single, verifiable observation ("your schedule PDF lists classes that no longer run") proves you actually looked. Lists of issues read like an audit pitch.
- **Make the ask smaller than a meeting.** "Want me to send a three-line note on where the link breaks?" outperforms "got 30 minutes this week?" — the lint rewards exactly one question.
- **Write the proof point as a fact, not a promise.** What you did for someone, in their words if possible. Never guarantee results — put forbidden claims in the constraints field so they're in every exported packet.
- **Respect the cadence hints.** The bump is one line in the same thread; the close-the-loop note ends politely and leaves the door open. More than four touches is pestering.
- **Lint 70 is a floor, not a goal.** The score catches genericness; it can't verify truth. Re-check the noticed issue right before a human sends.

## Troubleshooting

- **"My data disappeared."** localStorage is per browser and per profile — check you're in the same browser/profile, and that the folder is served from the same path (a different port or path counts as a different origin). Private/incognito windows discard storage when closed.
- **"Copy didn't work."** Some browsers restrict the clipboard on `file://` pages. The app falls back to a hidden-textarea copy; if that also fails, use Download JSON or select the preview text manually.
- **"Import failed."** The file must be JSON exported by this app (or at least shaped like its state). Exports wrap the state in `{ app, exportedAt, safety, state }` — both the wrapper and a bare state object import fine.
- **"A touch shows overdue but we already replied."** Set the prospect's status to Replied or Meeting booked — cadence touches pause automatically for those statuses and stop counting as due.

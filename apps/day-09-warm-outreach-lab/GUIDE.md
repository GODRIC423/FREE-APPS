# The Correspondence Desk — Step-by-Step Guide

The Correspondence Desk (Warm Outreach Lab) is a local-first writer's desk for reaching out to local businesses the honest way: you notice one real, checkable issue, offer one honest proof point, and make one gentle ask. It's for freelancers, consultants, and small agencies who want outreach that reads like a letter, not a circular — with an editor's pencil that grades template-ish writing, a postmark cadence planner, and a running desk ledger. Everything stays in your browser; the desk never posts a letter.

## Getting started

- **Easiest:** double-click `index.html` (or drag it into a browser tab).
- **Or serve it locally:**

  ```bash
  python3 -m http.server 8000
  ```

  then open `http://localhost:8000/apps/day-09-warm-outreach-lab/` in your browser.

On your very first visit the **Desk Manual** opens automatically. The desk keeps a single warm-paper look — gaslight crème, walnut, and sealing wax — designed for long reading; the print packet always comes out on clean white.

## Step-by-step walkthrough

1. **Lay out the demo (recommended first).** Click **Lay out the demo** in the header band. Four letters land on the desk — a coffee shop mid-cadence, an auto shop with a deliberately terrible generic draft, a yoga studio that replied, and a plumber still in the notes stage. Why: it shows every part of the desk populated before you commit your own correspondence.
2. **Start your first letter.** Click **+ New letter** in the tray (or press `N`). A fresh envelope appears and the dossier opens with the addressee field focused. The business name is required — the field marks itself in wax red until you fill it.
3. **Gather the dossier (Folio I).** Add the contact's first name, the trade and local context, and the channel of delivery. Then the three ingredients: **the noticed issue** (one specific, checkable thing — "the online-order link in your bio 404s on mobile"), **the proof point** (one honest line about why you), and **the gentle ask** (answerable in one line). Also note the **claims you must not make**. Why: specific research is what separates a letter from junk mail.
4. **Set the words down (Folio II).** Write on the ruled letter sheet and press brass plates like `{{contact}}`, `{{noticed}}`, `{{proof}}`, `{{ask}}` to set fill-in slots at the cursor. The fair copy alongside fills them from the dossier live; blank slots stay outlined in wax red.
5. **Mind the editor's pencil.** The pencil grades your resolved letter 0–100 and marks every deduction: canned openers ("I hope this finds you well"), hype words ("guaranteed", "skyrocket"), a letter that never names the business, a missing or crowded ask, me-heavy writing, links, shouting. Check marks show what you got right. Aim for **70 or better** — that's when a letter counts as *sealed & send-ready* in the ledger. Open the Hartline Auto Care demo draft to watch a spectacular failure get graded.
6. **String the postmarks (Folio III).** Pick a cadence — the gentle three (day 0/4/12), the standard four (0/3/8/16), or the slow burn (0/7/21/42) — set the first posting date, and click **Set the postmarks**. Each postmark carries a hand-written hint for what that letter should do. Stamp postmarks as a human completes them; due and past-due postmarks are marked in wax and counted in the ledger. The string goes quiet automatically once a prospect replies, sets a meeting, or is filed away.
7. **Move the letter along.** Advance the status: Gathering notes → At the desk → Sealed & ready → Posted → Reply received / Meeting set (or Filed away). The desk ledger updates live: letters in the tray, sealed & send-ready, postmarks due, and reply rate (replies + meetings over letters posted).
8. **Dispatch to a human (Folio IV).** **Copy Markdown packet** (dossier + fair copy + pencil report + postmarks + guardrail, also on `Ctrl/Cmd+S`), **Download JSON** (full desk, re-importable), **Tray ledger CSV** (one row per letter for a spreadsheet), or **Print the packet** for a clean paper copy. Every export carries the draft-only guardrail — a human verifies and sends.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `?` | Open the Desk Manual |
| `Esc` | Close the manual |
| `Ctrl/Cmd + S` | Copy the Markdown packet (selected letter, or the tray ledger) |
| `N` | New letter (when not writing in a field) |
| `Enter` / `Space` | Open the focused envelope |

## Your data & privacy

- Everything is stored in your browser's `localStorage` under the key `fable-remake:day-09-warm-outreach-lab:v1`. Nothing ever leaves your machine — no network calls, no analytics, no accounts.
- **Download JSON** makes a full backup; **Import JSON** restores it (imports are validated, so a corrupt file can't crash the desk).
- **Clear the desk** in the header discards all data after a confirmation. Discarding a single letter shows an **Undo** slip for 7 seconds.

## Tips & good practice

- **One noticed issue beats three.** A single, verifiable observation ("your schedule PDF lists classes that no longer run") proves you actually looked. Lists of issues read like an audit pitch.
- **Make the ask smaller than a meeting.** "Want me to send a three-line note on where the link breaks?" outperforms "got 30 minutes this week?" — the pencil rewards exactly one question.
- **Write the proof point as a fact, not a promise.** What you did for someone, in their words if possible. Never guarantee results — put forbidden claims in the constraints field so they travel with every packet.
- **Respect the postmark hints.** The bump is one line in the same thread; the close-the-loop note ends politely and leaves the door open. More than four letters is pestering.
- **A grade of 70 is a floor, not a goal.** The pencil catches genericness; it can't verify truth. Re-check the noticed issue right before a human sends.

## Troubleshooting

- **"My letters disappeared."** localStorage is per browser and per profile — check you're in the same browser/profile, and that the folder is served from the same path (a different port or path counts as a different origin). Private/incognito windows discard storage when closed.
- **"Copy didn't work."** Some browsers restrict the clipboard on `file://` pages. The desk falls back to a hidden-textarea copy; if that also fails, use Download JSON or select the fair copy manually.
- **"Import failed."** The file must be JSON exported by this desk (or at least shaped like its state). Exports wrap the state in `{ app, exportedAt, safety, state }` — both the wrapper and a bare state object import fine.
- **"A postmark shows past due but they already replied."** Set the letter's status to Reply received or Meeting set — the postmark string pauses automatically for those statuses and stops counting as due.

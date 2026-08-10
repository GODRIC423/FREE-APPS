# Meeting Follow-up Kit — Step-by-Step Guide

The Meeting Follow-up Kit is for anyone who leaves a meeting with a page of messy notes and owes the room a recap: team leads, project managers, founders, consultants. You paste rough notes (or capture items live), sort them into decisions, action items, risks, and open questions, and the kit drafts the follow-up email and a shareable recap for you — locally, in your browser, with nothing ever sent automatically.

## Getting started

- Open `index.html` directly in any modern browser, **or**
- Serve the folder locally and browse to it:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/apps/day-16-meeting-follow-up-kit/
```

On first visit the "How to use" guide opens automatically. The app starts in dark mode (or follows your system preference); use the theme button in the header to switch.

## Step-by-step walkthrough

1. **Load the demo (optional but recommended).** Click **Load demo** in the header. You'll see two meetings appear in the Meetings panel, a filled workspace, and live stats — including an overdue action so you can see the flagging. This is the fastest way to understand the whole flow; a toast offers **Undo** if you had data you want back.
2. **Create a meeting.** Click **+ New** in the Meetings panel. A blank meeting appears and becomes active. The Meetings list is your history — every meeting is kept until you delete it, and deleting shows an Undo toast for 7 seconds.
3. **Fill in the meeting details.** Title, date, attendees (comma-separated), your name, and the purpose. These feed the recap header, the email subject, greeting, and signature — you'll see the email draft update live as you type.
4. **Paste your raw notes.** Drop transcript fragments or scribbles into the Raw notes box, one thought per line. Click **Scan notes for items**: the kit classifies lines into suggested decisions, actions, risks, and questions. Click **Add** on the good ones (action suggestions even pick up owners from lines like "Marcus will…"), **Dismiss** the rest.
5. **Capture structure directly.** Use the three quick-add boxes — Decisions, Risks & blockers, Open questions — to log items as you think of them. Press Enter or click Add. Remove any item with the ✕ (an Undo toast appears).
6. **Track action items.** In the Action items panel, enter what needs to happen (required — you'll get an inline prompt if it's empty), the owner, a due date, and a status, then click **Add action**. Each action shows in the list with its status dropdown for one-click updates, an Edit button, and automatic red **overdue** flags when a due date passes. The stat strip at the top keeps a live count of decisions, open actions, overdue items, and open questions.
7. **Draft the follow-up email.** Pick a tone — **Friendly**, **Professional**, or **Direct** — and the email rewrites instantly: subject, greeting, decisions, actions with owners and due dates, risks, open questions, and a tone-matched sign-off. Click **Copy email draft** and paste it into your mail client. The kit never sends anything itself.
8. **Export the packet.** In Export & handoff: **Copy Markdown recap** (the full document, also triggered by Ctrl/Cmd+S), **Download JSON** (your entire state, re-importable via **Import JSON** — it even understands exports from the old version of this app), **Actions CSV** for spreadsheets, or **Print recap** for a clean paper/PDF version of the recap preview.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `?` | Open the "How to use" guide |
| `Esc` | Close dialogs |
| `Ctrl / Cmd + S` | Copy the Markdown recap |
| `Enter` | Add item from a quick-add box / save the action editor |

## Your data & privacy

- Everything is stored in your browser's `localStorage` under the key `fable-remake:day-16-meeting-follow-up-kit:v1`. Nothing leaves your machine — no network requests, accounts, or cookies.
- **Download JSON** is your backup and transfer mechanism; **Import JSON** restores it on any machine or browser.
- **Reset** (header) clears all meetings after a confirmation. It cannot be undone, so export first if in doubt.

## Tips & good practice

- Write notes one thought per line — the scanner classifies lines, so short declarative sentences ("Decided to…", "Dana will…", "Risk: …") produce the best suggestions.
- Give every action an owner and a due date before you send the recap; "Unassigned" in a follow-up email is where tasks go to die.
- Match tone to audience: Friendly for your own team, Professional for stakeholders or clients, Direct for a group that just needs the list.
- Send the follow-up the same day while context is fresh — the open-questions section is a polite way to chase answers without a second meeting.
- Revisit the meeting before the next one: update statuses, and the overdue flags tell you exactly what to chase.

## Troubleshooting

- **My data disappeared.** localStorage is per browser and per profile — check you're in the same browser/profile you used before, and that you're not in a private/incognito window. Restore from a JSON export if you have one.
- **Scan notes finds nothing.** The scanner needs recognizable cues (decided/agreed, will/needs to, risk/blocked, or a question mark). Split run-on paragraphs into separate lines and scan again. Items you've already added are skipped on purpose.
- **Ctrl/Cmd+S opens the browser save dialog.** Click anywhere in the page first so it has focus; the app intercepts the shortcut and copies the Markdown recap instead.
- **The print page is empty or wrong.** Print uses the Recap preview panel, so make sure a meeting is selected. Use your browser's "Save as PDF" destination for a shareable file.

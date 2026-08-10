# Discovery Call Copilot — Step-by-Step Guide

Discovery Call Copilot turns discovery calls from improvised chats into produced broadcasts. It is built for founders, consultants, and B2B sellers who run their own discovery calls and keep losing deals to questions they forgot to ask. You build a rack of proven questions across four bands (Situation, Problem, Impact, Ideal), assemble them into a per-call run sheet, run the call in a big-type live mode with a timer and note fields, then score the call honestly on a brass Signal Score dial — and hand the whole debrief to Claude for a gap audit or a same-day follow-up email.

## Getting started

Open `apps/03-discovery-call-copilot/index.html` directly in any modern browser — the file is fully self-contained (fonts, styles, and code are all embedded; nothing loads from the network). You can also serve the repo root with any static server and navigate to the same path. Your data lives in that browser via localStorage.

## Walkthrough: first open → exported debrief

1. **Read the How-to.** The guide modal opens automatically on your first visit (reopen it anytime with `?` or the "How to use" button). Close it with `Esc`.
2. **Load the demo.** Click **Load demo** in the header. You get a full 14-question rack and two run sheets: a finished, scored debrief for Dana Whitfield at Meridian Freight Systems (the "done well" example) and a second sheet still in prep. Every feature below is visible in the demo.
3. **Build your Question Rack (left panel, Prep view).** Click **New question**, pick a band, write the question, and add a "why it works" coaching note. The four bands mirror a healthy discovery arc:
   - **Situation** — map the current state, facts before feelings.
   - **Problem** — where it breaks and who bleeds when it does.
   - **Impact** — the cost of the problem in hours or dollars.
   - **Ideal** — the prospect's own picture of the fixed future.
   Use the search box and band filter chips to work a large rack. Edit or delete from the icons on each card (delete gives you a 7-second Undo toast).
4. **Cut a Run Sheet (right panel).** Click **New run sheet** in the cartridge row, then fill in prospect, role, company, industry, date, planned minutes, and — most important — the **call goal** ("what must be true when you hang up?"). Drag questions from the rack onto the sheet, or tap the **+** on any rack card. Reorder by dragging, or with the up/down arrows. Aim for 8–12 questions, Situation first, Ideal last. The footer shows your per-band mix.
5. **Go on air.** Click **Go on air**. The ON AIR lamp lights, the VU needles flutter, and the timer rolls against your planned minutes (it turns red when you run over). Each question appears in big type with a notes field underneath — type what the prospect says, in their words and their numbers. Notes mark a question covered; `→`/`←` move through the queue, `Space` pauses the clock, `A` toggles "asked", `Esc` leaves live mode. The dot rail at the bottom jumps to any question.
6. **Debrief while it's warm.** Click **Off air → debrief**. Set your estimated **talk ratio** on the VU meter (under 45% keeps you out of the red), tick the five **momentum checklist** items (next step booked, pain quantified, process mapped, champion identified, budget surfaced), and write the **headline takeaway**. The Signal Score dial computes 45% band coverage + 35% momentum + 20% talk discipline, with a verdict from "Dead air" to "Broadcast quality". You can also edit any note inline in the Off-air transcript.
7. **Visit the Producer's Booth (Claude Copilot).** Three actions, each copying a complete, context-rich prompt built from your actual data:
   - **Write questions for an industry** — type an industry; the prompt carries your whole rack and asks for 12 new band-sorted questions in that industry's vocabulary, no duplicates.
   - **Audit my notes for gaps** — carries the full active debrief; Claude flags under-covered bands, fog answers to reopen, missing deal facts, risks, and 5 next-touch questions.
   - **Draft the follow-up email** — carries the call record; Claude writes a sub-150-word same-day follow-up plus 3 subject lines, using only facts from your notes.
   Click **Copy prompt** and paste into claude.ai — this works with the standard $20 Claude subscription; no API key, no integration. Paste Claude's reply into the **Tape return** box so it saves with the call and appears in every export.
8. **Export.** The header **Export** button opens the export desk: **Copy markdown** (the full debrief — also `Ctrl/Cmd+S`), **Download JSON** (the whole session: rack, sheets, notes, scores), **Download rack CSV** (question bank as a spreadsheet), and **Import JSON** (restore a backup; undoable). **Print** in the debrief view produces a clean paper transcript of the active call.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `?` | Open / close the guide |
| `Esc` | Close dialogs · leave live mode |
| `Ctrl / Cmd + S` | Copy the debrief markdown |
| `←` / `→` | Previous / next question (on air) |
| `Space` | Pause / resume the timer (on air) |
| `A` | Toggle "asked" on the current question (on air) |

## Your data & privacy

Everything is stored in your browser's localStorage under the key `bizdev:03-discovery-call-copilot:v1`. Nothing is transmitted anywhere — the app makes zero network requests. **Download JSON** is your backup and your transfer mechanism: import it on any other machine or browser to restore the full session. Clearing browser site data erases the app's memory, so export before you clean.

## Pro tips

- **Write the "why it works" line every time.** It turns a question list into a coaching system — and it makes Claude's generated questions dramatically better, because the prompt teaches Claude your taste.
- **Set the call goal before you drag a single question.** A sheet built toward "deep-dive booked with the champion" looks different from one built toward "qualify budget".
- **Keep the talk needle honest.** Estimate your talk ratio immediately after hanging up, before ego edits the memory. If you're consistently over 55%, cut questions and lengthen silences.
- **Run the gap audit the same day, send the follow-up within the hour.** The two Producer's Booth prompts are designed to chain: audit first, then let the follow-up draft address the strongest thing they said.
- **Prune the rack monthly.** Delete questions that keep getting one-word answers; promote the ones that make prospects say "good question".

## Troubleshooting

- **My data disappeared.** localStorage is per-browser and per-profile — check you're in the same browser/profile, and that you're not in a private window. Restore from your last Download JSON if needed.
- **The `?` key doesn't open help.** Click outside any input first — shortcuts are suspended while you're typing in a field. On some layouts you need `Shift+/`.
- **Copy prompt / Copy markdown does nothing.** Some browsers block the clipboard on `file://` pages until you interact with the page; click anywhere and retry. If it still fails, the app shows a toast — use Export → the markdown preview box and copy manually.
- **Import JSON is rejected.** The file must be a JSON export from this app (or match its shape). Open it in a text editor and confirm it starts with `{` and contains `"bank"` and `"calls"`. Partial/corrupt files are normalized where possible; truly unreadable ones are refused with a toast.
- **The timer didn't advance.** The clock only runs while you're on air and not paused — check the ON AIR lamp is lit and press `Space` if you paused it.
- **Print shows the whole app, not the transcript.** Print from the Debrief view's **Print** button (or `Ctrl/Cmd+P` while a run sheet is active); the print stylesheet swaps the console for a paper transcript of the active call only.

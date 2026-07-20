# Narrative Deck Builder — Step-by-Step Guide

Narrative Deck Builder makes you structure the sales *story* — status quo, threat, promised land, proof, ask — before you open a slide tool. You pin story beats to a corkboard organized by the five-stage arc, turn each beat into a slide outline (headline, support, visual idea), watch a live pacing meter tell you if your story is set-up-heavy or thin on conflict, and read the whole thing straight through before you build a single slide. It's built for founders, AEs, consultants, and anyone who pitches for a living and is tired of opening PowerPoint before they know what the story even is.

## Getting started

Open `apps/19-narrative-deck-builder/index.html` directly in any modern browser — it is fully self-contained (fonts, icons, and styles are embedded; nothing loads from the network). You can also serve the repo root with any static server and browse to the same path. Your data stays in that browser.

## Walkthrough

1. **First open.** The "How to use" guide opens automatically. Close it (Esc or the button); it won't auto-open again on this browser.
2. **Load the demo.** Click **Load demo** to pin a finished board: 10 beats across all five arc stages for a real-feeling warehouse-software pitch, from "paper still runs the floor" to a signed pilot ask. **Reset** (with confirmation) clears it when you're ready to build your own.
3. **Set the frame (The Board tab).** Fill in the **Deck title** and **Audience & occasion** fields — who's in the room, what decision you're asking for, when. Every Copilot prompt uses this for context.
4. **Pin your Status Quo.** Add one or two beats describing the ordinary world before anything breaks. Specifics beat generalities — a number, a workflow, a name.
5. **Pin the Threat.** What's actually breaking, costing money, or about to get worse? This is where the stakes live — vague threats produce vague decks.
6. **Pin the Promised Land, Proof, and the Ask.** The Promised Land is the specific after-state; Proof is evidence it's real and repeatable; The Ask is the exact next step. Click a card to expand it into a full slide outline: **story beat** (what happens, handwritten-style), **slide headline**, **slide support** (one bullet per line), and a **visual idea**.
7. **Reorder and re-file.** Use the up/down arrows to reorder beats within a stage, or change a beat's "Arc position" dropdown to move it to a different stage entirely if you pinned it in the wrong place.
8. **Watch the Pacing check.** The Setup / Conflict / Resolution bar (just under the hero) shows how your story's weight is actually distributed, with a plain verdict — "Balanced pacing," "Conflict is thin," "Setup-heavy," and so on. It updates live as you write.
9. **Read it straight through (Read-through tab).** Every slide lines up in presentation order — headline, bullets, visual idea, and the underlying story beat. This is the fastest way to feel whether the arc actually holds together. Click **Print outline** for a clean leave-behind.
10. **Let Claude write with you.** The Copilot panel has four actions: sharpen a promised-land statement, generate slide headlines for every beat, find holes in the story, and expand one beat into full slide copy (headline, bullets, speaker notes, visual brief). Copy the prompt, paste it into claude.ai (works with the standard $20 subscription, no API key needed), and keep the useful parts in the notes box, which autosaves.
11. **Export.** The **Export** dialog offers: Copy Markdown (the full outline, ready to paste into any deck tool's outline view), Download JSON (full backup), Download CSV (every beat as a spreadsheet row), and Import JSON (restores a backup; malformed files are safely rejected).

## Keyboard shortcuts

| Key | Action |
|---|---|
| `?` | Open the how-to guide |
| `Esc` | Close any dialog |
| `Ctrl/Cmd + S` | Copy the deck outline as Markdown |

## Your data & privacy

Everything is stored in your browser's localStorage under the key `bizdev:19-narrative-deck-builder:v1`. Nothing is sent anywhere — there is no server, no analytics, no network calls. Use **Export → Download JSON** for backups or to move between browsers/machines, and **Import JSON** to restore.

## Pro tips

- **Write the threat before the promised land.** A vivid future only lands against a specific, costly present — if the threat beat is vague, the promised land will feel like marketing copy.
- **One breath, one beat.** If a story beat needs two sentences to explain, it's actually two beats — split it and pin both.
- **Chase the "Resolution needs more weight" flag.** A pitch that's all setup and threat with a thin ending reads as complaining, not selling. Proof and the Ask should carry real weight.
- **Make the Ask falsifiable.** "Approve a two-week pilot, success = 40% mis-pick reduction" beats "let's discuss next steps" every time — the Copilot's holes-finder checks for exactly this.
- **Read-through before you build.** Ten minutes of reading your own arc out loud catches more problems than an hour in a slide tool.

## Troubleshooting

- **The guide keeps opening / my data vanished.** You're likely in a private/incognito window or a different browser profile — localStorage is per-profile. Use Export/Import to move data.
- **Copy buttons do nothing.** Some browsers restrict the clipboard on `file://` pages; the app falls back to a hidden-textarea copy. If it still fails, select the preview text manually, or serve the folder over a local static server.
- **Import JSON is rejected.** The file must be JSON exported by this app (or shaped like it). The importer runs everything through a normalizer, so a partial file loads with defaults — but a non-JSON file is refused with a toast.
- **Printing shows the whole app.** Use the **Print outline** button on the Read-through tab (or the browser's print on any tab) — the print stylesheet automatically swaps to the outline artifact. If you see app chrome, check that "Background graphics" is enabled for nicer cards.
- **A deleted beat is gone.** Deletes show an Undo toast for about 7 seconds. After that, restore from your latest JSON export.

# Content Repurposer — Step-by-Step Guide

Content Repurposer turns one piece of long-form content — a video transcript, podcast episode, article, or build log — into a complete publishing packet: three YouTube title options, a description, a validated chapter block, a short post, a LinkedIn post, and a newsletter subject + blurb. It is built for solo creators and owner-operators who publish across platforms and want every claim they make to be backed by a receipt. Everything it produces is a draft: nothing is posted, uploaded, or sent, and every export is stamped with a human-approval boundary.

## Getting started

- Open `index.html` directly in any modern browser, or
- Serve the folder locally and open the app path:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000/apps/day-18-content-repurposer/
```

No install, no accounts, no network access. On first visit the "How to use" guide opens automatically. Press **Load demo** in the header to explore with a realistic scenario (a cafe fixing its no-show rate) before pasting your own material.

## Step-by-step walkthrough

1. **Paste your source content.** In panel 1, drop the transcript, article, or build log into *Source content*. Set the working title, source type, audience, tone, and runtime in minutes. You will see a live word/character count under the textarea. This matters because every downstream draft and chapter is derived from this text — the richer the source, the better the drafts.

2. **Add the takeaway, proof notes, and caveats.** The *key takeaway* seeds your titles and hooks. *Proof notes* are the receipts — the exact numbers and evidence you can back up — and they are what the claim-check lint verifies your stats against. *Caveats* keep the drafts honest (sample size, timeframe, what might not transfer).

3. **Generate all drafts.** Click **Generate all drafts**. Every platform card fills in: three YouTube title options, a YouTube description, a short post (X/Mastodon), a LinkedIn post, and a newsletter subject + blurb. If you had no chapters yet, a chapter suggestion is cut at the same time. A toast offers **Undo** for 7 seconds if you had drafts you wanted to keep.

4. **Edit inside the platform limits.** Every card is fully editable and has a live character counter against the real platform limit (YouTube title 100, description 5,000, short post 280, LinkedIn 3,000, newsletter subject sweet spot 65). Counters turn amber near the limit and red over it, and the card outline turns red when a draft would be rejected or truncated. Pick your primary YouTube title with the radio buttons — it is marked in the packet.

5. **Build the chapter block.** Panel 4 holds the chapter/timestamp builder. **Auto-suggest from source** spreads chapters across your stated runtime proportionally to each section's length (blank lines between source sections give the best cuts). Edit timestamps (`mm:ss` or `h:mm:ss`) and labels, reorder with the arrows, delete with ✕ (undo available). The validator checks YouTube's real rules: first chapter at 00:00, strictly ascending timestamps, at least 3 chapters, nothing past your runtime. The paste-ready block sits underneath.

6. **Clear the claim-check lint.** Panel 2 rescans on every keystroke. It flags **blockers** (a stat like "60%" or "$1,200" with no matching proof note, "studies show" with no source, drafts over a hard limit, approval gate off), **warnings** (superlatives like "game-changing", absolutes like "guaranteed"), and **notes** (bait wording, missing caveats). Flags also appear as chips on the offending card. Fix blockers; reconsider warnings.

7. **Watch the stat strip.** The four tiles at the top track source words, drafts within limits (n/8), chapter count, and lint flags — green when healthy, red when something blocks.

8. **Export the packet.** Panel 5 shows a live Markdown preview of the whole packet — titles, description, chapters, posts, newsletter, proof, caveats, the full claim-check report, and an approval checklist. **Copy Markdown packet** (or `Ctrl/Cmd+S`), **Download .md**, **Download JSON** (re-importable), **Import JSON**, or **Print packet** for a clean paper/PDF review copy. The draft-only approval boundary is stamped into every export.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `?` | Open the how-to-use guide |
| `Esc` | Close the guide dialog |
| `Ctrl/Cmd + S` | Copy the Markdown packet |

## Your data & privacy

Everything you type stays in this browser's `localStorage` (key `fable-remake:content-repurposer:v1`). Nothing is sent anywhere — there are no accounts, no analytics, no network calls. **Download JSON** gives you a portable backup you can re-import later or on another machine; **Reset** (with confirmation) clears the stored state entirely. Clearing site data in your browser also removes it.

## Tips & good practice

- **Blank lines are chapter cuts.** Separate the source into paragraphs per topic and Auto-suggest will land close to your real structure.
- **Write proof notes with the exact numbers.** The lint matches digits — if the draft says "31 to 12" the proof note must contain 31 and 12.
- **Front-load the hook.** Only ~157 characters of a YouTube description and ~210 of a LinkedIn post show before the fold — the generator puts the takeaway first for a reason.
- **Treat generated text as scaffolding.** The generator arranges *your* sentences; make every line true before it ships.
- **Keep one caveat in every long-form draft.** Honest limits are what make the numbers believable.

## Troubleshooting

- **"My data disappeared."** localStorage is per browser and per profile. Check you are in the same browser/profile and not a private window; use JSON export for anything you cannot afford to lose.
- **"Generate did nothing."** Source content is required — the textarea is outlined in red with a message when empty. Paste your material first.
- **"A stat I can prove is flagged."** The lint matches digit runs against your proof notes. Add the exact figure (e.g. "60%") to *Proof notes* and the blocker clears.
- **"Chapters show an error."** The validator enforces YouTube's rules: the first timestamp must be exactly `00:00`, timestamps must strictly ascend, and markers need at least 3 chapters.

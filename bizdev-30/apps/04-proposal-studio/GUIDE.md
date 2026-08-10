# Proposal Studio — Step-by-Step Guide

Proposal Studio assembles winning service proposals: a section library with letterpress-quality starter copy, a drag-ordered argument, a pricing table with named editions, and a print-perfect cream-paper document at the end. It is built for freelancers, consultants, and small agencies who sell engagements worth defending — people for whom the proposal *is* the closing argument, and who want it to read (and look) like a decision already made.

## Getting started

Open `apps/04-proposal-studio/index.html` directly in any modern browser — the file is fully self-contained (fonts, styles, and logic are all inline; nothing loads from the network). Alternatively, serve the repo root with any static server and navigate to the same path. Your work saves automatically to this browser.

## Walkthrough: from blank paper to a signed yes

1. **First open.** The "How to use" guide appears automatically on your first visit. Read the eight moves, then press **To the desk**. You land on the **Cover Sheet** tab.
2. **See it done well first.** Click **Load demo** in the header. The Harbor Lane Hotels scenario fills the studio: a complete branded-hotel rebrand proposal with nine sections, two priced editions, and a finished preview. Explore it, then **Reset** (it asks before tearing anything up) when you are ready to write your own.
3. **Set the cover sheet.** Title, subtitle, who it is for, who it is from, reference number, date, and — importantly — a **valid-until** date: an open-ended proposal never gets signed. The 1–3 letter monogram becomes your wax seal on the cover and your crest in the corner.
4. **Pull sections from the Stationery Drawer.** On the **Sections** tab, the drawer offers eleven set pieces across three categories — Foundation (Opening Letter, The Situation, Next Steps), Persuasion (Approach, Team, Selected Results, Guarantee), Commercial (Scope, Timeline, Out of Scope, Terms). Each arrives with opinionated starter copy; the `[bracketed blanks]` show exactly which facts to fill. Add a **blank page** for anything custom.
5. **Order the argument.** Drag sections by the grip handle (or use the up/down arrows). A proven order: letter first, problem before approach, price late, pen (Next Steps) last. The eye toggle keeps a section on file without printing it; deleting shows an **Undo** toast for about seven seconds.
6. **Price the editions.** On **Investment**, build one or two named options ("The Crest Edition", "The Foil Edition"…) with line items — description, detail, quantity, rate. Subtotals, optional per-option discount, and tax compute live. Star one edition as **recommended**; the right-rail bars compare the totals at a glance.
7. **Watch the Foil Gauge.** The dial in the right rail scores send-readiness across eight checks (cover complete, opening letter present, problem stated, scope countable, priced, next steps, validity date…). Click any unmet check to jump straight to where the work is.
8. **Proof, print, export.** **Preview** shows the finished piece — cream sheet, seal, letterpress rules, roman-numeral sections, the investment table. **Print / Save as PDF** (or Ctrl/Cmd+P) produces the client-ready document with app chrome removed and clean page breaks. From **Export**: Copy Markdown (Ctrl/Cmd+S), Download JSON (full state), Download pricing CSV, or Import JSON to restore a saved proposal.

## Using the Claude Copilot desk (with a standard $20 Claude subscription)

The **Claude Copilot** tab needs no API key. Each action composes a complete, expert-grade prompt that embeds your entire current proposal as readable markdown:

- **Draft a section from notes** — pick a section, jot rough bullets, and get finished body copy in your voice with missing facts marked in brackets.
- **Tighten the scope language** — a creep-risk audit of your scope, exclusions, timeline, and terms, with a risk table and rewritten sections.
- **Objection-handling FAQ** — the 8–10 objections this specific proposal will draw, with calm answers and a verbatim price-defense paragraph.
- **Red-team the proposal** — a skeptical CFO/procurement read: verdict, per-section scores, weakest promise rewritten, the three questions that hurt.

Click **Copy prompt**, paste into [claude.ai](https://claude.ai), and paste anything worth keeping into the **Reply Ledger** at the bottom — it saves with the proposal.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `?` | Open the How-to-use guide |
| `Esc` | Close dialogs and menus |
| `Ctrl/Cmd + S` | Copy the whole proposal as Markdown |
| `Ctrl/Cmd + P` | Print / save the finished proposal as PDF |

## Your data & privacy

Everything lives in your browser's localStorage under the key `bizdev:04-proposal-studio:v1`. Nothing is ever sent anywhere — there is no network activity at all. **Download JSON** to back up or move machines; **Import JSON** restores it (imports pass through validation, so a mangled file simply loads as far as it safely can). Clearing browser site data erases the studio — keep a JSON copy in the drawer.

## Pro tips

- Write the Opening Letter last, but place it first. It is the one page everyone reads; quote something the client actually said.
- Two priced editions beat one (anchor + recommendation) and beat three (choice paralysis). Star the one you want chosen.
- Run **Tighten the scope language** before every send. Scope creep dies on this page or nowhere.
- Use the eye toggle to keep a Guarantee section drafted but unprinted until a deal needs the extra push.
- Keep the reading time (right rail) under ten minutes. Cut sections before you cut sentences.

## Troubleshooting

- **The guide keeps opening on load** — the app could not persist `seenGuide`; your browser is blocking localStorage (private/incognito mode or strict settings). Allow site data for the file.
- **Print shows the app instead of the document** — use the in-app **Print / PDF** button or Ctrl/Cmd+P from within the page, and ensure "Background graphics" is enabled in the print dialog for the cream paper look; the document prints on white for ink economy by design.
- **Copy buttons do nothing** — some browsers restrict the clipboard on `file://` pages. The app falls back automatically; if a toast says copy failed, select the text in Preview and copy manually, or serve the folder over `http://localhost`.
- **My import was rejected** — the file must be a JSON previously exported by Proposal Studio (or matching its shape). Open it in a text editor and confirm it starts with `{ "v": 1`.
- **Work vanished after switching browsers** — localStorage is per-browser, per-profile. Export JSON on machine A, import on machine B.

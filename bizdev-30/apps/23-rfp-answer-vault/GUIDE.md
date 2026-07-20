# RFP Answer Vault — Step-by-Step Guide

RFP Answer Vault is a reusable-answer library and response assembler for anyone who answers Requests for Proposal, Requests for Information, or vendor security questionnaires for a living — sales engineers, proposal managers, founders wearing the RFP hat, and agency ops leads. Every RFP asks the same forty questions in different words; this app stores the canonical answer once (with an owner and a verified date) and lets you assemble a new response by picking questions out of the vault instead of writing from a blank page. It flags answers that have gone stale before you ship them, and it pairs with a standard Claude subscription to adapt, draft, and review the response.

## Getting started

Open `apps/23-rfp-answer-vault/index.html` directly in a browser — it is a single self-contained file, no server or install required. (If you're browsing the whole bizdev-30 repo, you can also serve the repo root with any static file server.) On first open, a guide modal walks you through the basics; close it any time with Esc and reopen it with the `?` key or the "How to use" button.

## Walkthrough

1. **Load the demo vault.** Click "Load demo" in the header to see a fully stocked library (17 answers across six drawers) and two example RFPs — one in progress, one already won — so you can see the app "done well" before you touch your own data.
2. **Stock your own vault.** Switch to the Vault view and click "New answer." Fill in the question pattern (the canonical phrasing of the question), the full answer, a category (the "drawer" it lives in), tags, an owner, and a source note if you have one. Click "Mark verified today" any time you confirm an answer is still accurate — this resets its freshness clock.
3. **Search first, always.** Use the search bar to find answers by question, answer text, tag, or owner. Click a drawer in the cabinet graphic to filter to one category, or use the Fresh / Aging / Stale chips to see what needs attention. The library health dial shows the fraction of your library that is still fresh.
4. **Start an RFP folder.** Switch to the Assemble view and click "New response." Give it a name, the client, and a due date. This is where you'll build the actual document you submit.
5. **Pick your questions from the vault.** Inside the folder, use "Pick from the vault" to search your library and add matching answers with one click. Each item then shows two editable fields: the RFP's exact question wording (paste it in verbatim) and the answer text (starts as a copy of the canonical answer — adapt it to fit). Reorder items with the up/down arrows; remove one with the trash icon (a 7-second Undo toast appears).
6. **Watch the gap list.** Any item with no answer text automatically appears in the Gap List. For each gap, either search the vault again for a better match, write the answer directly in the item, or click "Promote to vault" to create a new canonical answer from that question — you'll be dropped straight into the entry editor to write it.
7. **Run Claude Copilot.** Open the Copilot panel (the sparkle button, or press `C`), pick the target RFP, and choose an action: adapt your attached answers to this RFP's phrasing, draft the answers you're missing, review the whole response for consistency before you submit, or audit the entire vault for stale entries. Each action builds a complete, ready-to-paste prompt with your real data embedded. Copy it into claude.ai (works with the standard $20 subscription — no API key needed), then paste anything useful back into the Debrief notes field, which auto-saves.
8. **Compile and ship.** The "Compiled response" panel at the bottom of each RFP folder shows the full assembled document. Copy it as Markdown, or use your browser's print dialog for a clean paper/PDF copy. Download the full vault as JSON for backup, or as CSV if you want to review it in a spreadsheet.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `?` | Open the how-to-use guide |
| `V` | Switch to the Vault view |
| `A` | Switch to the Assemble view |
| `C` | Toggle the Claude Copilot panel |
| `N` | New answer (in Vault) or new RFP folder (in Assemble) |
| `Ctrl` / `Cmd` + `S` | Copy the current view's main artifact as Markdown |
| `Esc` | Close the open panel, or back out of an answer you're editing |

## Your data & privacy

Everything lives in your browser's `localStorage` under the key `bizdev:23-rfp-answer-vault:v1` — nothing is sent to a server, and the app makes zero network requests. That means your data stays on the device you're using and won't sync across browsers or computers on its own. Use "Download JSON (full state)" in the Export menu regularly if your vault matters to you, and use "Import JSON…" to restore it (on this device or another one) or to move it to a new browser.

## Pro tips

- Write the canonical answer once, in full sentences, the way you'd want it to read in a finished proposal — every future response starts from that text, so it's worth the extra two minutes.
- Assign a real owner to every answer, especially in Security & Compliance and Legal & Data Privacy — those are the drawers that go stale fastest and cause the most risk if they ship outdated.
- When a gap keeps recurring across RFPs, that's a signal: promote it to the vault the first time you see it, not the third.
- Run the "Audit the vault for stale answers" Copilot action once a quarter — it doesn't just list stale entries, it prioritizes them by how often they're actually used.
- Before you submit anything, run "Review response for consistency" — it catches contradicting numbers (two different uptime figures, two different timelines) that are easy to miss reading your own answers back to back.

## Troubleshooting

- **My answers disappeared.** Check that you're opening the app from the same browser and device — data is stored locally per-browser, not in the cloud. If you exported a JSON backup, use Import to restore it.
- **The freshness badge looks wrong.** Freshness is computed live from today's date and the answer's "Verified date" field — fresh is 90 days or less, aging is 91-180 days, stale is over 180 days. If a date looks off, open the answer and check the Verified date field directly.
- **"Copy Markdown" didn't seem to do anything.** Some browsers block clipboard access outside a user gesture or in certain privacy modes; if the toast says "Copy failed," use Export → Download JSON instead and open the file directly, or try the copy button again after clicking somewhere on the page first.
- **A response item shows "custom / no source" and I expected it to be linked.** That item was added as a blank question (or its source answer was deleted from the vault). Use "Pick from the vault" to attach a canonical answer, or write the answer directly in the item — both are valid ways to fill a response.
- **I deleted something by mistake.** Every delete (answers, RFP folders, response items) shows a 6-8 second Undo toast at the bottom of the screen — click it before it disappears to bring the item back.

# Expansion Matrix — Step-by-Step Guide

## What it does & who it's for

Expansion Matrix is a whitespace-mapping tool for anyone who sells more than one thing to the same customers — agencies, consultancies, B2B SaaS teams, and service businesses with a "land, then expand" motion. It puts your accounts down one axis and your offers down the other, and asks you a single honest question for every cell: *sold, fit, no fit, or in play?* That turns a vague feeling of "there's probably more revenue in our base" into an actual, ranked, dollar-sized list of the accounts and offers worth working next — plus the drafts (referral asks, expansion pitches) to go get it.

It is a single self-contained web page. There is no server, no login, and no data ever leaves your device.

## Getting started

Open `apps/27-expansion-matrix/index.html` directly in any modern browser (double-click it, or drag it into a browser tab) — everything, including fonts, is bundled into that one file. If you'd rather serve it, run any static file server from the repo root and navigate to the file's path. No build step, no install, no internet connection required after the first load.

## Walkthrough

1. **Open the app.** On first visit, the *How to use* guide opens automatically. Close it (Esc, the X, or "To the matrix") whenever you're ready — it won't auto-open again on this device.
2. **Load the demo, or start blank.** Click **Load demo** in the header to see a fully worked example: a growth-marketing agency with six accounts, three offers, and a matrix scored across all four states. Loading the demo replaces whatever is currently in the app (there is no confirmation, but nothing is lost — export first if you have real data you want to keep).
3. **Describe your business.** In the box under the Architect's Read panel, write one or two sentences about what you sell and who buys it. This gets embedded into every Claude Copilot prompt so Claude never has to guess your context.
4. **Build your line card.** Under **Offers**, add every distinct thing you sell — each one becomes a column in the matrix. Give each a price band (however you'd say it out loud: "$4,500/mo + spend") and a one-line description. Reorder with the arrow icons; edit or delete any offer with the pencil and trash icons.
5. **List your accounts.** Under **Accounts**, add the real companies already paying you something. Each becomes a row. Record their segment, your contact there, and their current annual spend — these show up on hover in the matrix and get folded into Copilot prompts.
6. **Score the matrix.** This is the core of the tool. Click any cell — the **Cell Inspector** opens on the right. Mark it:
   - **Sold** — they already buy this.
   - **Fit** — good match, open whitespace, not yet pursued.
   - **In Play** — you're actively working this right now.
   - **No Fit** — not a match for this account; ruled out on purpose.

   Add an estimated dollar value and a note explaining the signal behind the state. For Fit and In Play cells, also fill in **Next play** — the single action that moves it forward. Click **clear score** to fully reset a cell back to unscored.
7. **Read the Architect's Read.** The panel at the top always shows your single highest-value Fit or In Play cell — the one thing to work next if you only have time for one.
8. **Work the Play Queue.** Every Fit and In Play cell ranks here automatically by dollar value, with search and state filters. Use **Mark in play** / **Mark sold** to promote a cell as the deal moves, without leaving the list.
9. **Check the Account Plans.** Each account gets an auto-generated one-paragraph plan (what's sold, the best open play, what's ruled out). Click the pencil to override any plan with your own words — click "reset to auto-generated" to go back.
10. **Run the Claude Copilot.** Pick a cell in the selector, then copy one of three prompts — *Rank my whitespace cells*, *Draft the internal-referral ask*, or *Write the expansion pitch*. Each prompt embeds your live business context, offers, accounts, and matrix as readable markdown. Paste it into [claude.ai](https://claude.ai) — this works with the standard $20/month Claude subscription, no API key and no setup. Paste Claude's best answers back into the **Field notes** box, which saves with your matrix.
11. **Export your work.** Use the **Export** menu (or `Ctrl/Cmd+S`) to copy the full Expansion Plan as Markdown, download the complete state as JSON, download the matrix as a CSV spreadsheet, re-import a previously exported JSON file, or print a clean paper version.

## Keyboard shortcuts

| Key | Action |
|---|---|
| `?` | Open the How to use guide |
| `Esc` | Close any open dialog or menu, or deselect the current cell |
| `Ctrl` / `Cmd` + `S` | Copy the Expansion Plan as Markdown |

## Your data & privacy

Everything you enter is stored only in your browser's `localStorage`, under the key `bizdev:27-expansion-matrix:v1`. Nothing is ever sent to a server — the app makes zero network requests. Because it's local storage, your data is tied to this browser on this device; it will not appear if you open the file on another computer or in a different browser unless you export and import it. Use **Download JSON (full state)** regularly if you want a portable backup, and **Import JSON** to restore it (here or on another machine). Clearing your browser's site data for this file will erase your matrix — export first if that's a risk.

## Pro tips

1. **Score "No Fit" deliberately, not by omission.** An unscored cell and a No Fit cell look different for a reason — No Fit means you looked and ruled it out, which is valuable information for the next person who touches the account.
2. **Let the dollar value do the ranking.** Don't hand-order the Play Queue in your head — put a real (even rough) number in every Fit and In Play cell and let the queue sort itself. Rough numbers beat no numbers.
3. **Use the Whitespace focus view before a pipeline review.** The "Whitespace" toggle above the matrix dims everything except Fit and In Play cells, so you can screen-share just the open opportunity without the noise of Sold and No Fit.
4. **Write the Next Play field like a task, not a description.** "Ask Priya what soured the last agency relationship before pitching" is workable Monday morning; "explore paid media opportunity" is not.
5. **Re-run "Rank my whitespace cells" monthly.** As notes and values change, Claude's read on ease/urgency/confidence shifts too — it's cheap to re-check your own prioritization against a second opinion.

## Troubleshooting

- **The matrix is empty even though I loaded the demo.** Make sure you clicked the **Load demo** button (in the header or inside the guide) rather than just closing the guide — closing it alone does not populate data.
- **My data disappeared after I closed the browser.** Some browsers clear site data for local `file://` pages more aggressively, especially in private/incognito windows. Export a JSON backup after any real work session and keep it somewhere durable.
- **Copy prompt / Copy plan doesn't seem to do anything.** Some browsers block clipboard access on `file://` pages until you interact with the page first, or require a permission prompt. Click anywhere on the page first, or check your browser's address-bar clipboard icon for a blocked-permission indicator. The app also falls back to a manual copy method automatically if the modern clipboard API is unavailable.
- **A Copilot prompt button is greyed out.** "Draft the internal-referral ask" and "Write the expansion pitch" need at least one cell marked Fit or In Play to have something to write about — score a cell first, then pick it from the selector above the three prompt cards.

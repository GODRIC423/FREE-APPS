# Service Productizer — Step-by-Step Guide

Service Productizer turns one more "it depends" quote into a fixed-scope offer you can sell on repeat. It is built for freelancers, consultants, and small service shops who currently price everything by the hour, feel the scope quietly expand on every project, and want a repeatable, sellable package instead — outcome, deliverables, timeline, boundaries, one price, and a delivery checklist, built station by station like a product moving down a line.

## Getting started

Open `apps/25-service-productizer/index.html` directly in any modern browser — the file is fully self-contained (fonts, styles, and logic are all inline; nothing loads from the network). Alternatively, serve the repo root with any static server and navigate to the same path. Your work saves automatically to this browser.

## Walkthrough: from a messy service to a shippable offer

1. **First open.** The "How to use" guide appears automatically on your first visit. Read the eight moves, then press **To the floor**. You land on **The Line** — your offer roster.
2. **See it done well first.** Click **Load demo** in the header. The Kiln & Vance Studio scenario fills the line with three offers: **The Launch Sprint** (shipped and selling), **The Foundations Plan** (ready to launch), and **The Menu Refresh** (a real draft, deliberately still messy — the Risk Gauge flags it). Explore all three, then **Reset** (it asks before clearing anything) when you are ready to build your own.
3. **Start an offer.** From The Line, click **New offer**, or open any existing offer's **Workbench**. Give it a name — short and sellable.
4. **Walk the conveyor.** The Workbench's station rail runs like a belt: **Outcome → Deliverables → Timeline → Boundaries → Price → Checklist**. Click any station to jump straight to it; a green check appears once that station has real content.
5. **Write the outcome first, in one or two sentences.** Everything else in the offer exists to defend this sentence — the concrete result the client walks away with.
6. **List deliverables as countable nouns.** "5 pages," not "a website." Add, edit, reorder with the arrows, or remove (a 7-second **Undo** toast covers mistakes). Do the same for **Boundaries** — the fence that keeps unlisted work from sneaking in for free.
7. **Watch the Risk Gauge.** As you type in Outcome, Deliverables, or Boundaries, the built-in scope-creep lint scans for vague words — "ongoing," "as needed," "support," "help," "flexible," and 20 others — and scores your offer from *Airtight* (green) to *Leaky — rewrite* (red). Click any flagged word to jump straight to it, and read the tip beneath it for how to fix it.
8. **Set one price, generate the checklist, ship it.** On **Price**, pick one number, a currency, and a billing unit — no "starting at." On **Checklist**, click **Generate from deliverables** to seed a work order automatically, then edit it into your real delivery process. Move the **Status** dropdown to *Ready* or *Shipped* when it is genuinely ready. **Spec Sheet** shows the finished client-facing one-pager — print it, copy it as Markdown, or hand it to Claude to write the sales page.

## Using the Claude Copilot desk (with a standard $20 Claude subscription)

The **Claude Copilot** tab needs no API key. Each action composes a complete, expert-grade prompt that embeds your studio profile and offer data as readable markdown:

- **Productize my messy service description** — paste a rambling, priced-by-the-hour description into the box, and get back a complete draft offer: outcome, deliverables, timeline, boundaries, and a defensible price, ready to copy into the builder station by station.
- **Tighten deliverable language** — feeds this offer's *exact* scope-creep lint results (the same hits the Risk Gauge found) into the prompt, then asks for before/after rewrites of every flagged phrase.
- **Write the sales page for this offer** — a complete one-offer landing page: headline, who it's for, what's included, what's not, price, a four-question FAQ, and a call to action.
- **Red-team this offer** — Claude plays a skeptical prospect reading the Spec Sheet for ninety seconds: verdict, the one squishy line, the one clarifying question, a sharper pitch.

Click **Copy prompt**, paste into [claude.ai](https://claude.ai), and paste anything worth keeping into **The Foreman's Notes** at the bottom — it saves with your line.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `?` | Open the How-to-use guide |
| `Esc` | Close dialogs and menus |
| `Ctrl/Cmd + S` | Copy the active offer as Markdown |
| `Ctrl/Cmd + P` | Print the active offer's Spec Sheet |

## Your data & privacy

Everything lives in your browser's localStorage under the key `bizdev:25-service-productizer:v1`. Nothing is ever sent anywhere — there is no network activity at all. **Download JSON** (Export menu) backs up your whole line or moves it to another machine; **Import JSON** restores it (imports pass through validation, so a mangled file simply loads as far as it safely can). **Download roster CSV** gives you a spreadsheet row per offer with price, ship-readiness, and scope-safety score. Clearing browser site data erases the line — keep a JSON copy off the floor.

## Pro tips

- Write Boundaries before Deliverables sometimes — deciding what you will *not* do often clarifies exactly what you will.
- Aim the Risk Gauge at *Airtight* before you ever set status to *Ready*. A 100% Ship Gauge with a *Leaky* Risk Gauge is not actually ready — it just looks ready.
- One price, no ranges. If you genuinely need two packages, build two offers on the line rather than a "starting at" on one.
- Run **Generate from deliverables** on the Checklist station even for offers you have delivered before — it catches any deliverable you added later and forgot to operationalize.
- Duplicate a shipped offer to spin up a variant (rush edition, smaller scope) instead of starting from a blank line — the duplicate lands right next to the original, in Draft.

## Troubleshooting

- **The guide keeps opening on load** — the app could not persist `seenGuide`; your browser is blocking localStorage (private/incognito mode or strict settings). Allow site data for the file.
- **Print shows the app instead of the Spec Sheet** — use the in-app **Print / Save as PDF** button (Spec Sheet tab) or Ctrl/Cmd+P from within the page; the printed document is a clean, ink-economical white-and-black layout by design, separate from the on-screen colors.
- **Copy buttons do nothing** — some browsers restrict the clipboard on `file://` pages. The app falls back automatically; if a toast says copy failed, select the text and copy manually, or serve the folder over `http://localhost`.
- **My import was rejected** — the file must be a JSON previously exported by Service Productizer (or matching its shape). Open it in a text editor and confirm it starts with `{ "v": 1`.
- **The Risk Gauge flagged a word I think is fine** — the lint is deliberately strict; not every flagged word is wrong in context ("check in" as a scheduled call is fine, for instance). Use judgment — the gauge is a prompt to look, not a verdict.
- **Work vanished after switching browsers** — localStorage is per-browser, per-profile. Export JSON on machine A, import on machine B.

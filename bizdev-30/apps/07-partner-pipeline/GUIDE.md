# Partner Pipeline — Step-by-Step Guide

Partner Pipeline is a harbor for your channel partnerships: a four-lane board (Identified → Contacted → Exploring → Active) with a weighted partner fit score, a co-marketing idea list per partner, and intro-request drafts — plus a built-in Claude Copilot that turns your live board into ready-to-paste prompts. It is built for founders, consultants, and BD leads who know partnerships matter but keep them scattered across notes apps and inboxes.

## Getting started

Open `apps/07-partner-pipeline/index.html` directly in any modern browser — the file is fully self-contained (fonts, icons, and styles are embedded; nothing loads from the network). You can also serve the repo root with any static server and browse to the same path.

## Walkthrough

1. **First open.** The "How to run your harbor" guide appears automatically on first visit. Close it with *Cast off* or `Esc`; reopen anytime with `?` or the *How to use* button.
2. **Load the demo.** Click *Load demo* to see a finished harbor: a Shopify-analytics company ("Driftline Analytics") with 8 partners — agencies, a newsletter, a community, complementary apps — spread across all four lanes with scores, ideas, and a live intro draft. Explore it, then *Reset* when you want a clean dock.
3. **Set your home port.** Fill the three fields under the header: your company, your offer (include the price point), and your audience/ICP. These feed the fit conversation and every Copilot prompt.
4. **Log partners.** Click *New partner* (or press `N`). Each partner is a crate card. Click the card name or the pen icon to open its **Cargo Manifest** drawer: kind, lane, contact, their audience, and notes.
5. **Sound the fit.** In the manifest, set three sliders — *Audience overlap*, *Complementarity*, and *Effort to activate*. The dial computes a 0–100 fit score (overlap 40%, complementarity 40%, ease 20%) and a tier: Deep water, Fair tide, or Shallow. Lane headers show each lane's average fit.
6. **Work the lanes.** Drag cards between lanes, or use the left/right arrows on each card, as the relationship moves Identified → Contacted → Exploring → Active. Flag priority partners with the flag button (they get a pennant).
7. **Stack co-marketing ideas.** In the manifest, add concrete ideas ("joint webinar", "co-branded teardown"), and click an idea's status chip to advance it spark → planned → live.
8. **Draft the intro.** Use *Seed a template* in the manifest to generate an intro-request email pre-filled with your port and their details, then edit it in place. Everything autosaves.
9. **Use the First Mate (Claude Copilot).** Pick one of four actions — *Chart partnership angles*, *Draft the partnership pitch*, *Design a rev-share structure*, *Rank my dock*. The panel generates a complete prompt embedding your home port and the relevant partner data (or the whole board). Click *Copy prompt*, paste it into claude.ai — this works with the standard $20 Claude subscription, no API key. Paste the useful parts of the answer into *Log Claude's answer*; it saves with your harbor.
10. **Export.** The *Export* button offers: Copy Markdown manifest (the full harbor as a readable document), Download JSON (complete state, re-importable), Download CSV (flat partner table for spreadsheets), Import JSON, and Print (a clean print stylesheet renders just the manifest).

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `?` | Open the guide |
| `Esc` | Close dialogs / the manifest drawer |
| `N` | New partner |
| `/` | Focus search |
| `Ctrl/Cmd + S` | Copy the Markdown manifest |

## Your data & privacy

Everything lives in your browser's localStorage under the key `bizdev:07-partner-pipeline:v1`. Nothing is transmitted anywhere. Use *Download JSON* for backups or to move machines, and *Import JSON* to restore. Clearing browser data clears the harbor — back up first.

## Pro tips

- Score honestly: a Shallow partner with a warm contact often beats a Deep-water partner with no path in. Use the flag for "warm path exists".
- Keep ideas small and concrete — a single co-published post beats "strategic alliance" as a first project.
- Run *Rank my dock* every Monday and do only the 5-item action list it returns.
- Before a pitch call, run *Design a rev-share structure* so you walk in with numbers, not vibes.
- Deleted a partner by accident? The Undo toast stays up for ~7 seconds.

## Troubleshooting

- **The guide doesn't open with `?`** — click anywhere on the page background first; the shortcut is ignored while you're typing in a field.
- **Copy buttons do nothing** — some browsers restrict the clipboard on `file://` pages; the app falls back to a hidden-textarea copy, but if that also fails, use Export → Download instead, or serve the folder over `http://localhost`.
- **My data vanished** — you may be in a different browser/profile or a private window; localStorage is per-profile. Restore from your last JSON backup via Export → Import JSON.
- **Import says it can't read the file** — it expects JSON exported by this app. Open the file and check it starts with `{ "v": 1`.

# Cadence Composer — Step-by-Step Guide

Cadence Composer turns follow-up from a guilty to-do list into a composed score: multi-channel sequences (email, call, LinkedIn, SMS) laid out on a musical-staff timeline with day offsets, per-step templates, exit rules, and a cadence library. It is built for founders, SDRs, agency owners, and anyone doing business development who knows that the fortune is in the follow-up but keeps improvising it. Everything runs in your browser — no account, no server, no tracking.

## Getting started

Open `apps/13-cadence-composer/index.html` directly in any modern browser — the file is fully self-contained (fonts, styles, and code are all embedded). Alternatively, serve the repo root with any static server and navigate to the same path.

## Walkthrough: first open to exported artifact

1. **First visit.** The "How to compose a cadence" guide opens automatically. Read the seven bars, then press "Take the podium." (Reopen it any time with the `?` key or the "How to use" button.)
2. **Load the demo.** Press **Load demo** in the header. Two finished cadences land in the library: a 21-day, 9-touch new-logo outbound score and a 14-day post-demo close. Click each and study how channels alternate and where the silences sit.
3. **Read the Rhythm View.** The staff shows each touch as a note head on its channel line (Email / Call / LinkedIn / SMS), placed by day offset, with weekly barlines and a double barline at the end. Click any note to jump to and open its step card.
4. **Create your own cadence.** Press **+** in the Cadence library. Name the cadence after the motion ("Re-engage closed-lost Q2"), then fill in the **Goal** (what a win is) and **Persona** (who hears this). Both feed every Copilot prompt, so be specific.
5. **Set the exit rules (the coda).** Tick *Prospect replied*, *Meeting booked*, *Opted out*, and add a custom rule if needed. A cadence without exit rules is spam with a schedule.
6. **Place your touches.** Use the "Add a touch" channel buttons. Each step gets a **day offset**, a **title**, the actual **message copy** (subject line appears for email steps), and a **playbook note** for conditions like "only send if the Day 3 call connected." New touches land two days after your latest step; edit freely.
7. **Refine the rhythm.** Reorder steps with the arrows, delete with the trash icon (a 7-second **Undo** toast appears — no scary confirms), and press "Out of tempo — sort by day" if day offsets fall out of order. Watch the **Channel mix** meter for warnings: all-email monotony, 7-day silences, too-early SMS, or too many total touches.
8. **Export the artifact.** From the **Export** menu: *Copy cadence as Markdown* (also `Ctrl/Cmd+S`) for docs, wikis, or Claude; *Download steps (CSV)* to import into your sequencer; *Download library (JSON)* as a full backup; *Import library (JSON)* to restore or share. Printing the page (`Ctrl/Cmd+P`) produces a clean one-page score sheet of the active cadence.

## Using the Claude Copilot (pairs with a $20 Claude subscription)

The dark panel on the right generates complete, expert-grade prompts that embed your current cadence as readable Markdown. No API key or integration — just:

1. Pick an action: **Draft the touch for a step** (choose the step from the dropdown), **Balance my channel mix**, **Break-up message variants**, or **Critique the whole cadence**.
2. Press **Copy prompt**, then paste into [claude.ai](https://claude.ai) — works with the standard Claude subscription.
3. Paste Claude's answer into the **Paste Claude's answer back** notes area; it autosaves with your library.

## Keyboard shortcuts

| Keys | Action |
|------|--------|
| `Ctrl/Cmd + S` | Copy the active cadence as Markdown |
| `?` | Open/close the how-to guide |
| `Esc` | Close modals, menus, and open step editors |

## Your data & privacy

Everything is stored locally in your browser under the localStorage key `bizdev:13-cadence-composer:v1`. Nothing is sent anywhere. Clearing site data erases your library, so use **Export → Download library (JSON)** for backups; **Import library (JSON)** restores them on any machine.

## Pro tips

- Keep 3–5 named cadences on the shelf: new-logo outbound, post-demo close, re-engage closed-lost, referral thank-you, renewal. Use **Duplicate** (hover a library card) to spin variations per persona.
- Write the break-up touch first. Knowing how the story ends makes every earlier touch calmer and better.
- Put conditions in playbook notes, not in your head — "never cold-text" rules survive handoffs to a VA or new SDR.
- Aim for 7–9 touches across 18–24 days for cold motions; front-load days 0–7, then breathe.
- Run "Critique the whole cadence" in Claude *before* the first send, not after week one flops.

## Troubleshooting

- **The page is blank after opening the file.** Some corporate browsers block local files — serve the folder with any static server (`npx serve .`) instead.
- **Copy buttons say the clipboard was blocked.** Browsers only allow clipboard writes on secure contexts or direct file pages; use the Export menu's download options, or serve over `http://localhost`.
- **My cadences disappeared.** You likely cleared browser storage or switched browsers/profiles. Import your last JSON backup; going forward, export after any big editing session.
- **Import says "not valid Cadence Composer JSON."** Only files produced by *Download library (JSON)* import cleanly. Open the file and check it contains a top-level `"cadences"` array.
- **Print shows the whole app, not the score sheet.** Make sure a cadence is selected (the print sheet renders the *active* cadence only).

# Cold Email Forge — Step-by-Step Guide

Cold Email Forge is a single-file cold-email sequence editor for founders, freelancers, and SDRs who send their own outbound. You build a 3–5 step sequence with merge fields and A/B subject slots, and a live lint engine — spam heat, forge weight (length), and me-vs-you balance — scores every step until it "passes the delete test": the two seconds a busy prospect gives your email before deleting it. It pairs with a standard $20 claude.ai subscription through built-in Copilot prompts, so you get expert rewrites and critiques without an API key.

## Getting started

Open `apps/02-cold-email-forge/index.html` directly in any modern browser — it is fully self-contained (fonts, icons, and graphics are embedded; nothing loads from the network). You can also serve the repo root with any static server and browse to the same path. Your work saves automatically to your browser's localStorage.

## Walkthrough: first open to exported artifact

1. **Read the guide.** On first open, "How to work the forge" appears automatically. Skim it, then press `Esc` or click "To the anvil". Reopen any time with `?` or the "How to use" button.
2. **Load the demo.** Click **Load demo** in the top bar. You get a finished four-strike sequence — a post-funding RevOps outreach campaign — so you can see what "done well" looks like: day offsets, goals, A/B subjects, and bodies that all score TEMPERED.
3. **Describe the job.** In the right rail under "What are we forging?", set the **sequence name**, a **narrow audience** (who exactly receives this), and your **offer** in one line. Copilot prompts embed all three.
4. **Cast the Prospect Ingot.** Fill the eight sample merge values — `{{first_name}}`, `{{company}}`, `{{role}}`, `{{pain_point}}`, `{{trigger_event}}`, `{{my_name}}`, `{{my_company}}`, `{{calendar_link}}`. These resolve your tokens in the preview and travel with every prompt.
5. **Strike your steps.** Click **Strike a new step** (max five). For each step, set the **send day** (its offset from day 0), an italic **goal** ("Earn the open", "The break-up"), and write the **plain-text body**. Click any merge chip under the body to insert that token at your cursor.
6. **Fill both subject slots.** Write a subject **A** and a challenger **B** per step, then click the A/B badge to choose which one is active in previews and exports. The counter turns gold when you are under 55 characters and 8 words.
7. **Hammer against the Forge Inspection.** Each step is linted live:
   - **Spam heat** — trigger phrases ("act now", "guarantee"…), ALL-CAPS words, multiple exclamation marks, more than one link. Aim for CLEAN.
   - **Forge weight** — word count with the 40–120 ideal band marked on the bar.
   - **Me vs you** — first-person vs second-person pronoun balance; the email should be about *them*.
   These roll up into each step's temper ring (aim 80+ = TEMPERED) and the big Sequence Temper dial in the hero.
8. **Run the Quench Test.** The preview panel shows the exact plain text a prospect receives — "This step" or "Full run". Sample values render gold; missing values render red so you catch broken tokens before sending.
9. **Reorder and prune.** Use the up/down chevrons to reorder strikes and the trash button to scrap one — an **Undo** toast gives you 7 seconds to change your mind. The "Firing order" strip shows all strikes on a day timeline; click a node to jump to it.
10. **Call the Forge Hand (Claude Copilot).** Pick an action: *Re-strike this step for the prospect*, *Forge 5 subject variants*, or *Brutal critique — the delete test*. Each generates a complete prompt embedding your sequence, prospect, and lint scores. Click **Copy prompt**, paste it into claude.ai (works with the standard $20 Claude subscription — no API key), then paste Claude's answer into **Quench notes**, which saves with your sequence.
11. **Export.** From the **Export** menu: **Copy Markdown** (the full artifact, also `Ctrl/Cmd+S`), **Copy plain text** (merge fields resolved — ready to paste into your sending tool), **Download JSON** (complete backup), **Import JSON** (restore a backup), or **Print forge sheet** (a clean printable sheet of the whole sequence).

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `?` | Open the how-to guide |
| `Esc` | Close dialogs / disarm reset |
| `Ctrl/Cmd + S` | Copy the sequence as Markdown |
| `[` / `]` | Select previous / next strike |

## Your data & privacy

Everything lives in your browser's localStorage under the key `bizdev:02-cold-email-forge:v1`. Nothing is ever sent anywhere — there are zero network calls. Use **Download JSON** for backups or to move between machines, and **Import JSON** to restore. **Reset** (click twice to confirm) clears the forge.

## Pro tips

- Write the body first, subjects last — the best subject is usually a phrase already sitting in your first two lines.
- Keep exactly one ask and one link per step; the spam meter flags a second link for a reason.
- A day-3 bump that adds a *new* number beats "just checking in" every time — see the demo's Strike 2.
- Use slot B as a genuine challenger, not a typo variant: different psychology (curiosity vs direct), not different wording.
- Run the *Brutal critique* prompt when your sequence averages 80+ — Claude finds the weaknesses the lint math can't.

## Troubleshooting

- **The `?` key doesn't open the guide.** Click outside any text field first — shortcuts pause while you type.
- **Copy buttons do nothing.** Some browsers block the clipboard on `file://` pages. Use Export → Download JSON, or select the prompt text (it auto-selects on focus) and copy manually.
- **A token shows red in the preview.** That merge field has no sample value in the Prospect Ingot — fill it, or the token exports as `[token]` in plain text.
- **My work disappeared.** localStorage is per-browser and per-profile; private/incognito windows discard it on close. Re-import your JSON backup, and keep one after each session.
- **Import fails.** The file must be a JSON export from this app (or match its shape). Corrupt files are rejected safely without touching your current state.

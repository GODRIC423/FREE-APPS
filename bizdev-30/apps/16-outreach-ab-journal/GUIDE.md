# Outreach A/B Journal — Step-by-Step Guide

Outreach A/B Journal is a lab notebook for anyone who sends cold outreach — founders, SDRs, agency owners, freelancers. Instead of guessing which message "feels better", you log every A/B trial (copy, channel, sends, replies, meetings), and the journal does honest statistics on top: reply rates with 95% confidence whiskers, a significance read, and blunt small-sample warnings so you never ship a fake winner. Concluded tests produce one-sentence learnings you pin to an Insight board — your accumulating, evidence-backed playbook.

## Getting started

Open `apps/16-outreach-ab-journal/index.html` directly in any modern browser — it is fully self-contained (no server, no internet, no account). You can also serve the repo root with any static server and browse to the same path.

## Walkthrough

1. **First open** — the "How to run your bench" guide appears automatically. Read it once; press `Esc` or "Start testing" to close. It won't auto-open again (press `?` anytime to bring it back).
2. **Load demo** (header) — fills the notebook with six realistic experiments across email, LinkedIn, call, and SMS, including one clearly significant winner, one dead heat, and one too-small sample. Use it to learn how to read the cards.
3. **Log a new experiment** — click **New experiment** (or press `n`). Give it a title, a falsifiable hypothesis, a channel, the audience, and the exact copy for Variant A (control) and Variant B (challenger). Enter sends/replies/meetings if you already have counts.
4. **Record results daily** — expand a card (chevron) and use the `+1` / `+10` steppers next to sent, replies, and meetings on each variant. Corrections go through the pencil (edit) button.
5. **Read the chart and honesty strip** — each card draws A and B reply-rate bars with 95% Wilson confidence whiskers. The tinted strip below tells you what the sample can actually claim: "Sample too small to call", "Directional lean", "B is ahead (~95% confidence)", etc., with the z-score and relative lift. Believe the strip, not your gut.
6. **Conclude & record the learning** — when the strip says the result is real (or the test is dead), click **Conclude & record learning**, stamp a verdict (A wins / B wins / no difference / inconclusive), and write one sharp sentence about what the test proved.
7. **Pin to the Insight board** — concluded learnings get a **Pin** button. The yellow board on the right collects only proven patterns; it becomes your playbook over time.
8. **Use the Claude Copilot** — three lab-assistant actions build complete prompts embedding your live journal: *Design my next A/B test*, *Explain why the winner won* (pick which experiment), and *Turn learnings into a playbook*. Click **Copy prompt**, paste into claude.ai — works with the standard $20 Claude subscription, no API key. Paste the useful parts of Claude's answer into the "Claude's findings" box; it saves with your journal.
9. **Export** — the Export menu offers: Copy journal as Markdown (also `Ctrl/Cmd+S`), Download JSON (full state backup), Download CSV (per-variant results for spreadsheets), and Import JSON (restores a backup). Printing the page produces a clean paper journal of the log.

## Keyboard shortcuts

| Key | Action |
|---|---|
| `n` | New experiment |
| `?` | Open the how-to guide |
| `Ctrl/Cmd + S` | Copy the journal as Markdown |
| `Esc` | Close any modal, drawer, or menu |

## Your data & privacy

Everything lives in your browser's localStorage under the key `bizdev:16-outreach-ab-journal:v1`. Nothing is ever sent anywhere — there are zero network calls. Use **Export → Download JSON** for backups and **Import JSON** to restore or move machines. **Reset** offers a one-click backup before erasing.

## Pro tips

- **One variable per trial.** If A and B differ in subject *and* CTA, a win teaches you nothing. Hold everything else constant.
- **Pre-commit your sample.** Decide "50 sends per arm, then we read it" before you start — the warning strip will keep you honest mid-flight.
- **Meetings > replies.** A variant can win replies and lose meetings (see the demo's CTA test). Log both and read both rates.
- **Write learnings as rules.** "Name the metric in the subject line" is reusable; "B won" is not.
- **Batch your logging.** Ten seconds with the `+1`/`+10` steppers at end of day beats reconstructing counts from your sent folder on Friday.

## Troubleshooting

- **The guide didn't open / shortcuts don't work** — click once on the page background first (a focused text field captures letter keys by design), then press `?`.
- **"Copy" seems to do nothing** — some browsers restrict the clipboard on `file://` pages; the app falls back automatically, but if it still fails, use **Preview** on a Copilot prompt and copy manually, or use Export → Download.
- **My data disappeared** — private/incognito windows discard localStorage on close, and clearing site data erases it. Restore from your JSON backup via Export → Import JSON.
- **Import says "not a journal file"** — the file must be JSON exported by this app (it needs an `experiments` or `insights` array). Re-export from the source browser.
- **Numbers look wrong after an edit** — rates are computed live from sent/replies; check you edited the intended variant arm (A is blue, B is red).

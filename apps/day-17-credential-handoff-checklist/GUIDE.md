# Credential Handoff Checklist — Step-by-Step Guide

Credential Handoff Checklist is a local-first access-custody tracker for small teams: it inventories every system someone can log into (who owns it, who backs them up, where the credential lives, MFA status, rotation dates), flags custody risks, scores overall health, and generates offboarding revocation runbooks — while a hard lint guarantees the app itself never stores an actual password, token, or key. It is for founders, office managers, and ops leads who need to hand access over (or take it away) without secrets ending up in a spreadsheet.

## Getting started

- Open `index.html` directly in any modern browser, or
- Serve the folder locally and browse to it:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/apps/day-17-credential-handoff-checklist/` (adjust the path to where you serve from). No install, no build step, no network access needed.

## Step-by-step walkthrough

1. **Open the app and read the guide.** On first visit the "How to use" dialog opens automatically. Close it with the ✕ button or `Esc`; reopen anytime with the header button or `?`. The red notice at the top states the one rule: metadata only, never secrets.
2. **Load the demo (optional).** Click **Load demo** in the header. Six realistic systems appear — a super-admin login, an API key with an overdue rotation, a registrar account with no MFA and no backup owner, and a contractor's database access queued for revocation. This is the fastest way to see every feature working.
3. **Add your first system.** In panel 01, fill in the system name and primary owner (both required — missing ones are highlighted inline), pick the access type and level, set the MFA status, name a backup owner, and record **where the credential lives** as a reference label only (e.g. `Password manager › "Registrar login" item`). Click **Save system**.
4. **Watch the secret lint.** Try pasting anything password-shaped into a field — `password: hunter42!x`, an `sk-…` key, a JWT, a long random string. A warning appears while you type, and **Save system** is hard-blocked until you remove it. Imported JSON gets the same treatment: password-shaped content is scrubbed before it can be stored.
5. **Set rotation and tick controls.** Give each system a next-rotation date and tick only the custody controls you have actually verified (backup confirmed, revocation path documented, least privilege reviewed, storage reference verified, no secret stored). Anything unticked becomes a risk flag.
6. **Read the risk register and health score (panel 02).** Every gap is listed with a severity: critical (a secret may be stored), high (no MFA, no backup owner, stale rotation), medium, low. The ring shows the custody health score: each system starts at 100, loses points per flag by severity, and Owner/Admin/Billing systems count double in the average. The stat strip at the top mirrors this live.
7. **Move systems across the custody board (panel 03).** Each card advances Intake → Verify → Handoff ready → Revoke / remove. Use **Advance →** as custody checks complete, **Edit** to reopen a card in the editor, and **Delete** (a toast offers 7 seconds of Undo).
8. **Generate an offboarding runbook (panel 04).** Pick the person leaving from the dropdown (names come from owners and backup owners automatically). You get an ordered checklist — highest privilege first — with revoke, rotate, reassign, and verify steps per system. Tick steps as you complete them; the progress bar and the exported Markdown (`Copy runbook`) track completion.
9. **Export the custody report (panel 05).** **Copy custody report** puts the full Markdown draft on your clipboard (summary, risk register, inventory, rotation schedule, active runbook, approval boundary). **Download JSON** saves the full state, **Import JSON** restores it, **Download CSV** exports the inventory table, and **Print report** produces a clean printable document. Every export is a draft for human review.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `?` | Open the "How to use" guide |
| `Esc` | Close the guide dialog |
| `Ctrl/Cmd + S` | Copy the custody report (Markdown) |

## Your data & privacy

Everything lives in your browser's `localStorage` under the key `fable-remake:day-17-credential-handoff-checklist:v1`. Nothing is sent anywhere — no accounts, no cookies, no analytics, no network requests. **Download JSON** is your backup; **Import JSON** restores it (validated and lint-scrubbed on the way in). **Reset all data** in panel 05 wipes the app after a confirmation.

## Tips & good practice

- Inventory by blast radius: start with Owner/Admin/Billing access (registrar, email admin, payments) — those gaps cost double in the health score for a reason.
- The storage reference should let a colleague *find* the credential, never *read* it: password-manager item names, vault paths, "in the office safe" are all fine.
- Run the offboarding runbook top-down and rotate any shared credential (API keys, shared inboxes) even if the person "probably" never saved it.
- Treat "Handoff ready" as a gate, not a default: a system belongs there only when its flags are clear and a human has verified each control.
- Re-export the custody report after every offboarding and keep it with your ops records — it is your evidence that access was actually revoked.

## Troubleshooting

- **My data disappeared.** localStorage is per browser and per profile. Check you are in the same browser/profile and opening the app from the same path (a different port or folder counts as a different origin). Restore from your last JSON export if needed.
- **Save is blocked and I do not know why.** The lint box above the save button lists the field and the pattern it matched (e.g. "high-entropy string"). Replace the flagged text with a plain-language label. If a legitimate value keeps triggering it (e.g. a very long random-looking system name), shorten or simplify it — the lint errs on the side of blocking.
- **Import fails.** The file must be JSON exported by this app (or matching its shape). Open it in a text editor and confirm it is valid JSON; the importer accepts either the raw state or the `{ "state": … }` wrapper.
- **Printing shows the whole app instead of the report.** Use the **Print report** button (or the browser's print dialog on the same page) — the print stylesheet hides the app chrome and prints only the generated custody report.

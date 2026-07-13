# Intake Form Builder — Step-by-Step Guide

Intake Form Builder is a local-first design desk for service intake forms: the form a customer fills out when they need a plumber, an HVAC tech, a repair shop, or any service team to take on a job. You design the questions — types, sections, required flags — watch a live preview of what the requester will see, and get a live privacy/PII audit plus a health score with itemized reasons. It is built for small service businesses and ops folks who want to think a form through *before* it goes anywhere near a website builder or CRM. Nothing is published and no customer data is ever collected: the output is a reviewable spec (Markdown, JSON, CSV, or print).

## Getting started

- Easiest: open `index.html` directly in any modern browser.
- Or serve the folder locally and browse to it:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/apps/day-20-intake-form-builder/` (adjust the path to wherever you serve from). No install, no build step, no network access needed.

## Step-by-step walkthrough

1. **Take the tour.** On your very first visit the "How to use" guide opens automatically. Close it with the ✕ button or `Esc`; reopen it any time with the **How to use** button or the `?` key.
2. **Load the demo (recommended first run).** Click **Load demo** in the header. You get a realistic "Emergency HVAC intake" form for a fictional heating company: nine fields across Contact, Job details, Urgency, Scheduling, Proof & files, and Consent. Every panel lights up so you can see how the pieces connect before starting your own form.
3. **Set the form's context.** In **1 · Form settings**, name the form, name the business/team, and write the intake goal — one sentence about what the form must learn to route a job. Pick the channel (website form, phone screen, …) and a response promise. Leave the promise at "No promise yet" unless the team has signed off — the audit flags any promise as needing approval. Write the internal privacy rule: the thing this form must never ask for. Everything autosaves as you type.
4. **Add fields.** Click **+ Add field** in **2 · Fields**. An editor opens in place: write the question label, pick a type (short/long text, single choice, checklist, date, time window, phone, email, address, number, file upload), choose a section, and tick Required if the job truly cannot be routed without it. For choice fields, list the options separated by `|` (e.g. `Emergency | This week | Planning ahead`). For other types the same box holds a one-line helper hint. Save, and the field appears as a card.
5. **Edit, duplicate, reorder.** Every card has **Edit** (reopens the in-place editor), **Duplicate** (clones the field right below), **Delete** (with a 7-second **Undo** toast), and ↑/↓ buttons. You can also drag a card by its ⋮⋮ handle to reorder. Cards show live badges: the section, the type, required/optional, a yellow **PII** badge on personal-data fields, and a red **sensitive?** badge if the label or helper text looks like it asks for regulated data.
6. **Watch the live preview.** **3 · Live preview** renders the requester's view, grouped by section with realistic mock inputs — dropdowns show their first option, checklists render their choices, file fields show an upload box. This is exactly the order and grouping your exports will use.
7. **Read the audit and health score.** **4 · Privacy audit & health** recomputes on every keystroke. **Blockers** are sensitive-data asks (passwords, SSNs, card or bank numbers, ID documents, health data, protected characteristics) and structural failures like no contact path. **Warnings** cover missing consent when you collect contact details, required-field overload, forms that are too long or too short, choice fields without options, duplicate questions, file-upload metadata risk, and data-minimization pressure when four or more PII fields pile up. **Info** notes inventory the personal data you collect. The health score (0–100) lists every point gained or lost — fix a flag and watch the score respond.
8. **Export the spec.** In **5 · Export & handoff**, the Markdown spec preview updates live. Use **Copy Markdown** (or `Ctrl/Cmd+S`) to paste it into a doc or ticket, **Download .md / JSON / CSV** for files, or **Print** for a clean paper/PDF version of the preview plus audit. Every export is labeled a draft for human review — publishing is deliberately out of scope.
9. **Round-trip your work.** **Download JSON** captures the full draft (settings, fields, audit, health). **Import JSON** restores it — on another machine, in another browser, or as a backup before big edits. **Reset** (with confirmation) clears the draft.

## Keyboard shortcuts

| Keys | Action |
| --- | --- |
| `?` | Open the How-to-use guide |
| `Esc` | Close the guide / cancel an in-place field edit / dismiss the toast |
| `Ctrl`/`⌘` + `S` | Copy the Markdown spec to the clipboard |

## Your data & privacy

- Everything lives in your browser's `localStorage` under the key `fable-remake:day-20-intake-form-builder:v1`. Nothing is sent anywhere — there is no network code in this app.
- **Backup / move:** Download JSON, then Import JSON on the other side.
- **Start over:** the Reset button clears the draft (it asks first). Clearing your browser's site data does the same.
- Because storage is per-browser and per-profile, a form drafted in Chrome will not appear in Firefox or in a private window.

## Tips & good practice

- **Ask only what routes the job.** Every extra field costs completions. If a detail can wait until booking or the site visit, cut it — the data-minimization warning exists for a reason.
- **One open question beats five closed ones.** A "describe what's going on" long-text field catches everything your dropdowns forgot.
- **Make consent explicit.** If you collect a phone number or email, add a Consent-section question asking permission to use it. The audit rewards it and your customers notice.
- **Use sections to pace the form.** Contact → Job details → Urgency → Scheduling reads like a conversation; twelve fields in one wall does not.
- **Treat "required" as a tax.** Only fields the dispatcher genuinely cannot work without should be required; the audit flags required overload above 75%.

## Troubleshooting

- **"My draft disappeared."** You are almost certainly in a different browser, profile, or a private/incognito window — localStorage does not cross those boundaries. Reopen the browser/profile you drafted in, or restore from an exported JSON.
- **"Copy Markdown does nothing."** Some browsers block the clipboard on `file://` pages. Select the spec text in the export panel and copy manually, or serve the folder with `python3 -m http.server`.
- **"Drag and drop won't reorder."** Use the ↑/↓ buttons on each card — they always work, including on touch screens where the drag handle is hidden.
- **"Import JSON failed."** The file must be JSON exported by this app (or at least contain `settings`/`fields` in the same shape). Anything unrecognized is safely ignored rather than crashing, but a non-JSON file is rejected outright.

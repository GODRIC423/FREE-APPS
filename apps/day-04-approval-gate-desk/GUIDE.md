# Approval Gate Desk — Step-by-Step Guide

Approval Gate Desk is a human review queue for AI-drafted customer messages. It is built for small service businesses (and anyone else using AI to draft replies) that want a hard rule: no AI-written message reaches a customer until a person has approved it. The desk gives you a filterable queue, automatic risk flags, inline editing, a rejection-reason taxonomy, and an append-only, hash-chained decision log you can export as an audit trail. Everything runs locally in your browser.

## Getting started

- **Easiest:** double-click `index.html` (or drag it into a browser tab).
- **Local server (optional):** from the repo root run `python3 -m http.server 8000` and open `http://localhost:8000/apps/day-04-approval-gate-desk/`.

On your first visit the "How to use" guide opens automatically. The app follows your system light/dark preference until you pick a theme with the toggle in the header.

## Step-by-step walkthrough

1. **Load the demo.** Click **Load demo** in the header. You'll see eight realistic AI-drafted messages (SMS, email, portal, etc.) across every status, plus four decisions already in the log. This is the fastest way to understand the desk; you can reset or overwrite it at any time.

2. **Set your reviewer name.** Type your name in the **Reviewer** field at the top of the Review pad. Every decision you make is stamped with this name in the audit log — that's what makes the log meaningful later.

3. **Work the queue.** The left panel lists drafts sorted by urgency: pending first, then by risk (High before Low), oldest first. Use the status pills (All / Pending / Revision / Approved / Rejected), the **Risk** dropdown, and the search box to narrow the list. The stat strip at the top shows pending count, high-risk pending, approvals, and total logged decisions live.

4. **Open a draft and read the risk flags.** Click a queue card (or press J/K). Under the message you'll see flags the desk detected automatically: guarantees and absolute promises, pricing/discount commitments, urgency pressure, legal/warranty exposure, and possible personal data. Flags roll up into a Low/Medium/High risk level. If you disagree, set **Risk override** manually — the override is noted in exports.

5. **Edit the message inline before approving.** Fix wording directly in the message box. The moment your text diverges from the original AI draft, an "Edited before approval" badge appears and a collapsible **Original AI draft** panel shows what the AI wrote, with a **Revert to original** button. Why it matters: the audit log distinguishes "approved" from "approved with edits", so you can see how often the AI needs human correction.

6. **Decide.** Click **Approve** (or Ctrl/Cmd+Enter), **Request revision**, or **Reject**. Rejecting opens a drawer where you must pick a reason from the taxonomy — overpromise, unauthorized pricing, tone mismatch, factual error, privacy exposure, policy violation, wrong context, or other — plus an optional note. Revision requests use the same drawer with the reason optional. Approved and rejected drafts lock; use **Reopen for review** to put one back in the pending queue (the reopen itself is logged).

7. **Check the decision log.** Every decision appends a timestamped entry: action, customer, channel, reviewer, reason, note, whether the message was edited, and a snapshot of the message text. Entries are hash-chained — each one contains the previous entry's hash — so the badge reads "Chain intact" only while the stored history is untouched. There is no delete or edit button for log entries by design.

8. **Export & handoff.** From the bottom panel: **Copy Markdown packet** (queue snapshot + open drafts + full decision log), **Download JSON backup** (complete state, re-importable), **Download audit CSV** (one row per decision, including hashes), or **Print report** for a clean paper/PDF audit document. **Import JSON…** restores a backup. Every export states the boundary: these are drafts for human review; nothing is sent from this app.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `?` | Open the How-to-use guide |
| `Esc` | Close the guide / cancel the reject drawer |
| `Ctrl/Cmd + S` | Copy the Markdown packet |
| `Ctrl/Cmd + Enter` | Approve the selected draft |
| `J` / `K` | Next / previous draft in the queue |

## Your data & privacy

- Everything is stored in your browser's `localStorage` under the key `fable-remake:day-04-approval-gate-desk:v1`. Nothing leaves your machine — no accounts, no cookies, no network requests.
- **Download JSON backup** exports your full state; **Import JSON…** restores it (imports are validated, so a corrupt file can't crash the app).
- **Reset all data** clears drafts and the log after a confirmation. Deleting a single draft shows an Undo toast for 7 seconds.
- Because storage is per-browser and per-profile, your data won't follow you to another browser unless you export/import it.

## Tips & good practice

- **Reject with the real reason, not "other".** The taxonomy is how you spot patterns — if half your rejections are "overpromise", your AI prompt needs a guardrail about guarantees.
- **Treat Medium risk as "read twice".** The flags are heuristics; a discount you actually authorized is fine to approve — the point is that a human confirmed it.
- **Prefer "approve with edits" over rewriting outside the desk.** Editing inline keeps the before/after pair in the log, which is your evidence of human oversight.
- **Export the audit CSV on a schedule** (weekly works well) and file it with your business records — the hash chain only proves integrity while the data exists.
- **Reopen instead of re-creating.** If an approved message becomes wrong (schedule changed, price changed), reopen the draft so the log shows the full history.

## Troubleshooting

- **"My data disappeared."** You're almost certainly in a different browser, profile, or private/incognito window — `localStorage` is per-profile. Import your latest JSON backup to restore.
- **"Chain broken at #N" appears in the decision log.** The stored history was modified outside the app (hand-edited localStorage or an edited JSON import). The data is still shown, but the badge flags that entries after that point can't be treated as untouched. Restore a known-good backup if you need a clean chain.
- **The Approve button seems to do nothing.** The draft needs a customer name and message text — the missing field is outlined in red. Also note that approved/rejected drafts are locked; reopen them first.
- **Copy buttons don't work when opening the file directly.** Some browsers restrict the clipboard on `file://` pages. The app falls back to a manual copy, or use the download buttons / run a local server instead.

# LinkedIn Cadence Planner — Step-by-Step Guide

The Cadence Desk is a BD content engine for LinkedIn, styled as a newsroom composing stone. It gives you one place to bank hooks, file drafts against LinkedIn's real character limits, plan a month on a calendar, and keep a "wire" of reposts and comments running alongside your own posts. It's built for founders, consultants, fractional operators, and BD/sales leads who use LinkedIn to build pipeline and need a repeatable weekly cadence instead of scattered, one-off posting. Everything runs in your browser; nothing leaves your machine.

## Getting started

Open `apps/09-linkedin-cadence-planner/index.html` directly in any modern browser — it is fully self-contained (fonts, styles, and code are all inlined, zero network calls). Alternatively, serve the repository root with any static server and navigate to the same path. No install, no account.

## Walkthrough

1. **First open.** The "How this desk works" guide opens automatically on your first visit. Close it with `Esc` or the button; reopen anytime with `?` or the **How to use** header button.
2. **Set your editorial slate.** In the right rail, fill in **Niche**, **Audience**, and **Voice notes**. This is small but load-bearing — every Copilot brief below embeds this profile, so a sharp slate makes every generated hook and post sound like you.
3. **Load the demo edition.** Click **Load demo** in the header to see a full month "done well" — a fractional CFO's complete cadence: 13 posts across all four types, a ten-hook bank, and a working wire queue. Reset (with confirmation) whenever you want a blank desk.
4. **Bank hooks before you write posts.** Open the **Hook Bank** tab. File first lines by type — Contrarian, Story, How-to, Proof — each with a live counter against the 210-character "before the fold" limit (what LinkedIn shows before "…see more"). Filter by type or search; edit or delete any hook (deletes show an Undo toast).
5. **File drafts on the Front Page.** Switch to **Front Page** and click any calendar day to open a fresh draft, or click an existing post to edit it. The month grid shows each post's type tag and status glyph (idea / drafted / scheduled / posted) at a glance. Use the arrows to move between months.
6. **Write against the fold.** In the post editor (opens from any calendar day or the Copy Desk), fill **Hook**, **Body**, and **CTA**. Two gauges track you live: the hook gauge marks the 210-character fold; the full-post gauge marks LinkedIn's 3,000-character ceiling. Assign a date and status, or leave it unscheduled as an idea.
7. **Work the Copy Desk.** This tab lists every draft, filterable by status and type, with both character counts shown inline so you can spot fold-breakers and over-length posts before you schedule them.
8. **Run the Wire.** On **The Wire** tab, queue thoughtful comments and reposts by day of week, each with a required "angle" note — no drive-by "great post!" entries allowed. Check items off as you complete them through the week; deleting shows an Undo toast.
9. **Hire the Rewrite Desk.** In the right rail, the Claude Copilot panel offers four actions: **10 hooks from my niche**, **Expand this draft into a post**, **Critique this post's first line**, and **Plan next month's cadence**. Each builds a complete, ready-to-paste prompt from your live data. Click **Copy prompt**, paste it into claude.ai — it works with the standard $20 Claude subscription, no API key needed. Paste anything useful back into **Wire copy from Claude** below the panel; it saves automatically.
10. **Export the edition.** The **Export** menu offers: Copy Markdown plan (the full edition — slate, calendar, drafts, hook bank, wire), Download JSON (full state, for backup or moving machines), Download calendar CSV (feeds a scheduler or spreadsheet), Import JSON, and Print the edition (a clean, print-styled artifact). `Ctrl/Cmd+S` copies the Markdown plan from anywhere.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `?` | Open the how-to guide |
| `Esc` | Close the open dialog, menu, or editor |
| `Ctrl / Cmd + S` | Copy the edition plan as Markdown |
| `N` | File a new draft (when not typing in a field) |

## Your data & privacy

All data lives in your browser's localStorage under the key `bizdev:09-linkedin-cadence-planner:v1`. Nothing is sent anywhere — the app makes zero network requests. Use **Export → Download JSON** for backups or to move to another machine, and **Export → Import JSON…** to restore. Clearing browser site data erases the desk, so export before you clean.

## Pro tips

- **Write hooks in batches, posts one at a time.** Ten banked hooks removes the blank-page problem for weeks; drafting one post at a time keeps the body honest to what actually happened.
- **Chase the 3/week line, not perfection.** The weekly cadence meter targets 3 posts/week — a sustainable rhythm beats a burst-and-vanish pattern every time.
- **Treat the fold like a headline.** If the hook alone can't earn the click on "…see more," rewrite it before touching the body — the Critique action exists exactly for this.
- **Give the wire a real angle, every time.** A comment with no point of view is invisible; the required angle field is there to stop you from wasting the fifteen seconds.
- **Run "Plan next month's cadence" before the month starts,** not mid-slump. It balances your type mix against what you already ran and reuses unfired hooks from the bank.

## Troubleshooting

- **The guide doesn't reopen with `?`** — click into empty page space first; the shortcut is ignored while you're typing in a field.
- **Copy prompt / Copy plan does nothing** — some browsers block clipboard access on `file://` pages. The app falls back automatically; if it still fails, select the text in the source field manually.
- **My JSON import was rejected** — the file must be a JSON export from this app. It should parse as an object with `posts`, `hooks`, and `queue` arrays; anything else falls back to a blank desk instead of crashing.
- **A hook or draft won't fit the fold** — the character counters turn underlined when over budget; that's the point. Trim, don't ignore — LinkedIn truncates ruthlessly on mobile.
- **The calendar looks empty after Reset** — Reset clears everything in this browser only. Load the demo to see a working example again, or Import a previously exported JSON backup.

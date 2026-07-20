# Champion Tracker — Step-by-Step Guide

Champion Tracker is a constellation-styled stakeholder map for anyone running a multi-person B2B deal — founders selling direct, account executives, and sales-led consultants who keep getting surprised when "our guy" goes quiet. You place every stakeholder on an influence × support grid, wire the real relationships between them, track exactly one (or two) champion candidates against an 8-point readiness checklist, and let the app flag single-threading and cold blockers before they cost you the deal. Everything runs in one HTML file in your browser — no account, no server, no data leaving your machine.

## Getting started

Open `apps/22-champion-tracker/index.html` directly in any modern browser — it is fully self-contained (fonts, icons, and code are all embedded). Alternatively, serve the repo root with any static server and browse to the same path. On first open, the "How to build a champion map" guide appears automatically.

## Walkthrough

1. **Load the demo constellation.** Click *Load demo* in the header. You get two finished accounts: Meridian Health Systems (six stakeholders, a proven champion, a queued warm-up plan, one live risk flag) and Comstock Regional Clinics (a single early contact, deliberately at risk). Study the contrast, then reset when you are ready to build your own.
2. **Create your account.** Click *New account*, name it, set the deal stage and size, and write one paragraph under *What we're selling here*. Every Copilot prompt gets sharper once that exists.
3. **Place your stars.** On the Constellation tab, click *Add* to drop a new stakeholder, then either drag their star across the grid — **influence** left to right, **support** bottom to top — or open the side panel and use the sliders. A focused star also responds to arrow keys. Give each one a role tag: economic buyer, champion, coach, end user, influencer, gatekeeper, or blocker.
4. **Wire the connections.** Open any stakeholder and toggle who they are connected to. The lines that appear on the constellation are your real path through the org — who actually talks to whom — not the org chart HR would hand you.
5. **Track your champion candidate.** Check "Track as champion candidate" on whoever might carry this deal for you when you are not in the room. Their star turns gold and starts to twinkle. Open the **Champion readiness** tab and work through the 8-criteria checklist honestly — the readiness dial updates live as you check items off.
6. **Queue relationship actions.** On the **Actions queue** tab, add who to warm and exactly how, sorted into This week / This month / Someday. Check items off as you complete them; deleting one gives you an Undo toast, not a confirm dialog.
7. **Watch the threading-risk tab.** After every real conversation, update influence, support, and *Last touched*. **Threading risk** automatically flags single-threaded deals, a missing economic buyer, an unproven champion, a blocker gone cold, and accounts where nobody with real power is engaged — with a one-click *Queue action* to start fixing it.
8. **Run Copilot, then export.** Open Copilot (`C`): plan to win over your current skeptic, draft a champion-enablement one-pager, or get a full threading-risk assessment. Copy the prompt into [claude.ai](https://claude.ai) — it works with the standard $20 Claude subscription, no API key. Paste the answer back into the notes area, then fold the useful parts into your notes or the actions queue. Export: copy the account map as Markdown (`Ctrl/Cmd+S` does the same), download JSON as a full backup, or download every stakeholder across every account as CSV for your CRM. Print gives a clean paper account brief.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `?` | Open the guide |
| `C` | Claude Copilot on/off |
| `Ctrl / Cmd + S` | Copy the current account map as Markdown |
| `Esc` | Close any panel or dialog |
| Arrow keys | Move a focused star on the constellation |
| `Enter` | Add the entry you are typing (action queue, etc.) |

## Your data & privacy

All data lives in your browser's localStorage under the key `bizdev:22-champion-tracker:v1`. Nothing is ever sent anywhere — the app makes zero network requests. **Export JSON regularly** (Export > Download JSON) as your backup; import it on any other machine to restore every account. Clearing browser site data wipes the sky.

## Pro tips

- Map everyone, even the ones who never reply. A stakeholder you cannot see is a risk you cannot manage — that is the whole point of the single-threading flag.
- Do not tag someone "Champion" just because they are friendly. Track them as a *candidate* first and make the 8-criteria checklist prove it — a champion who cannot get 15 minutes with the economic buyer is not a champion yet.
- Update *Last touched* every time you actually talk to someone. The threading-risk math is only honest if the dates are.
- A blocker with real influence is not someone to avoid — they are the highest-leverage conversation on your list. Use the *Plan to win over a skeptic* Copilot action on your most powerful "no" before your next call.
- Revisit the connections you wired every few weeks. Org charts move faster than CRMs do, and the constellation is only useful if the lines are still true.

## Troubleshooting

- **The help window keeps opening on launch** — it opens until it has been closed once per browser profile; close it with `Esc` or the × and it stays closed (stored in `seenGuide`).
- **Dragging a star does nothing** — make sure you are dragging from inside the constellation box, not the label text below it. On touch devices, a single tap selects the star; press and drag to reposition it.
- **Copy buttons do nothing** — some browsers block the clipboard on `file://` pages. The app falls back to a hidden-textarea copy; if that also fails, use Export > Download JSON or select the prompt text manually.
- **My data vanished** — you are likely in a different browser, profile, or private window; localStorage is per-profile. Restore from your last JSON export via Export > Import JSON.
- **Import fails** — the file must be a JSON export from Champion Tracker (or match its shape). The importer runs everything through a normalizer, so partial files load with sensible defaults, but non-JSON files are rejected.

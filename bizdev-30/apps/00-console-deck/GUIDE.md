# Console Deck — Step-by-Step Guide

Console Deck is the operating console for the BizDev-30 suite: a cartridge-deck chassis that runs any of the 30 business-development apps in its bay while six shared "connectors" (your profile, account roster, Claude voice, email/calendar/export preferences) stay patched in across every swap. It is for anyone using several BizDev-30 tools who is tired of re-typing the same company, offer, and account list into each one. Everything runs in your browser — no accounts, no network.

## Getting started

Open `apps/00-console-deck/index.html` directly in a browser — it is fully self-contained — or serve the repo root (e.g. `python3 -m http.server` in `bizdev-30/`) and visit `/apps/00-console-deck/index.html`. The console loads sibling apps from `apps/<slug>/index.html`, so keep the folder structure intact. On first open, the Operator's Card (the built-in how-to) appears automatically.

## Walkthrough

1. **Set up the connectors (the patch board).** The six hex jacks across the top are shared services. Each LED tells the truth about its config:
   - Green (steady) = connected. Amber (pulsing) = needs setup. Red (blinking) = attention — something is half-filled or broken.
   - **CLAUDE** — your name (required), company, and voice notes. Apps stamp this onto every Copilot prompt they generate.
   - **PROFILE** — company, offer, and ICP (all three required for green), plus an optional pricing anchor.
   - **ROSTER** — your account list. Green once it holds at least one account.
   - **EMAIL / CALENDAR / EXPORT HUB** — ship green with sane defaults; open them to change the mail handoff mode, toggle calendar hints, or set the shared filename prefix.
2. **Fill the roster three ways.** Open the ROSTER jack: add accounts manually (Add, then the pencil to edit), paste a list (one per line, `Name | segment | notes`) and hit *Parse & add*, or *Import CSV* (columns: name, segment, notes; a header row is skipped). Deleting an account offers a 7-second Undo toast.
3. **Insert a cartridge.** Every app in the suite sits in the left rack with its number spine and hue stripe. Click one, or press `/` to search, arrows to move, `Enter` to insert. The cartridge slides into the bay, powers on, and immediately receives your connector context over the console bus.
4. **Read the link LED on the title plate.** `BUS LINKED` (green) — the app confirmed the handshake and is using your context. `STANDALONE` — the app runs fine but has no bus link (older cartridge or not yet retrofitted); connectors will not reach it. `CARTRIDGE NOT SEATED` (red) — the app failed to load; re-seat it, eject, or try opening it standalone.
5. **Drive the bay.** Title-plate controls: **EJECT** (instant, no confirm — cartridge data is untouched), **Reload** (re-seats the same cartridge), **Open standalone** (same app in a new tab, no console), **Fullscreen** (the bay fills the screen; `Esc` exits).
6. **Swap without losing connections.** Eject and insert as often as you like — connectors live in the console, not the cartridge. Edit a connector while an app is running and the console re-broadcasts the updated context to it instantly; every future cartridge gets the same patch.
7. **Watch the chrome.** Running cartridges can post one-line notes to the deck; they appear bottom-right tagged `BUS`. The console's own messages are tagged `DECK`.
8. **Export / import your config.** *Export* (or `Ctrl/Cmd+S`) downloads the entire console config — connectors, roster, last cartridge — as one JSON file named with your Export Hub prefix. *Import* restores it on any machine or browser; the file passes through a normalizer, so partial or older files load safely. *Load Demo* fills a realistic sample patch (all six LEDs green) for exploring; *Reset* (two-step confirm) returns the deck to factory.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `/` | Focus rack search |
| `↑` `↓` | Move along the rack |
| `Enter` | Insert highlighted cartridge |
| `?` | Open the Operator's Card |
| `Esc` | Close panels / exit fullscreen |
| `Ctrl/Cmd+S` | Export console config (JSON) |

## Your data & privacy

Console config lives in your browser's localStorage under `bizdev:console:v1`. Nothing leaves your machine — no network calls, no analytics. Each cartridge keeps its own data under its own key (`bizdev:<slug>:v1`); ejecting or resetting the console never touches cartridge data. Use Export for backups and to move between machines.

## Pro tips

- Patch PROFILE and CLAUDE before anything else — they are the two connectors that upgrade every Copilot prompt in every app.
- Keep the roster to accounts you are actively working; apps that offer "pull from console roster" work best with a focused list.
- Set the Export Hub prefix to your company name once and every file any cartridge exports will sort together in your downloads.
- Use *Open standalone* when you want an app on a second monitor while a different cartridge runs in the bay.
- A red profile LED means partially filled — one of company/offer/ICP is still empty.

## Troubleshooting

- **"CARTRIDGE NOT SEATED"** — the app's `index.html` is missing at `apps/<slug>/`. If you only copied the console folder, copy the sibling app folders too, then Re-seat.
- **App loaded but shows STANDALONE** — that cartridge does not implement the console bus (or was built before it). It works fine, but shared connectors will not reach it; open its own settings instead. If the bay shows a browser file-not-found error instead of the app (this can happen when opened from `file://`), the cartridge is not built yet — eject or re-seat later.
- **Help modal opens every visit / settings do not persist** — your browser is blocking localStorage (private-browsing mode or blocked site data). Allow site data for the file or host you use.
- **Import does nothing** — the file must be JSON exported by Console Deck (or matching its shape). Broken JSON shows an `ERR` toast; unrecognized fields are silently dropped by design.
- **Fullscreen button seems ignored** — some browsers block the Fullscreen API on `file://`; the console then falls back to a maximize mode inside the window. `Esc` always exits.

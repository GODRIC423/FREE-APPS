# Deal Qualifier — Step-by-Step Guide

Deal Qualifier is a border-checkpoint-styled MEDDICC qualification tool for sales reps, founder-sellers, and revenue leaders who are tired of forecasting on hope. You run every deal through six inspection lanes (Metrics, Economic Buyer, Decision Process, Identified Pain, Champion, Competition), grade each with evidence — not vibes — and get a weighted score, an honest recommended stage, and a stamped verdict you can defend in a forecast call. Everything runs in one HTML file in your browser — no account, no server, no data leaving your machine.

## Getting started

Open `apps/14-deal-qualifier/index.html` directly in any modern browser — it is fully self-contained (fonts, icons, and code are all embedded). Alternatively, serve the repo root with any static server and browse to the same path. On first open, the "How the checkpoint works" guide appears automatically.

## Walkthrough

1. **Read the guide, then close it.** It only auto-opens once; reopen anytime with `?` or the *How to use* button.
2. **Load the demo pipeline.** Click *Load demo* in the header. You get six realistic dossiers — a clean CLEARED deal, a "Commit"-stage hope deal with every hard question still open, a strong-pain deal missing the CFO, an early-honest deal, a big RFP deal with unmapped competition, and a small early-stage deal. Study how the same facts produce very different verdicts, then *Reset* when ready to build your own queue.
3. **Open a dossier.** Click *New dossier* (or press `N`) in the Queue panel. On Gate 00 (Intake), fill in account name, deal name, value, target close date, working notes, and — critically — the **stage you are claiming**. This is the number the inspection will test against.
4. **Walk the six lanes.** Use *Next gate* / *Back*, the stepper tabs, or the `←` / `→` arrow keys to move through Metrics, Economic Buyer, Decision Process, Identified Pain, Champion, and Competition. Each lane shows the core question, three inspector's probes to ask your contact, and a coaching line.
5. **Grade each lane honestly.** Every lane gets one of three statuses: **No papers** (0% credit — you know nothing), **Claimed** (50% credit — someone said it, unconfirmed), or **Verified** (100% credit — you can point at evidence). Click a status card or press `1` / `2` / `3` while a lane is open. Then write the **evidence on file**: quote the email, name the person, cite the number. If you mark a lane Verified with no evidence written down, the app flags it — write it down or downgrade to Claimed.
6. **Read the verdict.** Gate 07 stamps the deal: **CLEARED** (score ≥70 with Pain, Buyer, and Champion all Verified), **CONDITIONAL** (score ≥45), or **HELD AT GATE** (below that). You get the weighted score dial, a per-lane breakdown bar, the stage your evidence actually supports versus the stage you claimed, and every open hold flag.
7. **Watch the hope gap.** The Queue panel compares your claimed (rep) stage against the evidence-supported stage for every deal. Deals staged ahead of their proof get a red "hope +N" flag. Toggle the *Hope* filter to see only those deals, and sort the queue by score, value, hope gap, or close date — it is sorted by truth, not hope.
8. **Tune the calibration (optional).** Click *Calibration* on any open dossier to adjust how much each lane counts toward the score (5–30 points each, defaults 20/20/15/20/15/10 for Metrics/Buyer/Process/Pain/Champion/Competition). Weights are relative — the score always lands on 0–100.
9. **Use the Claude Copilot prompts.** Click *Claude Copilot* (header) or *Send to the Second Inspector* (verdict step). Four actions, each generating a complete prompt embedding your live dossier or full queue:
   - **Interrogate this deal** — a ruthless MEDDICC inspector hunts blind spots, kill risks, and evidence that looks thinner than its status suggests.
   - **Draft gap-closing questions** — turns every hold flag into a live-call question and a written question, plus a 3-question plan for your next 30 minutes.
   - **Write the go/no-go memo** — a revenue leader's internal memo: verdict, evidence for/against, conditions, next three actions, forecast category.
   - **Audit my forecast** — a CRO scrub of your whole queue: honest ranking, hope audit, sandbag check, 30-day plan, forecast call (works with no deal selected).
   Click *Copy prompt*, then paste it into [claude.ai](https://claude.ai) — it works with the standard $20 Claude subscription, no API key needed. Paste Claude's answer back into the **Inspector's debrief** box (per-dossier, or portfolio-level when no deal is selected) — it autosaves with the record.
10. **Ship the ledger.** Use *Export*: copy the full Checkpoint Ledger as Markdown (`Ctrl/Cmd+S` does the same), download the full state as JSON, download a forecast CSV for your CRM, import a previously exported JSON, or print a clean paper ledger for the forecast meeting.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `?` | Open the guide |
| `N` | New dossier |
| `Ctrl / Cmd + S` | Copy the checkpoint ledger as Markdown |
| `←` / `→` | Previous / next inspection gate |
| `1` / `2` / `3` | Set the open lane's status (No papers / Claimed / Verified) |
| `Esc` | Close the open dialog, or leave the inspection bay |

## Your data & privacy

All data lives in your browser's localStorage under the key `bizdev:14-deal-qualifier:v1`. Nothing is ever sent anywhere — the app makes zero network requests. **Export JSON regularly** (Export > Download JSON) as your backup; import it on any other machine to restore your pipeline. Clearing browser site data wipes the checkpoint.

## Pro tips

- Grade the stage you claim on Gate 00 *before* you start the lanes, not after — that is what makes the hope gap honest instead of self-fulfilling.
- "They seemed excited" is not evidence. If you cannot quote, name, or cite it, the lane is Claimed at best.
- Track "do nothing" and internal-build as real competitors in the Competition lane — they beat more deals than any named vendor.
- Run *Interrogate this deal* on anything marked CLEARED before you commit it to forecast — the best deals are the ones worth stress-testing hardest.
- Recalibrate weights per sales motion: a self-serve motion might weight Pain and Metrics higher; an enterprise RFP motion might weight Process and Competition higher.

## Troubleshooting

- **The help window keeps opening on launch** — it opens until it has been closed once per browser profile; close it with `Esc` or the X and it stays closed (stored in `seenGuide`).
- **Copy buttons do nothing** — some browsers block the clipboard on `file://` pages. The app falls back to a hidden-textarea copy; if that also fails, use Export > Download JSON or select the prompt text manually from the "view prompt" disclosure.
- **My pipeline vanished** — you are likely in a different browser, profile, or private window; localStorage is per-profile. Restore from your last JSON export via Export > Import JSON.
- **Import fails** — the file must be a JSON export from Deal Qualifier (or match its shape). The importer runs everything through a normalizer, so partial files load with sensible defaults, but non-JSON files are rejected.
- **`1`/`2`/`3`/`N` shortcuts don't fire** — they are disabled while you are typing in a text field, so you can type digits normally. Click an empty area first, then press the key. Number keys also only apply while a pillar lane (Gate 01–06) is open.

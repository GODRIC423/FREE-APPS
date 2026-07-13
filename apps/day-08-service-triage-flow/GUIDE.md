# Service Triage Flow — Step-by-Step Guide

Service Triage Flow helps a call-taker at a home-service business (HVAC, plumbing, electrical, appliance, roofing) triage an inbound service request in real time. It walks you through a short wizard, detects urgency cues in the caller's own words, runs a safety checklist, and produces a routing recommendation with reasons — plus the next questions to ask and a hard "no promises" boundary. It is for anyone answering phones for a service business who has to decide, in under two minutes, whether a call is an emergency, a same-day job, a routine booking, an estimate request, or a callback.

## Getting started

- Open `index.html` directly in any modern browser, **or**
- Serve the folder locally and browse to it:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/apps/day-08-service-triage-flow/`. Everything runs locally — no accounts, no network.

## Step-by-step walkthrough

1. **First open — read the guide.** On your very first visit this guide opens automatically (press `?` any time to reopen it). Close it with `Esc` or the ✕ button.
2. **Load the demo.** Click **Load demo** in the header. A realistic restaurant AC call lands on the *Review & route* step, and two pre-logged calls appear in the call log. You'll see the stat strip update (draft urgency, score, calls logged, critical today) and the right-hand panel show a High / Same-day recommendation with its reasons. This is the fastest way to understand what the app produces.
3. **Step 1 · Caller.** Start a real call (click the "Caller" tab or press **Reset** for a blank slate). Capture the caller/business name, callback number, site, and service type. Caller and site are required — the wizard highlights them if you try to skip ahead.
4. **Step 2 · Issue.** Type what the caller says *in their own words*. As you type, urgency cue chips light up below the text box: safety-risk language, outages, vulnerable occupants, same-day pressure, business impact, estimate requests, callback signals. Negated phrases like "no smoke" are deliberately ignored. Tick the vulnerable-occupant or business-impact boxes if they apply — both raise the urgency score.
5. **Step 3 · Safety.** Walk the hazard checklist out loud with the caller. Any checked hazard adds to the score and shows a caller-safety script (e.g. gas smell → leave the building, call the utility or 911 first). A **severe** hazard (gas, smoke/sparking, CO alarm, live wiring) forces the call into the Emergency band and reveals a **Fast-track to review** button so you can route immediately. If nothing applies, tick "caller confirms none of these" — the wizard requires one or the other.
6. **Step 4 · Logistics.** Capture the on-site contact window, access notes (gates, pets, parking), constraints (fee approvals, decision-makers), whether this is a repeat/warranty visit, and whether the caller wants an estimate. These feed both the score and the next-questions list.
7. **Step 5 · Review & route.** The summary shows the urgency band and score, the suggested category, the route destination, and every reason that contributed (each with its point weight). If your judgment differs, click a category chip to override — the auto suggestion stays on record. Confirm the **No promises made** checkbox (required), add call-taker notes, then click **Log this call**.
8. **Call log.** Each logged call keeps its full snapshot, newest first, with an urgency badge and route line. Per call you can **Print card**, **Copy** its Markdown, or **Delete** — deletion shows an Undo toast for 7 seconds.
9. **Export & handoff.** At the bottom: copy the current triage card as Markdown (`Ctrl/Cmd+S` does the same), print the triage card, download a JSON backup of everything, import a backup, or download the call log as CSV. The Markdown preview box always shows the current call's card.

## Keyboard shortcuts

| Keys | Action |
| --- | --- |
| `?` | Open this guide |
| `Esc` | Close dialogs |
| `Ctrl/Cmd + S` | Copy the current triage card as Markdown |
| `Alt + →` / `Alt + ←` | Next / previous wizard step |

## Your data & privacy

- Everything is stored in this browser's `localStorage` under the key `fable-remake:day-08-service-triage-flow:v1`. Nothing ever leaves your machine.
- **Download JSON backup** exports the full state (draft, call log, settings); **Import JSON** restores it — imports are validated, so a corrupt file can't crash the app.
- **Reset** (header) clears the draft *and* the whole call log after a confirmation — back up first if in doubt.

## Tips & good practice

- Type the caller's words verbatim — the cue detector works on their language, and the dispatcher benefits from the raw description more than a paraphrase.
- Trust the override. The score is a heuristic; if a "Moderate" call smells like an emergency to you, override it — the tool records both your call and its suggestion.
- Never diagnose or price from the desk. The next-questions list always ends with the no-promises close; say it out loud on every call.
- Ask the safety checklist even on "boring" calls — the one gas-smell call you catch pays for every checklist you ran.
- Print the triage card for emergency escalations so the dispatcher gets a physical handoff even mid-chaos.

## Troubleshooting

- **My data disappeared.** localStorage is per browser *and* per profile. Check you're in the same browser/profile, and that the site isn't opened from a different path or port (each origin gets its own storage). Private/incognito windows discard storage on close.
- **The Next button won't advance.** A required field on the current step is empty — it will be highlighted and the hint line explains what's missing (e.g. the Safety step needs either a hazard or "caller confirms none").
- **Copy doesn't work.** Some browsers block the clipboard on `file://` pages. Use the Markdown preview box (select all + copy), or serve the folder with `python3 -m http.server`.
- **Printing shows the whole page, not the card.** Use the **Print triage card** button (or a log row's **Print card**) rather than the browser menu while a dialog is open; the print stylesheet shows only the card.

# Technician Brief Builder — Step-by-Step Guide

Technician Brief Builder turns messy office notes into a dispatch-ready, one-page job brief: who the customer is, what they reported, which parts and tools go on the truck, what could go wrong on site, and — just as important — what the technician must **not** promise. It is built for dispatchers, office managers, and owner-operators of home-service businesses (HVAC, plumbing, electrical, appliance, and similar trades) who want every truck to roll with the same quality of preparation.

## Getting started

- Open `index.html` directly in any modern browser, **or**
- Serve the folder locally and browse to it:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/apps/day-07-technician-brief-builder/` in your browser. There is no build step, no account, and no network dependency — everything runs and stays on your machine.

## Step-by-step walkthrough

1. **Take the tour (first visit).** The "How to use" guide opens automatically the first time. Close it with *Got it*, *Esc*, or the ✕ button; reopen it any time with the **How to use** button or the `?` key.
2. **Load the demo (optional but recommended).** Click **Load demo** to fill in a realistic scenario — an HVAC short-cycling call at a dental office. You'll see every panel populated: header fields, an eight-item parts list, four risk flags with mitigations, and a green "DISPATCH READY" badge on the preview. It's the fastest way to learn what a finished brief looks like.
3. **Pick a job type and apply its template.** Choose from HVAC repair, Plumbing repair, Electrical service, Appliance repair, Preventive maintenance, Equipment install, Inspection/diagnostic, or Custom, then press **Apply template**. The template seeds *first checks*, *access & hazards*, and the *do-not-promise boundary* — but only into fields you left empty, so it never overwrites your own words. It also unlocks a row of suggested parts chips.
4. **Fill the dispatch header.** Customer/site, contact & entry, technician/truck, and service window. Required fields are marked "required" until filled, and the completeness meter tracks each one.
5. **Describe the issue and context.** Write the reported issue in the customer's own words (when it started, what they tried) and add site context — occupancy, sensitivities, who approves decisions. As you type, the app scans your notes for risk phrases.
6. **Build the parts & tools checklist.** Click suggested chips (e.g. "+ Filter set") or type your own item with a quantity and press **Add** / Enter. Adding a duplicate bumps its quantity instead of creating a second row. Check items off as the truck is packed — the stat strip and the printed brief both show packed counts. Deleting an item shows an **Undo** toast for 7 seconds.
7. **Review and record risk flags.** Detected risks (access constraints, occupied site, electrical or gas hazards, water damage, customer sensitivity, promise pressure) appear as pills with an **Add** button — accepting one records it with a sensible default mitigation you can edit. You can also flag risks manually with a label, severity (low/medium/high), and mitigation. High-severity flags color the stat strip and sort to the top of the brief.
8. **Complete the dispatch sign-off.** Tick the four confirmations: contact & access confirmed, parts loaded, risks reviewed with the tech, and the no-promise rule acknowledged. The completeness meter needs a score of 85%+ **and** all four sign-offs to show **DISPATCH READY**; the "missing items" list under the meter tells you exactly what's left.
9. **Hand off the brief.** The right-hand panel is a live one-page brief. Click **Print brief** for a clean paper copy for the truck, **Copy Markdown** to paste into chat or email drafts, or **Download JSON** for a full backup. **Import JSON** restores a saved brief. Everything is a draft for human review — the app never contacts anyone.

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `?` | Open the How-to-use guide |
| `Esc` | Close the guide |
| `Ctrl/Cmd + S` | Copy the brief as Markdown |
| `Enter` | Add the part / risk currently typed in its input |
| `Ctrl/Cmd + P` | Print the one-page brief |

## Your data & privacy

- Everything you type is saved automatically to your browser's `localStorage` under the key `fable-remake:day-07-technician-brief-builder:v1`. Nothing leaves your machine.
- **Download JSON** produces a complete backup you can store or move between browsers; **Import JSON** restores it (files are validated on import, so a corrupt file can't break the app).
- **Reset** clears the current brief after a confirmation. Export first if you want a backup.
- No accounts, no cookies, no analytics, no network requests.

## Tips & good practice

- **Write the issue in the customer's words**, not your diagnosis — the tech should hear what the customer heard, then verify. Diagnosis belongs in "First checks".
- **Treat the no-promise boundary as mandatory.** The single most expensive dispatch mistake is a tech promising a price or a same-day fix on the doorstep. Every template ships with a trade-appropriate boundary; keep one on every brief.
- **Accept suggested risk flags, then edit the mitigation.** The default mitigations are good starting points, but the best briefs name specifics: *which* key, *which* breaker panel, *who* to call.
- **Aim for 3+ parts even on diagnostic calls** — meters, camera, shoe covers count. A tech who returns to the shop for a tool costs more than the checklist takes to fill in.
- **Print for the truck, Markdown for the office.** The paper brief survives dead phone batteries; the Markdown copy makes a tidy record in your job thread.

## Troubleshooting

- **"My brief disappeared."** Data is stored per browser and per profile. Make sure you're in the same browser, profile, and (if serving locally) the same host/port as before. Private/incognito windows discard storage when closed.
- **"Import JSON does nothing / says the file is invalid."** The file must be JSON exported by this app (or matching its shape). Re-export from the source browser and try again; don't edit the file by hand unless you keep it valid JSON.
- **"The print view shows the whole app."** Use the **Print brief** button (or `Ctrl/Cmd+P` from the page). If your browser has a stale cached stylesheet, hard-refresh (`Ctrl/Cmd+Shift+R`) and print again.
- **"The theme keeps switching."** On the very first visit the app follows your system's light/dark preference; after you press the theme toggle once, your choice is saved and takes precedence.

# Testimonial Harvester — Step-by-Step Guide

Testimonial Harvester turns "I should really collect testimonials" into a working system: a pipeline of asks, relationship-specific request scripts, a per-quote rights checklist, a framed Proof Wall you can screenshot or print, and a placement planner so every quote earns its keep. It's built for consultants, freelancers, agencies, and founder-led sales teams who have happy clients but no organized social proof.

## Getting started

Open `apps/18-testimonial-harvester/index.html` directly in any modern browser — it is fully self-contained (fonts, icons, and styles are embedded; nothing loads from the network). You can also serve the repo root with any static server and browse to the same path. Your data stays in that browser.

## Walkthrough

1. **First open.** The "How to use" guide opens automatically. Close it (Esc or the button); it won't auto-open again on this browser.
2. **Load the demo.** Click **Load demo** in the header to hang a finished gallery: 7 asks across every stage, 4 collected quotes, 5 placements. Explore, then **Reset** (it asks for confirmation) when you're ready to start fresh.
3. **Build your shortlist (Ask Pipeline tab).** Click **Add a person** and open the row to fill in name, role, company, relationship type, channel, the shared project, and — most important — the *result worth citing*. The funnel meter at the top shows your harvest stage by stage; filter chips and the search box keep long lists workable.
4. **Send the ask (Request Scripts tab).** Each relationship type (longtime client, just-wrapped project, partner, peer) has an editable template with merge fields (`{{first_name}}`, `{{company}}`, `{{project}}`, `{{result_hint}}`, `{{my_name}}`). Pick a person from the dropdown to preview it filled in, then **Copy** and send it from your own email/LinkedIn. Set your signature name in the "Sign as" field.
5. **Advance the status.** Click the status pill on any row to move it: Shortlist → Ask sent → Nudged → Received → Approved → On the wall. Setting "Ask sent" stamps today's date if none is set.
6. **Capture the testimonial.** When words arrive, paste them *verbatim* into that person's "Testimonial" box. The rights checklist appears: tick what they've agreed to (name, company, title, logo, website/social/sales usage, and "edited wording approved"). The ring shows how clear you are to publish.
7. **Hang the wall (Proof Wall tab).** Every entry with a quote appears as a framed card with a museum label. Choose gilt, walnut, gallery black, or float white per card. Screenshot a card for slides or social, or click **Print the wall** for a clean leave-behind (the print stylesheet strips the app chrome).
8. **Place every quote (Placements tab).** Add each spot where proof should live (homepage hero, pricing page, proposal template, LinkedIn featured, cold-email P.S. …), state the *job* of the proof there, and hang a specific quote on each hook. The coverage bar shows assigned, live, and empty hooks; a rights warning appears if the assigned person hasn't approved any channel.
9. **Use the Claude Copilot panel.** Four curator actions — *Personalize the ask*, *Tighten a testimonial ethically*, *Cast the right quote*, *Audit my proof coverage* — each build a complete expert prompt from your live data. Click **Copy prompt**, paste it into claude.ai (works with the standard $20 Claude subscription, no API key), and keep the useful parts of the reply in the "Claude's answer" box, which autosaves.
10. **Export.** The **Export** dialog offers: Copy Markdown (wall + pipeline + placement plan), Download JSON (full backup), Download CSV (the pipeline as a spreadsheet), and Import JSON (restores a backup; malformed files are safely rejected).

## Keyboard shortcuts

| Key | Action |
|---|---|
| `?` | Open the how-to guide |
| `Esc` | Close any dialog |
| `Ctrl/Cmd + S` | Copy the proof wall as Markdown |

## Your data & privacy

Everything is stored in your browser's localStorage under the key `bizdev:18-testimonial-harvester:v1`. Nothing is sent anywhere — there is no server, no analytics, no network calls. Use **Export → Download JSON** for backups or to move between browsers/machines, and **Import JSON** to restore.

## Pro tips

- **Ask while the win is warm.** The "Just-wrapped project" script converts best in the two weeks after delivery — add people to the shortlist the day a project ends.
- **Record the result before you ask.** A concrete number in "Result worth citing" makes both the ask and the eventual quote twice as strong.
- **Never skip "edited wording approved."** Tightening a rambling quote is fine; publishing an edit they haven't seen is not. The Copilot's polish action drafts the approval message for you.
- **One quote, one doubt.** In Placements, write the goal as the doubt it settles ("de-risk the top tier"), then let the *Cast the right quote* prompt argue the match.
- **Print the wall before big meetings.** A one-page gallery of framed quotes is a quietly devastating leave-behind.

## Troubleshooting

- **The guide keeps opening / my data vanished.** You're likely in a private/incognito window or a different browser profile — localStorage is per-profile. Use Export/Import to move data.
- **Copy buttons do nothing.** Some browsers restrict the clipboard on `file://` pages; the app falls back to a hidden-textarea copy. If it still fails, select the preview text manually, or serve the folder over a local static server.
- **Import JSON is rejected.** The file must be JSON exported by this app (or shaped like it). The importer runs everything through a normalizer, so a partial file loads with defaults — but a non-JSON file is refused with a toast.
- **Printing shows the whole app.** Use the **Print the wall** button (or the browser's print on any tab) — the print stylesheet automatically swaps to the wall artifact. If you see app chrome, check that "Background graphics" is enabled for nicer frames.
- **A deleted person is gone.** Deletes show an Undo toast for about 7 seconds. After that, restore from your latest JSON export.

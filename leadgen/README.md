# LEADGEN — Superpowers With AI lead generation CRM

A single-user lead generation app for El Wong's Superpowers With AI business:
track & nurture leads (CRM) → import & AI-score LinkedIn commenter lists →
draft personalized DM sequences → capture leads from a public page.

Zero external dependencies — Node built-ins only.

## Run it

```bash
node leadgen/server.js      # http://localhost:4179
# or from the repo root: npm run start:leadgen
```

First launch shows a one-time password setup (single-user — no accounts).
The existing XPALLA app is untouched and runs separately on :4178.

## What's included

- **Leads CRM.** Pipeline stages (New → Contacted → In conversation → Call
  booked → Client / Not now), A/B/C tiers with scores, tags, notes, an
  activity log per lead, and next-follow-up dates. The dashboard shows stage
  counts, follow-ups due today/overdue, and a recent-activity feed.
- **Import & scoring.** Paste a commenter/engagement list from a LinkedIn
  post or giveaway (freeform blocks, CSV, or tab-separated — messy is fine).
  The app parses it, you review and edit every row, then score each person
  against your editable **ideal client profile**. Duplicates against existing
  leads are flagged and unchecked by default. Nothing is scraped — you paste
  what you already collected.
- **Outreach drafting.** Per lead, generate a 3-touch DM sequence in El's
  warm, direct voice: Touch 1 thanks them and references their comment,
  Touch 2 delivers value, Touch 3 softly invites them to a call with your
  Calendly link. Copy each message and send it yourself — **nothing is ever
  sent automatically**. "Mark sent" logs the touch, advances New → Contacted,
  and schedules the next follow-up.
- **Capture page.** Public `/capture` page (share the link anywhere) with a
  simple form. Submissions become leads (source: website), fire an email
  alert, and the thank-you screen shows your Calendly embed.
- **Settings.** Calendly URL, notification email, the ICP text that drives
  scoring, password change, and a live status readout (AI / DB / email).

## Modes (everything degrades gracefully)

The sidebar shows which is active. With no configuration at all the app runs
on a local JSON file, a deterministic demo scorer, template DMs, and no email.

| Feature | Off (default) | On |
|---|---|---|
| AI scoring + DM drafting | keyword heuristic + templates | `ANTHROPIC_API_KEY` → Claude (`CLAUDE_MODEL` to override, default `claude-opus-4-8`) |
| Database | `leadgen/leadgen-db.json` | `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` → Postgres |
| New-lead email alerts | in-app activity feed only | `RESEND_API_KEY` → email to your notification address |

Copy `leadgen/.env.example` to `leadgen/.env` and fill in what you use.

## Connect Supabase (database)

1. In your Supabase project: **SQL Editor → New query**, paste
   [`schema.sql`](schema.sql), **Run**. (Tables are prefixed `leadgen_`, so
   sharing XPALLA's project is fine.)
2. **Project Settings → API**: copy the Project URL and the **`service_role`**
   secret key (NOT the anon key) into `leadgen/.env`.
3. Restart. Boot log shows `DB: Supabase`.

The service-role key stays server-side in `.env` (git-ignored). RLS is
enabled as defense-in-depth; the Node server is the trusted layer.

## Email alerts (Resend)

Grab a free API key at resend.com and set `RESEND_API_KEY`. Until you verify
your own sending domain in Resend, the default `onboarding@resend.dev` sender
only delivers to the email address on your Resend account — fine for a
single-user tool. Set your notification address in **Settings**.

## Deploy on Render

`render.yaml` includes a `leadgen` web service (`node leadgen/server.js`).
Two things to know on the free tier:

- **The local JSON DB is ephemeral** — restarts wipe it. For real use, set
  the Supabase env vars in the service dashboard.
- **Set `LEADGEN_PASSWORD`** in the dashboard. Without it (and without
  Supabase), every restart would re-open the public first-run setup screen.

Also add `ANTHROPIC_API_KEY` and `RESEND_API_KEY` in the dashboard to go
from demo mode to live.

## Rebuilding the frontend

`app.js` is the committed Babel output of `app.jsx`. After editing `app.jsx`:

```bash
cd leadgen
npx --yes -p @babel/core -p @babel/cli -p @babel/preset-react \
  babel --presets @babel/preset-react app.jsx -o app.js
```

(If npx's flat resolution fails on your machine, `npm i -D` the three
packages anywhere and run the local `babel` binary with
`--presets <path-to>/@babel/preset-react`.)

## Privacy notes

- All lead data is pasted in by you; the app never scrapes LinkedIn and never
  sends messages on your behalf.
- The only public, unauthenticated write is `/api/capture` — it validates
  input, caps field lengths, and rate-limits per IP.
- Static serving is allowlisted: the database file, `.env`, and server source
  are never served.

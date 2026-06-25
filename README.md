# XPALLA — Personal Brand Studio

A SaaS tool for Generation X women to build their personal brand on LinkedIn & Instagram.
Accounts & login → brand strategy → algorithm-optimized content (A/B hooks, media, carousels)
→ a content calendar with best-time scheduling → performance analytics.

## Run it

```bash
node server.js          # http://localhost:4178
```

Zero external dependencies — Node built-ins only. Create an account on first launch.

## What's included

- **Auth + database.** Real accounts (email + password, hashed with scrypt), HttpOnly
  session cookies. Data lives in **Supabase Postgres** when configured, otherwise a local
  JSON file. Each user gets their own brand brief, drafts, calendar, and analytics. The
  sidebar shows which database is active.
- **Content engine.** LinkedIn + Instagram, 7 formats, 48-hook library, 3 A/B hook
  variants per draft, media upload, carousel builder — all grounded in 2025–2026 algorithm
  research.
- **Calendar.** Save drafts, schedule on a week view at each platform's best time.
- **Analytics.** Track impressions, engagement rate, saves + sends, and which formats and
  hook styles win. Enter real numbers (autosaves) or load sample data.

## Connect Supabase (database)

The app runs on a local JSON file out of the box. To use Supabase Postgres instead:

1. **Create the tables.** In your Supabase project: **SQL Editor → New query**, paste the
   contents of [`schema.sql`](schema.sql), and **Run**.
2. **Get your keys.** Supabase dashboard → **Project Settings → API**. Copy the **Project URL**
   and the **`service_role`** secret key (NOT the `anon` key).
3. **Configure.** Copy `.env.example` to `.env` and fill in:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=your-service-role-key
   ```
4. **Restart** `node server.js`. On boot it logs `DB: Supabase`, and the sidebar shows
   "Supabase database."

Security notes: the `service_role` key has full DB access — it stays only in `.env`
(git-ignored), server-side, never in the browser. The Node server is the trusted layer and
filters every query by the signed-in user. RLS is enabled in the schema as defense-in-depth
(the service-role key bypasses it by design). Switching backends doesn't migrate existing
local data — Supabase starts fresh; just create a new account.

## AI modes

The sidebar shows which is active.

- **Demo mode (default):** built-in mock engine grounded in the algorithm research. No setup.
- **Claude connected:** set your key and restart — every generation calls Claude with the
  same structured prompt; the whole UI works identically. Falls back to mock if a call fails.

  ```bash
  export ANTHROPIC_API_KEY="sk-ant-..."
  export CLAUDE_MODEL="claude-3-5-sonnet-latest"   # optional
  node server.js
  ```

## Publishing to LinkedIn & Instagram — is there an API?

Yes to both, with very different friction (researched 2025–2026):

- **LinkedIn — easy.** The **Posts API** with the **`w_member_social`** scope ("Share on
  LinkedIn") is **self-serve, no Partner Program approval** for posting to a member's profile.
  Supports text, images, multi-image, **video, document/PDF carousels** (Documents API), and
  **polls**. *Not* supported organically: swipeable ad-style carousels. Reading members' posts
  back is gated. ~150 req/day/member.
- **Instagram — gated.** The **Content Publishing API** (Instagram Graph API) supports single
  image, video, **Reels, carousels, and Stories**, but: requires a **Business/Creator account**,
  **JPEG-only** images at a public URL, and — the big one — **Meta App Review + Business
  Verification (2–6 weeks)** before you can publish for users who aren't you. The API
  **publishes immediately**; scheduling is your job. Limit: 100 posts/24h per account.
- **Fastest path:** start with an **aggregator** (Ayrshare, Bundle.social, or **Blotato** — which
  this user already uses) to ship IG + LinkedIn publishing in days riding their approved status,
  while kicking off Meta Business Verification in parallel. Cut LinkedIn over to direct early
  (no approval wall); bring Instagram in-house once volume justifies the review effort.

## Production roadmap

- **Publishing integration** (above) — the one piece still manual (copy → paste today).
- Swap the JSON file DB for Postgres/SQLite; add password reset & email verification.
- Per-post real analytics auto-pulled from the platform APIs once publishing is connected.
- Team / multi-brand workspaces.

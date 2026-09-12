# Nirbana United EFC — Full Project Documentation

This is the complete technical reference for the Nirbana United EFC website —
what it is, how every part of it works, and how to run, change, or deploy it.
It's written to stand on its own: someone who has never seen this project
before should be able to read this and understand the whole thing.

For a quick, visual "here's what it looks like" tour with screenshots instead
of technical detail, see **SHOWCASE.md** (and the matching PDF) in this same
folder. For login/database credentials, see **CREDENTIALS.md** and
**PROJECT-CREDENTIALS.md** (both kept private, never pushed to GitHub).

---

## 1. What this project is

Nirbana United EFC is an eFootball Mobile club (a competitive team inside the
mobile game eFootball). This project is their official website: a public
site anyone can visit, plus a private admin dashboard the club captain uses
to manage everything — no coding required for day-to-day updates.

- **Live site:** https://nirbana-united-efc.netlify.app
- **Source code:** https://github.com/AishikBarua/nirbana-united-efc
- **Tagline:** "Meditate. Dominate. Celebrate."
- **Founded:** 2025

The site is bilingual (English and Bengali, switchable anywhere from the
navbar) and stays up to date automatically: club statistics, match results,
and rankings are pulled on a schedule from the club's public tracker page on
cobegbd.com, so nobody has to manually retype numbers after every match.

---

## 2. Technology stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14.2 (App Router), React 18 |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database ORM | Prisma 5.20 |
| Database (local dev) | SQLite (a single file, zero setup) |
| Database (production) | Postgres, via Netlify Database |
| Internationalization | next-intl (English + Bengali) |
| Image storage (production) | Netlify Blobs |
| Image storage (local dev) | Local filesystem (`/public/uploads`) |
| Hosting | Netlify |
| Scheduled jobs | Netlify Scheduled Functions |
| Validation | Zod |
| Password hashing | bcryptjs |
| Auth | Custom signed-cookie sessions (HMAC-SHA256, no external library) |

Nothing here requires a paid plan — the whole stack runs on Netlify's free
tier for a club site's traffic level.

---

## 3. How the site is organized (project structure)

```
app/
  [locale]/                 Every public + admin PAGE (locale-prefixed: /en/..., /bn/...)
    page.tsx                 Homepage
    club/                    About / club info page
    players/                 Roster (list) + player profile pages
    matches/                 Fixtures & results
    standings/                League standings
    transfers/                Transfer log (new signings, departures)
    rankings/                 All-Time + season rank snapshots from the tracker
    news/                     News list + individual article pages
    gallery/                  Photo gallery with a lightbox
    admin/                    Everything behind login (see section 6)
    error.tsx                 Branded "Something went wrong" fallback
    not-found.tsx             Branded 404 page
  api/                       Every REST API route (see section 7)
  global-error.tsx           Last-resort fallback if the root layout itself fails
components/                  Shared UI used by public pages (cards, nav, charts, forms)
components/admin/            Admin-only forms and controls
lib/                         Core logic: database client, auth, validation, tracker sync, utils
lib/services/                One file per data type — the only code that talks to Prisma directly
prisma/
  schema.prisma               Data model — LOCAL dev (SQLite)
  schema.production.prisma    Same data model — PRODUCTION (Postgres). Kept in sync by hand.
  seed.ts / seed-production.ts  Sample/first-admin data
messages/
  en.json, bn.json            Every piece of UI text, one key per string, in both languages
netlify/functions/
  hourly-sync.mts             Netlify Scheduled Function — triggers the tracker sync every hour
public/
  brand/crest.jpg              Club crest
  og-image.jpg                 Social-media link-preview thumbnail
  uploads/                     Uploaded photos (local dev only — production uses Netlify Blobs)
docs/screenshots/              Screenshots used in SHOWCASE.md
```

Every **service** file in `lib/services/` (e.g. `playerService.ts`,
`matchService.ts`) is the single place that queries the database for that
data type — pages and API routes never call Prisma directly. This keeps
business rules (like "what counts as a win," or "how do we sort by rank") in
one place instead of scattered across the codebase.

---

## 4. The data model

All data lives in one of these tables (see `prisma/schema.prisma` for the
exact field list):

| Table | What it holds |
|---|---|
| `Admin` | The single admin account (email + bcrypt password hash) |
| `Player` | Roster members — stats, position, bio, photo, squad card, season vs. career numbers |
| `PlayerStatSnapshot` | One row per player per sync, so the profile page can chart a trend over time |
| `Match` | Fixtures and results (opponent, score, date, competition) |
| `News` | News posts (title, body, image, publish date) |
| `Standing` | The club's own league-table row (position, points, W/D/L) |
| `GalleryImage` | Photos in the public gallery |
| `ClubInfo` | Singleton row: club name, tagline, founding year, history text, achievements |
| `Transfer` | Signings/departures pulled from the tracker's Transfers tab |
| `RankingSnapshot` | All-Time + per-season rank/rating snapshots from the tracker's Rankings tab |
| `Comment` | Visitor comments on news posts and gallery photos (moderated) |
| `Notification` | Auto-generated feed items (new result, new fixture, new news post) |
| `MatchReport` | Cached full per-player stat breakdown for one match, scraped from that match's own page on the tracker (see section 8a) |
| `PlayerHighlight` | Admin-uploaded highlight photos for a player, optionally tagged to one of their completed matches (see section 8a) |

A few important conventions baked into the schema:

- **A draw counts as half a win.** Win rate everywhere on the site is
  calculated as `(wins + draws/2) / matchesPlayed × 100` — the standard
  football convention. (This was a real bug fixed during this project's
  QA pass — see section 11.)
- **`divisionRank` is actually an "All-Time Rank" badge**, not a real
  division — it's the player's numeric all-time rank on the tracker site
  (e.g. `#6576`), sorted and filtered numerically, not alphabetically.
- **Every tracker sync fully replaces `Player`, `Transfer`, and
  `RankingSnapshot` rows** with fresh data from cobegbd.com, but *always
  preserves* each player's photo, position, join date, favorite player, and
  "featured" flag — the things only an admin sets by hand.
- **News, Gallery, and Comments are never touched by a sync** — they're
  100% admin/visitor content.

---

## 5. Public site — every page

All of these are available in English (`/en/...`) and Bengali (`/bn/...`),
switchable from the language toggle in the navbar.

| Page | Route | What it shows |
|---|---|---|
| Home | `/` | Hero banner, quick stats (active members / total wins / league position), recent match results, upcoming fixtures, latest news |
| Club | `/club` | About text, founding year, history, achievements |
| Roster | `/players` | Every squad member as a card (photo, position, all-time rank, goals/matches/win rate), with sort and filter controls |
| Player Profile | `/players/[slug]` | Full career stats, a win/draw/loss donut chart, a career-vs-this-season bar comparison, a stats-over-time trend line (once enough sync history exists), squad cards, favorite player, bio, and a **Match Highlights** gallery of admin-uploaded photos (see section 8a) |
| Matches | `/matches` | Full fixture list and results, aggregate win-rate stats, and a **"View Full Report"** link on any completed match that has one (see section 8a) |
| Match Report | `/matches/report/[cobegMatchId]` | A single match's full detail page — team crests and score, Man of the Match, aggregate team stats, and a 1-vs-1 stat comparison for every player pairing (see section 8a) |
| Standings | `/standings` | The club's league-table row (position, points, record) |
| Transfers | `/transfers` | Chronological log of new registrations, transfers, and departures |
| Rankings | `/rankings` | All-Time and per-season rank/rating snapshots |
| News | `/news` and `/news/[id]` | News list and full articles, each with visitor comments |
| Gallery | `/gallery` | Photo grid with a lightbox viewer, each photo with visitor comments |

**Site-wide features available from the navbar on every page:**

- **Search** (magnifying-glass icon) — live search across players, matches,
  and news as you type.
- **Notifications** (bell icon) — an automatic feed of new match results,
  new fixtures, and new news posts. "Seen" state is tracked per-browser
  (there are no visitor accounts).
- **Language switcher** — instantly swaps the entire site to Bengali or back,
  including all dates and number formatting.
- **Comments** — visitors can comment on any news post or gallery photo
  without creating an account. Instead of a free-text name field, they pick
  their name from an `@`-autocomplete of the *current roster* — so a comment
  can never impersonate someone who isn't really on the team. Every comment
  starts hidden ("pending") until an admin approves it from the moderation
  queue.

---

## 6. Admin panel

Reached at `/admin/login`, protected by session-based auth (see section 9).
There is exactly one admin account (the club captain).

| Section | URL | What it does |
|---|---|---|
| Dashboard | `/admin/dashboard` | Central hub — links to every section below, a "Sync with Tracker Now" button, and a live pending-comments count |
| Manage Players | `/admin/players` | Full CRUD for the roster: add/edit/delete players, upload photos, set position/join date/bio/favorite player/featured flag |
| Manage Matches | `/admin/matches` | Full CRUD for fixtures and results |
| Manage News | `/admin/news` | Full CRUD for news posts, with image upload |
| Manage Standings | `/admin/standings` | Edit the club's league-table row |
| Manage Gallery | `/admin/gallery` | Upload and delete gallery photos |
| Manage Highlights | `/admin/highlights` | Upload a highlight photo to a player's profile, optionally tagged to one of their completed matches (see section 8a) |
| Manage Comments | `/admin/comments` | Approve or delete pending visitor comments |
| Club Info | `/admin/club` | Edit the "About" text, tagline, founding year, achievements |
| Settings | `/admin/settings` | Change the admin password, log out |

**"Sync with Tracker Now"** is the button an admin clicks to immediately pull
the latest numbers from cobegbd.com instead of waiting for the next
automatic hourly sync — see section 8 for exactly what this does.

---

## 7. API routes

Every API route lives under `app/api/` and returns JSON. Routes are grouped
by resource, and each supports the HTTP verbs that make sense for it
(`GET` for public reads, `POST`/`PUT`/`DELETE` for admin-only writes):

`players`, `matches`, `news`, `standings`, `gallery`, `highlights`, `club`,
`comments` — standard CRUD resources.
`search` — live search across players/matches/news.
`notifications` — the auto-generated notification feed.
`upload` — handles image uploads (routes to Netlify Blobs in production,
local disk in dev).
`blob/[key]` — serves an uploaded image back out of Netlify Blobs in
production.
`auth/login`, `auth/logout`, `auth/change-password` — session management.
`admin/sync-tracker` — the button-triggered manual sync (admin-only).
`internal/scheduled-sync` — the endpoint Netlify's hourly scheduled function
calls (protected by a shared secret, not an admin login — see section 8).

Every write-capable route (POST/PUT/DELETE) is protected twice: once at the
`middleware.ts` level (rejects any unauthenticated request before it even
reaches the route), and again inside the route handler itself as a second,
independent check.

---

## 8. Keeping data in sync with the tracker

The club's real stats live on a public tracker page at cobegbd.com. Rather
than anyone retyping numbers after every match, this project scrapes that
page and updates the database automatically. All three ways of triggering a
sync run through the exact same engine (`lib/trackerSync.ts`), so they behave
identically:

1. **Automatically, hourly, in production** — a Netlify Scheduled Function
   (`netlify/functions/hourly-sync.mts`) calls a protected internal API
   route (`/api/internal/scheduled-sync`) every hour, authenticated with a
   shared secret (`SYNC_SECRET`) instead of an admin login, since there's no
   human present to log in.
2. **Automatically, hourly, on a local PC** — the same idea but done with an
   in-process timer (`lib/autoSync.ts`, started by `instrumentation.ts`) that
   only runs while the dev server itself is running.
3. **On demand** — the "Sync with Tracker Now" button in `/admin/dashboard`,
   for whenever you don't want to wait for the next hourly run.

**What a sync actually does:** fetches the tracker's pages, cross-checks the
numbers against each other (e.g. every player's individual stats must sum to
the tracker's own published totals), and *only writes to the database if
everything checks out*. If the tracker's page layout ever changes in a way
the parser doesn't recognize, the sync stops and changes nothing — it never
guesses or half-writes data. Any mismatch is reported back (visible in the
admin dashboard, or the server logs).

**What gets updated:** Matches, Players (stats/bio — never photos),
Club Info, the club's own Standings row, Transfers, and Rankings.
**What's always preserved, sync after sync:** player photos, position,
join date, favorite player, and the "featured" flag.
**What a sync never touches:** News, Gallery, Comments, and any other
team's row in Standings.

An important environment-detection detail: the code decides whether it's
running on Netlify by checking `process.env.NETLIFY_BLOBS_CONTEXT` — **not**
`process.env.NETLIFY`, which is only set at Netlify's *build* step and is
`undefined` again once the function is actually running live. Getting this
backwards was the root cause of two real bugs fixed during this project's
QA pass (see section 11).

---

## 8a. Match reports and player highlights

Two features that build on top of the tracker sync above:

**Full match reports.** cobegbd.com's own match page (e.g.
`cobegbd.com/match/?id=59092`) shows a much richer breakdown than the club
page ever does — a 1-vs-1 stat comparison for every player who took part,
aggregate team stats, and the Man of the Match. `lib/matchReportSync.ts`
scrapes and caches this (in the `MatchReport` table) so the site can show
the same detail at `/matches/report/[cobegMatchId]`, linked from a "View
Full Report" button on the Matches page for any match that has one.

How the id is captured: `lib/trackerSync.ts` reads a match's own numeric
report-page id off whichever of the club page's two tabs currently shows
that match — the **Fixtures** tab's own `<a href>` while it's still
upcoming, or (once it's played) an `onclick="location.href='...'"` handler
on that match's card in the **Rounds** tab, which isn't a plain link and is
easy to miss. Either way, once captured the id is carried forward across
every future sync (matched by opponent + date, since every sync fully
replaces the `Match` table), and its full report is fetched once and
cached forever the moment the match is COMPLETED with a known id.

The one gap: the Rounds tab only ever shows a limited recent window of
completed matches (its own "All (N)" filter on the tracker caps out), so a
match old enough to have scrolled out of that window — and that was also
never seen while it was still an upcoming fixture — has no automatic way to
get an id. This was a deliberate trade-off in favor of not guessing at data
that can't be confirmed accurate, rather than making up an id.

**Manual backfill for anything the automatic capture misses.** Editing any
match from `/admin/matches` has an optional "Tracker Match Report Link"
field — paste in that match's own link from cobegbd.com (or just its id
number) and save. This works for a match from any point in the past, since
the admin is supplying a confirmed real id rather than the site guessing
one. The next sync (automatic or the dashboard button) fetches and caches
its report exactly the same way as an automatically-captured one —
`lib/matchReportSync.ts`'s `syncMatchReports()` doesn't care how a match got
its `cobegMatchId`, only that it has one. Leaving the field blank on an
unrelated edit (fixing a score, adding notes) never clears a previously-set
id — the form always round-trips whatever value is already there.

**Player highlights.** From `/admin/highlights`, the admin can upload a
photo to any player's profile page — a screenshot of a great moment —
optionally tagged to one of that player's completed matches (opponent,
date, score, and competition are captured at upload time). These show up
in a "Match Highlights" gallery near the bottom of that player's public
profile page, with a lightbox viewer. Stored in the `PlayerHighlight`
table, keyed by the player's stable in-game ID rather than their database
row id — matches, the same reasoning `PlayerStatSnapshot` already relies on
(see section 4), since a sync fully replaces `Player` rows on every run.

---

## 9. Authentication & security

- **Sessions**: a custom, dependency-free signed-cookie scheme — the cookie
  holds `base64url(payload).HMAC-SHA256(payload, SESSION_SECRET)`, the same
  shape as a JWT but without pulling in a JWT library. httpOnly,
  `sameSite=lax`, 7-day expiry.
- **Passwords**: hashed with bcrypt (cost factor 12) — plaintext is never
  stored anywhere, including in the database.
- **Route protection**: `middleware.ts` blocks unauthenticated requests to
  every `/admin/*` page and every write API route at the server level (not
  just by hiding UI); each mutating route re-checks the session itself too.
- **Input validation**: every API route validates its input with Zod before
  touching the database.
- **SQL injection**: not possible — Prisma's parameterized queries are used
  everywhere; there is no raw SQL in the codebase.
- **XSS**: React escapes all rendered text by default; the app never uses
  `dangerouslySetInnerHTML`.
- **Image uploads**: restricted to JPEG/PNG/WEBP/GIF, capped at 5MB, saved
  under a randomly generated filename (the client-supplied filename is
  never trusted).
- **Rate limiting**: the login route allows 5 attempts/minute per IP+email;
  comment submission allows 5 per 10 minutes per IP.
- **Comment authenticity**: a comment can only be signed with a name that
  exactly matches a *current* roster entry, checked server-side — never a
  free-text field, so nobody can impersonate a player who isn't real or
  isn't currently on the team.

---

## 10. Deployment (Netlify)

The site deploys straight from GitHub — every push to the `main` branch
triggers an automatic Netlify build and deploy. Netlify auto-detects this as
a Next.js project; the one override is the build command itself
(`netlify.toml`: `npm run build:netlify`), which generates the Prisma client
against the **production** (Postgres) schema instead of the local SQLite one.

Three things behave differently in production vs. local dev, all handled
automatically by the code with nothing to toggle by hand:

| | Local (a PC) | Netlify (live site) |
|---|---|---|
| Database | SQLite file (`prisma/dev.db`) | Netlify Database (Postgres) |
| Image uploads | Saved to `/public/uploads` | Saved to Netlify Blobs |
| Hourly tracker sync | An in-process timer (`lib/autoSync.ts`) | A Netlify Scheduled Function |

**Environment variables set on Netlify** (Site configuration → Environment
variables): `DATABASE_URL` (the Postgres connection string), `SESSION_SECRET`
(reused from local `.env`), `SYNC_SECRET` (a separate random key, used only
by the hourly scheduled function). See `PROJECT-CREDENTIALS.md` for the
actual current values (kept private, not in this file).

Everything fits Netlify's **free plan** for a small club site's traffic:
hosting, the scheduled function, and Netlify Blobs are all free-tier
features; Netlify Database's free allowance is generous for light use and
sleeps automatically when idle.

---

## 11. Notable fixes made during this project's end-to-end QA pass

A full functional review of the live site turned up and fixed the following
(all deployed and verified live):

1. **Image upload crash ("Something went wrong on our end")** — root cause:
   the code checked `process.env.NETLIFY` to decide whether to save uploads
   to Netlify Blobs vs. local disk, but that variable is only set at
   Netlify's *build* step, not at runtime — so every deployed upload
   attempted (and failed) to write to a read-only filesystem. Fixed by
   switching the check to `process.env.NETLIFY_BLOBS_CONTEXT`, which Netlify
   actually injects into every live function invocation.
2. **Duplicate hourly sync** — the exact same root cause also caused the
   local-dev-only in-process sync timer to incorrectly start running
   *in addition to* the dedicated Netlify Scheduled Function once deployed,
   meaning syncs briefly ran twice in parallel. Fixed by the same change.
3. **"Division Rank" mislabeling** — the roster's rank badge and filter were
   labeled "Division Rank" / "All Divisions," but the underlying value is
   actually each player's numeric all-time rank from the tracker (e.g.
   `#6576`), not a real division — so the filter dropdown was sorting and
   grouping numbers as if they were text (`#10391` sorting before `#6576`).
   Relabeled to "All-Time Rank" everywhere (English and Bengali) and fixed
   to sort/filter numerically.
4. **Win-rate inconsistency** — the shared `winRate()` helper ignored draws
   entirely, while the bio-text generator and the Matches page's own stats
   both already credited a draw as half a win (the standard convention) —
   so the *same player's* win rate could show two different numbers on
   their own profile page. Fixed by adding a `draws` parameter to
   `winRate()` and threading it through every place win rate is displayed.
5. **"Powered by Netlify" badge** — removed from the live site per request
   (this is separate from Netlify's own free-tier hosting, which is
   unaffected).
6. **Social-media link previews** — the site had no Open Graph / Twitter
   Card tags at all, so pasting the link into WhatsApp, Messenger, Discord,
   etc. showed plain text with no thumbnail. Added full `openGraph` and
   `twitter` metadata plus a dedicated 1200×630 preview image
   (`public/og-image.jpg`).

---

## 12. Local development setup

```bash
npm install                                    # install dependencies
cp .env.example .env                           # create your environment file
# edit .env: set SESSION_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npx prisma db push                             # create the local database
npm run db:seed                                # load sample data + first admin login
npm run dev                                    # start the dev server
```

Or on Windows, double-click `setup-and-run.bat`, which does all of the above
in one step. Visit `http://localhost:3000` for the public site and
`http://localhost:3000/en/admin/login` for the admin panel.

**Useful scripts** (all runnable as `.bat` double-click files on Windows):

| Script | What it does |
|---|---|
| `setup-and-run.bat` | First-time install + database setup + start the dev server |
| `sync-with-tracker.bat` | Manually pull the latest tracker data right now |
| `update-real-data.bat` | Re-apply real club info, matches, and fixtures |
| `update-roster.bat` | Load in the full real 25-player roster |
| `update-database-schema.bat` | Update the LOCAL database schema (non-destructive) |
| `scripts/update-netlify-database-schema.bat` | Update the LIVE (Netlify) database schema only — never touches the admin login, unlike `scripts/setup-netlify-database.bat` |
| `clean-and-retry.bat` | Full `node_modules` wipe-and-reinstall, for stuck installs |
| `github-push.bat` | Commit and push the current state to GitHub |

---

## 13. Reliability & error handling

- Every API route wraps its database calls in a shared error handler
  (`lib/apiErrors.ts`) that returns the correct HTTP status (404 for "not
  found," 409 for a conflicting update, 500 with no internal detail leaked
  for anything unexpected) instead of guessing or mislabeling errors.
- `error.tsx` catches unexpected errors on any page and shows a branded
  "Something went wrong" screen with a retry button instead of a raw crash.
- `not-found.tsx` shows a clean "Page not found" screen for a deleted or
  mistyped URL.
- `global-error.tsx` is a last-resort fallback if the page layout itself
  fails to load.

---

## 14. Where to find things

| Looking for... | Go to |
|---|---|
| Screenshots of every page | `docs/screenshots/`, or `SHOWCASE.md` |
| Current login/database credentials | `CREDENTIALS.md`, `PROJECT-CREDENTIALS.md` |
| Step-by-step GitHub setup | `GITHUB-SETUP.md` |
| Everything else about running/deploying | `README.md` (shorter, task-oriented version of this document) |

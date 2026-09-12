# Nirbana United EFC — Club Website

**Meditate. Dominate. Celebrate.**

The official public website and admin management tool for **Nirbana United
EFC**, an eFootball Mobile club. One club captain (the admin) manages
everything — roster, match results, fixtures, news, standings, and a photo
gallery — from a private dashboard, while the public site stays fully
bilingual (English/Bengali) and up to date automatically.

Built with Next.js (App Router), Tailwind CSS, Prisma + SQLite, and
`next-intl`.

## Screenshots

> Add your own screenshots here so they show up on GitHub — see
> **"Adding the screenshots"** just below the table.

| Home | Player Profile |
|---|---|
| `docs/screenshots/home.png` | `docs/screenshots/player-profile.png` |

| Gallery + Comments | Admin Dashboard |
|---|---|
| `docs/screenshots/gallery-comments.png` | `docs/screenshots/admin-dashboard.png` |

### Adding the screenshots

1. Create a folder named `docs/screenshots` inside the project folder (right
   next to `app`, `components`, etc.).
2. With the site running (`setup-and-run.bat`), open each page in your
   browser and take a screenshot (Windows: `Win + Shift + S`).
3. Save each image into `docs/screenshots` using the exact filenames in the
   table above (e.g. `home.png`).
4. That's it — GitHub will automatically display them once this README is
   pushed, because the table already points at those file paths.

Good pages to capture: the homepage, a player's profile page, a gallery
photo with its comments open, and the admin dashboard.

## What's included

- **Public site**: Home, Club Info, Roster (sortable/filterable), Player
  Profiles, Matches (fixtures + results), News, Standings, Gallery (with a
  lightbox) — all in English and Bengali, switchable from the navbar.
- **Comments**: visitors can comment on news posts and gallery photos
  without creating an account — they pick their name from an `@`-autocomplete
  of the current squad roster instead of logging in. Every comment waits in
  an admin approval queue before it goes public, so nothing appears on the
  site unmoderated.
- **Admin panel** at `/admin` (single admin account — the club owner/captain):
  full CRUD for players, matches, news, standings, gallery images, and the
  club's "About" text, plus a comment moderation queue and a self-service
  "Change Password" screen.
- **Notifications**: an automatic feed of new results, upcoming fixtures,
  and published news posts, visible from a bell icon in the navbar.
- **SQLite database** via Prisma (zero setup) — swap to Postgres/MySQL later
  with a one-line config change.
- **Session-based auth** (signed, httpOnly cookies that last 7 days),
  rate-limited login, Zod-validated API routes, and image uploads restricted
  by type/size.
- **Graceful error handling** throughout: every API route returns a proper,
  professional error response instead of a raw crash (see "Reliability"
  below), and the site shows a clean branded page instead of a technical
  error screen if something ever does go wrong (e.g. a deleted news post).

## Requirements

- Node.js 18.18 or newer (Node 20 LTS recommended)
- npm (comes with Node)

## First-time setup

```bash
# 1. Install dependencies
npm install

# 2. Create your environment file
cp .env.example .env
```

Open `.env` and set:

- `SESSION_SECRET` — generate one with:
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — the first admin login. **Change the
  password after your first login** using the in-app "Change Password"
  screen (Admin Dashboard → Change Password) — see below.

```bash
# 3. Create the database and load sample data
npx prisma db push
npm run db:seed

# 4. Start the dev server
npm run dev
```

Visit `http://localhost:3000` for the public site and
`http://localhost:3000/admin/login` to sign in with the admin credentials
from your `.env` file.

(Steps 3-4 are also available as one command: `npm run setup` after
`npm install`. On Windows, double-clicking `setup-and-run.bat` does all of
this for you, including installing dependencies.)

For your own reference, `CREDENTIALS.md` (kept out of Git — see
`.gitignore`) has your admin login and environment variable values written
out in plain language.

## Changing the admin password

Go to **Admin Dashboard → Change Password**, enter your current password
and the new one, and save — no code or database editing needed. Sessions
elsewhere stay valid; only future logins need the new password.

## Moderating comments

Visitors can leave a comment on any news post or gallery photo. New
comments start out **pending** and are invisible to everyone except admins
until approved. Go to **Admin Dashboard → Manage Comments** to review the
queue — the dashboard shows a red badge with the pending count so you never
miss one. From there you can **Approve** (makes it public) or **Delete**
each comment. A commenter can only sign their comment with a name that's
currently on the roster — there's no free-text name field — so a comment
can never impersonate someone made up.

## Project structure

```
app/
  [locale]/            Public pages + admin pages (locale-prefixed: /en/..., /bn/...)
    admin/             Admin panel (protected by middleware.ts)
    error.tsx          Branded fallback UI for unexpected errors
    not-found.tsx       Branded 404 page
  api/                 REST API routes (players, matches, news, standings, gallery, club, comments, upload, auth)
  global-error.tsx     Last-resort fallback if the root layout itself fails
components/            Shared UI (cards, nav, forms, CommentBox)
components/admin/      Admin-only forms and controls
lib/                   Database client, auth, validation (zod), rate limiting, error handling, utils
prisma/
  schema.prisma        Data model
  seed.ts              Sample data + first admin account
messages/
  en.json, bn.json     All UI text, per locale
public/
  brand/crest.jpg      Club crest
  uploads/             Uploaded player photos, news images, gallery images (local dev)
```

## Adding content

Everything (players, matches, news, standings rows, gallery images, the
"About" text) is managed from `/admin` once logged in — no code changes
needed for day-to-day club updates.

## Pulling in real club data (already done once)

`prisma/update-real-data.ts` applies the club's real info, match results,
and fixtures (sourced from the club's cobegbd.com tracker page) to the
database — double-click **`update-real-data.bat`** to run it. It's safe to
run again later (e.g. after the tracker page changes): it only touches
Club Info, Matches, and one stale News post — **players and gallery images
are never touched**, so nothing an admin has added by hand is at risk.

`prisma/update-roster.ts` (double-click **`update-roster.bat`**) loads in
the real, complete 25-player roster — every squad member, with real
in-game UID, device, goals, and win/draw/loss record, merged from the
club's tracker screenshots. The full squad is visible to anyone on the
public **Roster** page (no login needed) — that's already "everyone can
see all members." Each player's exact football position, join date, and
photo aren't published by the tracker, so those are loaded as placeholders
— edit any player in `/admin` to fill in the real details. (The roster's
"All-Time Rank" badge — each player's numeric rank on the tracker site — IS
published by the tracker, and updates on its own with every sync below;
there's nothing to fill in for that one.)

## Keeping data in sync with the tracker

The tracker's numbers (matches, fixtures, squad stats, transfers, rankings)
change every day or two as the club plays. There are three ways to pull the
latest numbers straight from cobegbd.com and update the site to match — no
manual copying needed either way, and all three run the exact same sync
engine (`lib/trackerSync.ts`), so they behave identically:

- **Automatically, in the background**: as long as the site's server is
  running (the `setup-and-run.bat`/`npm run dev` window is open, or a
  deployed server is up), it checks cobegbd.com and updates the site on its
  own once an hour — see `instrumentation.ts` and `lib/autoSync.ts`. This is
  the "set it and forget it" option; nothing to click. It only runs while
  that process is alive, though — it can't sync while your PC or the
  server is off, since there's no separate cloud job doing this.
- **On your own PC, right now**: double-click **`sync-with-tracker.bat`**
  any time you don't want to wait for the next hourly check.
- **Once the site is deployed online** (see below): log into `/admin` and
  click the **"Sync with Tracker Now"** button on the dashboard. This is
  the one to use in production — nobody needs a copy of this project's
  source code, Node.js, or a `.bat` file just to refresh the data; any
  logged-in admin can trigger it from a browser, from any device.

Either way, it fetches the same pages the tracker itself shows,
cross-checks the numbers against each other (e.g. every player's
individual stats must sum to the tracker's own totals), and **only writes
to the database if everything checks out**. If the tracker's page layout
ever changes in a way the parser doesn't recognize, it stops and changes
nothing rather than risk saving bad data — you'll see exactly what didn't
match, either in the terminal window or right there in the admin dashboard.

What it updates: Matches, Players (stats/bio, not photos), Club Info,
Standings (our row), and the `Transfer`/`RankingSnapshot` tables (used by
the Transfers and Rankings pages).
What it always preserves: player photos, position/role, join date,
favorite player, and the "featured" flag you set in `/admin`. What it
never touches: News, Gallery, Comments, and any other teams' rows in
Standings.

## Deploying to Netlify (free)

The site is set up to deploy to [Netlify](https://netlify.com) as a fully
working, live site — real database, working image uploads, and the same
hourly background sync — all on Netlify's free plan for a small club site's
traffic. This works differently from local dev in three ways, all handled
automatically by the code (nothing to toggle by hand):

| | Local (your PC) | Netlify (live site) |
|---|---|---|
| Database | SQLite file (`prisma/dev.db`) | Netlify Database (Postgres) |
| Image uploads | Saved to `/public/uploads` | Saved to Netlify Blobs |
| Hourly tracker sync | A timer inside the running server (`lib/autoSync.ts`) | A Netlify Scheduled Function (`netlify/functions/hourly-sync.mts`) |

The code detects which environment it's running in automatically
(Netlify injects its own environment variables into every deployed
function) — you never set anything yourself for this to work.

### One-time setup

1. **Push this repo to GitHub** — see `GITHUB-SETUP.md` if you haven't
   already (needed either way, since Netlify deploys straight from GitHub).
2. **Create a new site on Netlify** from that GitHub repo (Netlify's
   dashboard: **Add new site → Import an existing project → GitHub** → pick
   `nirbana-united-efc`). Netlify auto-detects this as a Next.js project;
   leave the build settings as detected — `netlify.toml` in this repo
   already tells it to run `npm run build:netlify`.
3. **Create a Netlify Database** for the site (Netlify's dashboard: your
   site → **Database** tab → follow its setup — this is a few clicks, no
   command line). Copy the Postgres connection string it gives you.
4. **Run the one-time database setup script**, `scripts/setup-netlify-database.bat`,
   by double-clicking it on your PC. It will ask you to paste in the
   connection string from step 3, then it creates all the tables and your
   production admin login. It cleans up after itself so your local dev
   database keeps working normally afterward — always let it run to the
   end rather than closing the window partway through.
5. **Set environment variables** on Netlify (your site → **Site
   configuration → Environment variables**): `DATABASE_URL` (same
   connection string from step 3), `SESSION_SECRET` and `SYNC_SECRET` (both
   from `CREDENTIALS.md` on your PC — copy them exactly). See
   `CREDENTIALS.md` section 2b for the full table.
6. **Deploy** — Netlify builds and deploys automatically once the repo is
   connected; if it already ran once before you set the environment
   variables, trigger one more deploy from Netlify's dashboard (**Deploys →
   Trigger deploy**) so the new variables take effect.
7. Log into `/admin` on the live URL Netlify gives you and click **"Sync
   with Tracker Now"** on the dashboard — this loads all the real club data
   (roster, matches, transfers, rankings) straight from cobegbd.com, the
   same way `update-real-data.bat`/`update-roster.bat`/`sync-with-tracker.bat`
   do locally.

### Every time you make changes afterward

Netlify redeploys automatically on every push to GitHub — so the normal
GitHub Desktop workflow in `GITHUB-SETUP.md` (review changes → commit →
push) is all you need. No extra Netlify step, unless you're changing an
environment variable itself.

### Costs

Everything above fits Netlify's free plan for a small club site's traffic:
hosting, the scheduled sync function, and Netlify Blobs are all free-plan
features; Netlify Database's free allowance is generous for light use, and
the database automatically sleeps when idle to save on cost. Keep an eye on
Netlify's own usage dashboard if traffic grows.

## Reliability & error handling

- Every API route wraps its database calls in a shared error handler
  (`lib/apiErrors.ts`) that returns the correct HTTP status — 404 for
  "not found", 409 for a conflicting update, 500 (with no internal detail
  leaked) for anything unexpected — instead of guessing or mislabeling
  errors.
- `error.tsx` catches unexpected errors on any page and shows a branded
  "Something went wrong" screen with a retry button, instead of a raw crash.
- `not-found.tsx` shows a clean "Page not found" screen for a deleted or
  mistyped URL (e.g. an old link to a deleted news post).
- `global-error.tsx` is a last-resort fallback if the page layout itself
  fails to load.

## Security notes

- Passwords are hashed with bcrypt (cost factor 12); plaintext is never stored.
- Sessions are signed (HMAC-SHA256), httpOnly, sameSite=lax cookies, 7-day
  expiry.
- `middleware.ts` rejects unauthenticated requests to `/admin/*` pages and
  to every write (POST/PUT/DELETE) API route at the server level (not just
  hidden UI) — each mutating API route also re-checks the session itself
  as a second layer.
- All API input is validated with Zod before touching the database.
- Prisma's parameterized queries prevent SQL injection; there is no raw
  SQL anywhere in this codebase.
- React escapes all rendered text by default; the app never uses
  `dangerouslySetInnerHTML`.
- Image uploads are restricted to JPEG/PNG/WEBP/GIF, capped at 5MB, and
  saved under a randomly generated filename — the client-supplied filename
  is never trusted or used.
- The login route is rate-limited (5 attempts/minute per IP+email); comment
  submission is rate-limited (5 per 10 minutes per IP).
- A public comment can only be signed with a name that's an exact match to
  a current roster entry, checked server-side — the "pick a name" list is
  not just a UI suggestion.

## Troubleshooting: "npm install failed" / EPERM query_engine-windows.dll.node

`setup-and-run.bat` now installs dependencies through
`scripts/safe-npm-install.js`, which automatically retries once if it hits
the classic Windows Prisma error (a locked query engine file, usually
because a previous `npm run dev` window was left open). If it still fails
after the automatic retry, it prints the three likely causes (another
window still running the site, antivirus real-time scanning, or the folder
being inside a OneDrive-synced path) and next steps. Double-click
**`clean-and-retry.bat`** for a full `node_modules` wipe-and-reinstall if
the normal retry isn't enough.

## Putting this project on GitHub

See `GITHUB-SETUP.md` for a step-by-step guide written for exactly this
project (no prior Git experience assumed), including how to keep GitHub
updated every time this project changes.

## A note on how this was built

This project's source was written entirely by hand in a sandboxed
environment whose network policy blocks package registries (npm, PyPI,
etc.), so `npm install` and the dev server could not be run or tested from
that sandbox — only from your own machine. The code follows standard,
well-documented patterns for each library at the pinned versions in
`package.json`. If `npm install` or `npm run dev` surfaces an error on
your machine, share the exact error message and it can be fixed quickly.

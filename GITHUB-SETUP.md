# Putting this project on GitHub

This guide gets your project onto GitHub properly — the way a developer
would — with no prior Git experience assumed. There are two ways to do it;
pick whichever feels more comfortable. Both end up in the same place.

**Important thing to understand first:** GitHub is not like a synced folder
(OneDrive/Dropbox) that updates itself automatically. Every time you (or I,
Claude) make changes to the project, someone has to take one extra step —
called a "commit and push" — to send those changes to GitHub. Nothing goes
there on its own. This guide shows you that one step for both methods below,
so keeping GitHub current is always just a couple of clicks away.

---

## Method A — GitHub Desktop (recommended, no typing commands)

This is the easiest path. GitHub Desktop is a free app with buttons for
everything — no black terminal window involved.

### One-time setup

1. **Create a free GitHub account** at [github.com](https://github.com) if
   you don't already have one.
2. **Download GitHub Desktop** from
   [desktop.github.com](https://desktop.github.com) and install it.
3. Open GitHub Desktop and sign in with your GitHub account when it asks
   (this opens your browser for a moment — that's normal and safe).
4. In GitHub Desktop, go to **File → Add local repository**.
5. Click **Choose...** and select your project folder
   (`C:\Aishik\Nirban\nirbana-united-efc`).
6. It will say this folder isn't a Git repository yet and offer to
   **create a repository here** — click that.
7. Click **Publish repository** in the top bar.
   - Give it a name (e.g. `nirbana-united-efc`).
   - Add a short description if you like (e.g. "Official website for
     Nirbana United EFC").
   - **Leave "Keep this code private" checked**, unless you specifically
     want the public to be able to see your source code (your `.env` file
     and database won't be uploaded either way — see "What never gets
     uploaded" below — but the rest of the code would be visible to
     anyone if the repository is public).
   - Click **Publish repository**.

That's it — your project is now on GitHub. You'll see it appear on
github.com under your account.

### Every time something changes (yours or mine)

1. Open GitHub Desktop.
2. It automatically shows you every file that changed, with a green/red
   diff so you can see exactly what's different.
3. Type a short summary in the box at the bottom left (e.g. "Added comment
   feature" or "Fixed gallery layout") — this is just a label for your own
   history, doesn't need to be fancy.
4. Click **Commit to main**.
5. Click **Push origin** at the top (this sends it to GitHub).

That's the entire ongoing workflow — two clicks and a one-line note, any
time you want GitHub to reflect the current state of the project.

---

## Method B — Command line (Git), the way most developers do it

Use this if you'd rather script it or you're already comfortable with the
`.bat`-file style this project uses elsewhere.

### One-time setup

1. **Create a free GitHub account** at [github.com](https://github.com) if
   you don't already have one.
2. **Install Git for Windows** from
   [git-scm.com/download/win](https://git-scm.com/download/win) — accept
   the defaults during install (they include "Git Credential Manager",
   which is what lets `git push` below sign you in through your browser
   instead of asking for a password).
3. On GitHub.com, click the **+** icon (top right) → **New repository**.
   Give it a name (e.g. `nirbana-united-efc`), leave it **Private** unless
   you want it public, and click **Create repository** — don't check any
   of the "Initialize with..." boxes. On the next page, copy the URL under
   **"…or push an existing repository from the command line"** — it looks
   like `https://github.com/your-username/nirbana-united-efc.git`.
4. In your project folder, double-click **`github-push.bat`** (created for
   you — see below). The first time you run it, it will ask you to paste
   that URL — paste it in and press Enter.
5. It will run through `git init`, add all files, commit, and push. The
   very first push opens a browser window asking you to sign in to GitHub
   — sign in once, and it remembers you after that.

### Every time something changes (yours or mine)

Just double-click **`github-push.bat`** again. It stages every change,
commits it with today's date as the message, and pushes it to GitHub — one
click, no typing.

If you'd like more descriptive commit messages than "the current date",
you can instead open a terminal in the project folder and run:

```bash
git add -A
git commit -m "Describe what changed here"
git push
```

---

## What never gets uploaded (on purpose)

Both methods respect this project's `.gitignore` file, which excludes:

- `.env` — your real secrets (session key, database location)
- `CREDENTIALS.md` — your own credentials reference
- `prisma/dev.db` — your actual club database (players, matches, comments,
  everything) — you would not want your live data sitting in a public or
  even private GitHub history
- `node_modules/`, `.next/` — large, regeneratable build files
- Uploaded images under `public/uploads/`

This is standard practice — a GitHub repository should hold your *code*,
not your live data or secrets. If you ever want to back up your actual
database or images, do that separately (e.g. copy `prisma/dev.db`
somewhere safe), not through GitHub.

## When I (Claude) make further changes to this project

I edit the project files directly on your PC through the same connection
we've been using all along — those changes land on your computer the same
way they always have. GitHub is a separate, optional step on top of that:
once I tell you I've made changes, just run through the "every time
something changes" steps above (either method) whenever you want GitHub to
catch up. I can't click those buttons or run that script for you myself —
it needs to happen on your machine, under your own GitHub sign-in — but the
whole thing is one commit + one push, so it only takes a few seconds.

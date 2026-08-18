# Eligibility check widget

A small deterministic flow (email → program area → program-specific questions →
accept/reject) matching Eligibility form.docx, hosted on Vercel and embedded
in WordPress via a button + modal.

## Files

- `index.html` — the widget itself. All flow logic lives in the `FLOWS` object
  near the top of the `<script>` tag, so updating questions later is a matter
  of editing that object, not rebuilding anything.
- `api/submit.js` — Vercel serverless function that logs each submission by
  appending a row to a CSV file committed into this GitHub repo.
- `wordpress-embed.html` — snippet for a WordPress Custom HTML block: a button
  that opens the widget in a modal iframe.

## 1. Push to GitHub

Create a repo (e.g. `eligibility-agent`) and push these files to it.

## 2. Deploy on Vercel

1. In Vercel, "Add New Project" → import that GitHub repo. No build step is
   needed — it's static HTML plus one serverless function, so the defaults work.
2. In Project Settings → Environment Variables, add:
   - `GITHUB_TOKEN` — a GitHub personal access token with `repo` scope (create
     one under GitHub → Settings → Developer settings → Personal access tokens).
     Grant it access to this specific repo only.
   - `GITHUB_REPO` — `your-username/eligibility-agent`
   - `GITHUB_CSV_PATH` — `submissions.csv` (or wherever you want the log kept)
   - `GITHUB_BRANCH` — `main`
3. Deploy. Every push to the connected branch redeploys automatically, so
   editing `index.html`'s `FLOWS` object and pushing is enough to update the
   live questions — no manual redeploy step.
4. Your widget will be live at `https://your-project.vercel.app`.

## 3. Embed in WordPress

1. Open `wordpress-embed.html`, replace `WIDGET_URL` with your Vercel URL.
2. Add a "Custom HTML" block on the WordPress page/post where the button
   should appear, and paste the snippet in.
3. The button opens the widget in a modal overlay; closing it unloads the
   iframe so the next open always starts a clean session.

## Logging

Each completed submission (accept or reject) is POSTed to `/api/submit`,
which appends a row — timestamp, email, program area, determination, and the
raw answers as JSON — to `submissions.csv` in the GitHub repo, committing the
change directly. Open that file any time (or clone the repo) to see the log.

**Note on scale:** this approach commits directly to GitHub on every
submission, which is simple and needs no database, but two submissions
arriving at the exact same moment can occasionally race and one will fail to
log (the person still sees their result either way — logging failures never
block the response). Fine for typical form volumes; if you start getting many
simultaneous submissions, move `submit.js` to write to a small database
(e.g. Vercel Postgres) instead.

## Updating the questions later

Everything about the flow — program areas, questions, branching, and the
final accept/reject text — lives in the `PROGRAM_AREAS`, `FLOWS`, `ACCEPT_TEXT`,
and `REJECT_TEXT` values at the top of `index.html`. Editing those and pushing
to GitHub is the entire update process.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

EventEase — a no-signup group scheduling poll app. An organizer creates a poll with time slots, shares a link, participants vote (`yes` / `if_need_be` / `no`) and may suggest new slots, and the organizer finalizes one slot. Finalizing emails everyone who left an address, with an `.ics` attachment. Live at https://eventeaseapp.up.railway.app/ (Railway). The UI text, README, comments and commit messages are in **Slovenian**. Keep new user-facing strings in Slovenian.

## Commands

Full stack (app on :8080, Postgres on :5432, Mailpit UI on :8025; compose sets `DISABLE_EMAILS=true`):
```bash
docker compose up --build
```

Backend (Zig **0.16.0**, in `backend/logic`). It needs a running Postgres:
```bash
export DATABASE_URL="postgresql://admin:admin@localhost/eventeasedb"
zig build run     # listens on :3000
zig build test    # unit tests (only src/uuid.zig is wired into the test step)
```

Frontend (React 19 + Vite 8 + Tailwind 4, in `frontend/EventEase`):
```bash
npm ci
npm run dev       # :5173, proxies /api → localhost:3000
npm run lint
npm test          # node --test src/**/*.test.js (built-in node test runner, no Jest/Vitest)
node --test src/utils/eventHelpers.test.js   # single test file
npm run build
```

API smoke test against a running instance (needs `jq`): `bash scripts/ci-smoke-test.sh http://localhost:8080`

CI (`.github/workflows/ci.yml`) runs frontend lint/test/build, then `zig build` + `zig build test`, then a docker compose build plus the smoke test.

## Architecture

**Deployment shape:** one Docker image (multi-stage `Dockerfile`). nginx serves the built SPA from `/usr/share/nginx/html` and proxies `/api/` to the Zig binary `logic` on :3000. Both processes start from the `CMD` shell line. nginx's listen port is rewritten to `$PORT` at startup for Railway. Only `DATABASE_URL` and `RESEND_API_KEY` are passed through to the Zig process explicitly.

**Backend (`backend/logic/src`):**
- `main.zig`: builds the `App` context (`db` pool, `io`, `rng`), runs migrations, starts the cleanup thread and registers all routes. httpz handlers have the signature `fn(app: *App, req, res) !void`.
- `routes.zig`: all handlers plus the email and ICS logic, in one large file. Requests are parsed with `jsonParse` (unknown fields are ignored). Responses use `res.arena` allocations. Postgres errors are logged via `conn.err`.
- `db.zig`: pg.zig pool (size 5). `migrate()` runs `@embedFile("podatkovna_shema.sql")` on every startup.
- `cleanup.zig`: an hourly thread that deletes finalized polls 7 days after the final slot ends.
- `static.zig`: a catch-all `/*` fallback that serves the SPA files directly. In production nginx handles static files, so this is mostly unused.
- `uuid.zig`: UUID helpers with tests. `routes.zig` has its own duplicate `uuidV4Hex`.

**Schema: two copies, and they have diverged.** `backend/logic/src/podatkovna_shema.sql` is the one embedded and run by the backend. It is idempotent (`IF NOT EXISTS`, `DO $$` blocks for added columns and constraints). `backend/database/podatkovna_shema.sql` is the older, non-idempotent version that the README's manual `psql` step uses. Make schema changes in the `src/` copy, and write them idempotently because they run on every boot against existing databases. Tables: `polls`, `time_slots`, `votes`, `vote_options` (vote×slot status), `slot_suggestions` (pending/accepted/rejected).

**Auth model:** there are no sessions. Each poll has two UUIDs: `share_token` (participants, `/api/polls/share/:token/...`) and `admin_token` (organizer, `/api/polls/admin/:token/...`). Whoever holds the token has that access. UUIDs are passed to Postgres as text and selected back with `::text`.

**Email:** sent through the Resend HTTP API by shelling out to `curl`, with the payload written to `/tmp/resend_payload.json`. The sender is `onboarding@resend.dev`. Sending is skipped when `DISABLE_EMAILS` is set to anything other than empty, `0` or `false`. Email failures are logged and never fail the request. The commented-out msmtp code paths, `msmtprc` and the Mailpit service are leftovers from an earlier SMTP approach.

**Frontend (`frontend/EventEase/src`):** plain `fetch` to relative `/api/...` paths, React Router routes in `App.jsx`:
- `/` → `pages/LandingPage`: an internal state machine (`landing` → `create-wizard` → `invite-view`) wrapping `CreateEventPage` (the wizard plus `components/CalendarPicker`).
- `/invite/:token` → `pages/InvitePage`: fetches the poll and renders `views/InviteView` (vote/suggest) or `views/FinalizedView`.
- `/admin/:adminToken` → `views/AdminFinalizeView`: votes via `components/VoteResults`, accepting suggestions, finalizing.
- The backend returns Postgres timestamp text (`"YYYY-MM-DD HH:MM:SS+TZ"`). Views normalize it ad hoc with `.replace(" ", "T").split("+")[0]`, so keep that in mind when you touch date handling.
- Theming is CSS-only via `prefers-color-scheme` (`index.css`, `styles/theme.css`).
- Dead files: `i18j.js` and `src/locales/*.json` are not imported anywhere, and `i18next` is not a dependency. `frontend/fn.txt` is a grep dump, not source.

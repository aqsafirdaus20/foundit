# FoundIt — Lost & Found Portal

FoundIt is a web portal for a campus **lost and found centre**. A finder hands an item in at the centre, and an **admin** records it in FoundIt with a few secret questions that only the real owner could answer. **Users** log in, search the unclaimed items, and claim one by answering its secret questions and describing why it's theirs. The admin reviews the claim and approves or rejects it. This is a BCA III mini project (Dr P.A Inamdar University, 2025-26).

> **Scope note:** this is deliberately simpler than the original synopsis. There is **no** smart matching, **no** notifications and **no** finder↔owner chat, and users do not report items themselves. The stack is Node.js + SQL Server (Prisma) + React instead of PHP/MySQL.

## Keep it simple (this is a learning project)
This is a college learning project, not a production system. Prefer the simplest thing that works, and skip "industry standard" extras unless the user asks for them:
- **One database** (`foundit`). No separate test, staging or shadow databases.
- **No automated tests** (no Jest, supertest or test files). Check each module by hand with curl or a REST client.
- **Simple auth:** username + password with a server-side session cookie (`express-session`, default in-memory store). No JWT, OAuth, refresh tokens, email verification or password reset.
- No Docker, CI pipelines, multiple environments, caching layers, message queues, cron jobs, or microservices.
- No extra abstraction layers (controllers, services, repositories, DTOs, dependency injection).
- Add a library only when a module actually needs it. If unsure, ask before adding infrastructure.

## Working agreement (read first)
- **Backend first, then frontend.** Build **one module per session**. Do not scaffold or implement future modules early.
- **Keep it minimal.** Route handlers are written inline in the feature's route file and call Prisma directly. Pull code into `src/lib/` only when two or more routes share it.
- A module counts as done when `npm run lint` passes and its main flows work when called by hand (curl) against the running server.
- When a module is finished, tick it in the checklist below and note any API or model changes in this file.
- Keep changes scoped to the current module. If an earlier module needs a change, say so explicitly.
- **Never** run `prisma migrate reset` or anything else that drops data without explicit user consent.

## Module checklist
Backend (`server/`):
- [x] **0. Scaffold**: Express 5 app, env validation, Prisma + SQL Server connection, error handler, `GET /api/v1/health`
- [x] **1. Auth & Users**: User model, register, login, logout, `GET /auth/me`, `requireLogin` / `requireAdmin` middleware, `npm run seed`
  - Routes in `routes/auth.js`: `POST /register` (role always `user`), `POST /login`, `POST /logout`, `GET /me` (`requireLogin`).
  - Session: `express-session` mounted in `app.js` (in-memory store), `req.session.user = { id, username, name, phone, role }`.
  - `requireLogin`/`requireAdmin` live in `http.js`, both self-contained (check the session themselves).
  - `scripts/seed.js` — see the dedicated **"Seed data"** section below; it upserts the admin and is now much more than just the admin.
- [x] **2. Reporting (admin adds items)**: Item + SecretQuestion models; admin add / edit / delete items with their secret questions and one optional image; admin list of all items
  - Routes in `routes/items.js`, all behind `router.use(requireAdmin)`: `POST /items` (create item + ≥1 question in a transaction), `GET /items` (paginated, `questionCount` only), `GET /items/:id` (full, with answers — admin-only), `PATCH /items/:id` (partial update; if `questions` is provided, deletes and recreates the whole set), `DELETE /items/:id`, `POST /items/:id/image` (multipart, field `image`).
  - Image upload: Multer disk storage → `uploads/`, random hex filename, ≤5 MB, jpg/png/webp only. **`fileFilter`'s callback needs `cb(null, true)` to accept a file — `cb(null)` alone silently drops it with no error.** `imagePath` is stored as `uploads/<file>` and served at `/uploads/<file>` via `express.static('uploads')` in `app.js`. Re-uploading or deleting an item removes the old file from disk.
  - `errorHandler` in `http.js` now also maps Multer's own errors (e.g. `LIMIT_FILE_SIZE`) to 400.
- [x] **3. Search**: users search **unclaimed** items (keyword, category, dateFound) and view item details. Secret answers are never exposed
  - Resolved the module 2 open point by giving search its **own path**, `/api/v1/search`, rather than reusing `/api/v1/items` (which stays fully admin-only). New file `routes/search.js`, all behind `router.use(requireLogin)`.
  - `GET /search?q=&category=&date=&page=&limit=` — always filters `status: 'unclaimed'`. `q` does a `contains` match against `title` OR `description` (SQL Server's default collation is case-insensitive, confirmed by testing — Prisma's `mode: 'insensitive'` isn't supported on this provider, so it's plain `contains`). `category` is one exact value from the fixed list. `date` matches `dateFound` on the exact day (both sides are date-only values normalized to UTC midnight, so plain equality works — no range needed).
  - `GET /search/:id` — same `status: 'unclaimed'` filter (a claimed item 404s here even though `GET /items/:id` still shows it to the admin); returns `questions: [{ id, question }]`, never the answer.
  - Both routes use an explicit Prisma `select` (not the default all-fields), so nothing internal (`addedById`, answers) can leak by accident even if the model grows more fields later.
- [x] **4. Claims & Verification**: user submits a claim (answers + ownership details) and sees their claims; admin lists pending claims, compares answers side by side, and approves or rejects
  - New models: `Claim` (itemId, claimantId, ownershipDetails, status `pending|approved|rejected`, adminNote?, createdAt, reviewedAt?) and `ClaimAnswer` (claimId, questionId, answer — the claimant's submitted answer). See `schema.prisma` for the exact cascade/no-action choices and why.
  - Routes in `routes/claims.js`: `POST /claims` (`requireLogin` — must answer every one of the item's questions, one pending claim per user per item, item must be `unclaimed`), `GET /claims/mine` (`requireLogin` — own claims, own submitted answers, **never** the correct answers), `GET /claims` and `GET /claims/:id` (`requireAdmin`, optional `?status=` filter — full comparison: each answer alongside its question's correct answer), `PATCH /claims/:id` (`requireAdmin` — `{ status: 'approved'|'rejected', adminNote? }`; only from `pending`; approving sets the item to `claimed` and auto-rejects the item's other pending claims in the same transaction).
  - Two small necessary follow-ups in `items.js` (module 2's file), now that claims exist: `PATCH /items/:id` rejects replacing `questions` with 409 if the item already has any claims (editing/removing a question a claim already answered would orphan that answer and hit a DB foreign-key error otherwise); `DELETE /items/:id` rejects a `claimed` item with 409, and — since `Claim.item` is `onDelete: NoAction` — explicitly deletes the item's claims (cascading their answers) in the same transaction as deleting the item.
  - **Prisma pitfall hit here:** `onDelete: NoAction` alone isn't enough to avoid SQL Server's "multiple cascade paths" error — Prisma also checks `onUpdate`, which defaults to `Cascade`. Every `NoAction` relation in this schema now sets `onUpdate: NoAction` too.
  - **npm-script pitfall hit here:** chaining `"db:migrate": "prisma migrate dev && prisma generate"` (from module 2) broke `npm run db:migrate -- --name x` — npm appends `-- args` to the end of the whole chained string, so `--name x` landed on `prisma generate` instead of `migrate dev`, leaving `migrate dev` stuck on its interactive name prompt (and, in the background, a stale connection lock on the DB). **Reverted `db:migrate` to just `"prisma migrate dev"`.** Always run a named migration as two explicit commands: `npx prisma migrate dev --name <change>` then `npm run db:generate`.
- [x] **5. Admin extras**: list users; simple dashboard counts (items unclaimed/claimed, claims pending/approved/rejected)
  - New file `routes/admin.js`, mounted at `/api/v1/admin`, all behind `router.use(requireAdmin)` (a dedicated prefix, separate from the resource-owning `items.js`/`claims.js`, since this is dashboard-style functionality rather than CRUD on one resource).
  - `GET /admin/users?page=&limit=` — paginated user list (`id, username, name, phone, role, createdAt`, never `passwordHash`).
  - `GET /admin/stats` — `{ items: { unclaimed, claimed, total }, claims: { pending, approved, rejected, total } }`, plain `count()` calls (no `groupBy`, to stay simple/readable). Verified against direct DB counts, not just eyeballed.

**Backend is complete (modules 0–5).** Next: the frontend, one screen-group per session, in the order below.

Frontend (`client/`) — **minimal UI, no tests**, built module by module like the backend:
- [x] **Vite scaffold + AuthContext** (login/register/logout, loads `/auth/me` on start)
  - Scaffolded with `npm create vite@latest client -- --template react` (React 19, Vite 8). Demo boilerplate (assets, marketing CSS, counter) removed.
  - Plain Bootstrap 5 CSS only (`import 'bootstrap/dist/css/bootstrap.min.css'` in `main.jsx`) — no `react-bootstrap`, no custom theme. `src/index.css` is just a `body { margin: 0 }` reset.
  - Lint: the Vite template ships `oxlint` (zero-config); kept as-is rather than adding ESLint/Prettier to the client, to stay minimal.
  - `vite.config.js` proxies `/api` and `/uploads` to `http://localhost:5000` (`server` must be running on its default port for `npm run dev` in `client` to work).
  - `src/api.js`: one shared axios instance, `baseURL: '/api/v1'`, `withCredentials: true`.
  - `src/AuthContext.jsx`: `AuthProvider` + `useAuth()`. State is just `{ user, loading }`; `login`/`register`/`logout` call the API and update `user`; on mount it calls `GET /auth/me` to restore the session. Callers catch axios errors themselves and read `err.response?.data?.message`.
  - `src/components/ProtectedRoute.jsx`: `<ProtectedRoute>` redirects to `/login` if logged out; `<ProtectedRoute adminOnly>` also redirects non-admins to `/`. Reused by every later frontend module — don't rebuild this.
  - Pages so far: `LoginPage`, `RegisterPage`, `HomePage` (placeholder landing page after login — later modules replace/extend it, don't rebuild the routing shell in `App.jsx`).
  - **Verification note:** no browser-automation tool was available this session, so this was checked by building (`npm run build`), running the real dev server, and hitting the Vite-proxied API endpoints directly (login → cookie → `/auth/me` → logout) to confirm the proxy and the exact calls `AuthContext` makes both work. **Clicking through the actual UI (forms, redirects) still needs a manual check by the user.**
- [x] **Search + item detail** (for users)
  - `src/components/Navbar.jsx` (brand, Search link, username/role, logout) is now rendered by `ProtectedRoute` itself — every logged-in page gets it for free, no per-page layout wrapper. `ProtectedRoute` also now renders the `.container` wrapper, so page components shouldn't add their own.
  - `SearchPage` (`/search`): a filter form (`q`, `category`, `date`) over `GET /search`, results as a card grid, Previous/Next pager. The initial load effect intentionally runs once on mount only (not on every `q`/`category`/`date` keystroke) — searches happen on submit or pager click.
  - `ItemDetailPage` (`/search/:id`): item details + the list of secret **questions only** (never answers). Links back to `/search`, and (since the next module) a "Claim this item" button to `/claim/:id`.
  - Verified against the real running servers (not just the build): created a test item through the backend, confirmed `GET /search`/`GET /search/:id` return exactly the shape these pages expect (no leaked answer text), and confirmed both routes 200 on a direct/refreshed load (Vite's dev-server SPA fallback), then deleted the test item.
  - Two oxlint warnings left as-is (non-blocking, `exit code 0`): `exhaustive-deps` on the mount-only effect in `SearchPage`, and `set-state-in-effect` on the reset-then-fetch effect in `ItemDetailPage` — both are the standard, correct pattern for "fetch when a param changes."
- [x] **Claim form + "my claims"** (for users)
  - `ClaimFormPage` (`/claim/:id`): re-fetches `GET /search/:id` for the item's questions, one text input per question plus an `ownershipDetails` textarea, `POST /claims` on submit, then navigates to `/my-claims`.
  - `MyClaimsPage` (`/my-claims`): lists `GET /claims/mine` as cards — status badge, the user's own answers next to their question text, and the admin's note once reviewed. Item titles are **plain text, not a link** — an approved claim's item becomes `claimed` and 404s on `/search/:id` for everyone (by design), so linking there would routinely 404 for the very claims that succeeded.
  - `ItemDetailPage` now has a "Claim this item" button linking to `/claim/:id`. `Navbar` has a "My claims" link.
  - **Necessary backend fix** (flagged, not silent scope creep): `GET /claims/mine`'s `mineSelect` in `routes/claims.js` didn't include each question's text, only its id — so a user's own claim history had answers with no way to tell which question each one was for. Added `question: { select: { id, question } }` (the text only, never `answer`) alongside each submitted answer. This is safe: the question text was already shown to anyone before they even claim, on `ItemDetailPage`; only the answer is secret, and this change doesn't touch `answer`.
  - Verified end-to-end through the real running app: submitted a real claim through the exact calls these pages make, confirmed the fixed `mine` response actually carries the question text with no leaked secret answer, confirmed a second pending claim on the same item is blocked (409), confirmed the admin's pending queue picks it up with the submitted and correct answers side by side, then removed the test claim so the seed data's documented counts (5 pending/3 approved/2 rejected) stay exact.
- [x] **Admin: items** (add/edit with questions, image upload)
  - `src/categories.js`: the category list, extracted here once `SearchPage` and this module both needed it (matches the backend's "shared by 2+ files" rule for `lib/`).
  - `AdminItemsPage` (`/admin/items`, `adminOnly`): a plain table (not the card grid `SearchPage` uses — denser, more per-row actions, matches an admin management view rather than a browsing view) with Edit/Delete per row.
  - `AdminItemFormPage` handles both `/admin/items/new` (create) and `/admin/items/:id` (edit) by checking whether `:id` is present. **Edit mode is three independent forms, each its own `PATCH`/`POST`, not one big submit** — this directly mirrors the backend's independent update paths: "Save details" sends everything *except* `questions`; "Save questions" sends *only* `{ questions }`; the image uploads separately via `POST /items/:id/image`. Splitting them this way means a routine detail edit never accidentally triggers the "item already has claims" 409 that changing `questions` deliberately can. Create mode has no such split — a brand-new item can't have claims yet, so `questions` goes in the same `POST` as everything else.
  - Deleting is behind a plain `window.confirm`; a claimed item's delete/question-edit 409s are shown as-is (the same generic error alert every form already uses), not specially predicted/disabled client-side.
  - Verified end-to-end through the real running app: logged-out → 401, non-admin → 403; created an item, edited its details, edited its questions, uploaded a real image, and confirmed every edit actually persisted; confirmed the two claims-guard 409s (question edit and delete) still fire correctly against a real claimed item from the seed data; then deleted the test item and confirmed the seed counts (17 unclaimed / 3 claimed) were untouched.
- [x] **Admin: claims review** (approve/reject)
  - `AdminClaimsPage` (`/admin/claims`, `adminOnly`): a status filter (pending/approved/rejected/all, defaulting to pending — the actionable queue), each claim as a card with a submitted-vs-correct answer table (color-coded match/mismatch), and Approve/Reject buttons on pending ones. The optional admin note is collected with a plain `window.prompt`, not a form field.
  - `src/claimStatus.js`: the status→badge-color map, extracted once `MyClaimsPage` and this page both needed it.
  - Verified end-to-end through the real running app: created a fresh item with two competing pending claims, approved one through the exact call the "Approve" button makes, and confirmed the other auto-rejected with the expected note and the item flipped to `claimed` — then cleaned up.
  - Nav/copy pass after this module, per explicit feedback: dropped the redundant "Admin:" prefix on nav links (now "Report items" / "Review claims", matching the page headers exactly), hid "My claims" for admins (they don't submit claims), and `HomePage` no longer repeats the role next to the user's name since the `Navbar` already shows it on every page.
- [ ] Admin: users list + dashboard stats (backend already supports this — `GET /admin/users`, `GET /admin/stats` — just no frontend page yet)

## Tech stack
| Layer | Choice |
|---|---|
| Runtime | Node.js 20+ (dev machine runs 24), JavaScript ES modules (`"type": "module"`) |
| API | **Express 5** (async errors reach the error handler automatically), REST JSON under `/api/v1` |
| DB | **SQL Server 2022** (local default instance, `localhost:1433`, SQL login) |
| ORM | **Prisma 7.10** (`prisma-client-js` generator + `@prisma/adapter-mssql`). Pinned to 7.x, because npm `latest` is an 8.0 RC |
| Auth | `express-session` cookie session + `bcryptjs` password hashing; roles `user` / `admin` |
| Validation | zod |
| Uploads | Multer → `server/uploads/`, one optional image per item (≤5 MB, jpg/png/webp), served at `/uploads` |
| Security | helmet, cors (client origin only). Prisma parameterizes queries |
| Frontend | React 19 + Vite 8 (dev proxy `/api` → :5000, so the cookie is same-origin), React Router, Bootstrap 5, axios |
| Tooling | ESLint 9 (flat config), Prettier, nodemon, dotenv |

## Repository layout
```
foundIt/
  CLAUDE.md
  server/
    prisma/
      schema.prisma     # all models live here
      migrations/       # generated by `npm run db:migrate`, committed
    prisma.config.js    # Prisma CLI config (schema path, DATABASE_URL)
    scripts/seed.js     # admin + sample users/items/claims; runs automatically on every server start
    src/
      app.js            # createApp(): middleware + mounts routers
      server.js         # connects the DB and listens
      env.js            # zod-validated env vars
      db.js             # the shared `prisma` client + dbStatus()
      http.js           # HttpError, notFound, errorHandler, requireLogin, requireAdmin
      routes/<feature>.js   # one Router per feature with inline handlers (auth, items, search, claims, admin)
    uploads/            # gitignored
  client/
    vite.config.js      # proxies /api and /uploads to localhost:5000
    index.html
    src/
      main.jsx           # entry point; imports Bootstrap CSS
      App.jsx             # BrowserRouter + <Routes> — the routing shell
      api.js               # shared axios instance (baseURL /api/v1)
      AuthContext.jsx      # AuthProvider + useAuth()
      components/         # shared pieces (ProtectedRoute, later: Navbar, etc.)
      pages/<Name>Page.jsx # one file per page/screen
```

### Route file pattern
```js
// src/routes/search.js — see it in full for the real thing; this is the shape
import { Router } from 'express';
import { prisma } from '../db.js';
import { HttpError, requireLogin } from '../http.js';

const router = Router();
router.use(requireLogin); // router-level middleware when EVERY route in the file needs it

router.get('/:id', async (req, res) => {
  const item = await prisma.item.findFirst({
    where: { id: Number(req.params.id), status: 'unclaimed' },
    select: { id: true, title: true /* ... */, questions: { select: { id: true, question: true } } }, // never the answer
  });
  if (!item) throw new HttpError(404, 'Item not found');
  res.json({ success: true, data: item });
});

export default router;
// app.js: app.use('/api/v1/search', search);
```
Two routers can serve the same-shaped resource (`items` vs `search`) under different paths and different access rules — that's how admin-only item management (`/items`) and user-facing browsing (`/search`) stay separate without branching on role inside one handler.

## Conventions
- Handlers are plain `async (req, res) => {}`. Throw `new HttpError(status, message)` for expected errors. `errorHandler` in `http.js` formats every error, including Prisma `P2002` (→ 409) and `P2025` (→ 404).
- Response shape: `{ success: boolean, data?: any, message?: string }`. Lists return `data: { items, page, limit, total }`.
- Validate request bodies and queries with zod inside the handler.
- The session stores only `req.session.user = { id, username, role }`. `requireLogin` checks that it exists; `requireAdmin` also checks `role === 'admin'`.
- Secrets live only in `server/.env` (gitignored). **Env vars:** `NODE_ENV`, `PORT` (5000), `DATABASE_URL`, `CLIENT_ORIGIN` (http://localhost:5173), and from module 1 `SESSION_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`. Add new ones to `src/env.js` and to this list.
- URL format: `sqlserver://localhost:1433;database=foundit;user=<login>;password=<pwd>;trustServerCertificate=true`.
- Never return `passwordHash`, and never send `SecretQuestion.answer` to non-admin users.
- Use `camelCase` for fields, PascalCase for model names, and kebab-case plural nouns for route paths (`/items`, `/claims`).

## Data models (Prisma / SQL Server)
SQL Server has no enums in Prisma, so status fields are `String` columns whose values are enforced with zod. IDs are `Int @id @default(autoincrement())`.
- **User**: username (unique), passwordHash, name, phone?, role (`user|admin`, default `user`), createdAt
- **Item**: title, category (`electronics|wallet|id-card|documents|keys|bags|jewellery|clothing|books|other`), description, locationFound, dateFound, imagePath?, status (`unclaimed|claimed`, default `unclaimed`), addedById → User (admin), createdAt, updatedAt
- **SecretQuestion**: itemId → Item (cascade delete), question, answer (plain text, so the admin can compare)
- **Claim**: itemId → Item, userId → User, ownershipDetails (free text: why it's theirs, marks, contents…), status (`pending|approved|rejected`, default `pending`), adminNote?, createdAt, reviewedAt?
- **ClaimAnswer**: claimId → Claim (cascade delete), questionId → SecretQuestion, answer

Watch out: SQL Server rejects multiple cascade paths (ClaimAnswer is reachable from Item through both Claim and SecretQuestion). Use `onDelete: NoAction` on `ClaimAnswer.question`, and delete an item's claims before the item.

## Business rules
- Only admins add, edit or delete items and their secret questions. An item needs at least one secret question.
- Normal users only see `unclaimed` items, both in search and in item details.
- A claim needs an answer for every secret question on the item, plus `ownershipDetails`. A user can have only one `pending` claim per item.
- Admins see each claim's answers next to the expected answers and decide themselves. There's no automatic scoring.
- Approving a claim sets the item to `claimed` and automatically rejects that item's other pending claims. Only a `pending` claim can be approved or rejected.
- An item with an approved claim can't be deleted or edited back to `unclaimed`.

## Seed data
`scripts/seed.js` runs automatically at the top of `server.js` on **every** server start (`npm run dev`/`npm start`) — this is what makes cloning the repo onto another machine "just work": after setting up `.env` and running the migrations, `npm run dev` alone gives you a logged-in-ready app with demo data. It's also runnable by hand (`npm run seed`) and is fully idempotent:
- The admin (`ADMIN_USERNAME`/`ADMIN_PASSWORD`) and 6 sample users (`alice`, `bob`, `carol`, `dave`, `emma`, `frank`, all with password `password123`) are **upserted** every time, so changing `.env` and restarting updates the admin's password without creating a duplicate.
- 20 sample items (2 per category, one secret question each) and 10 sample claims (5 `pending`, 3 `approved` → those items are `claimed`, 2 `rejected`) are only created **once** — the check is "does an item with our first sample title already exist?", not "is the table empty?", so it won't re-seed just because you've deleted your own test data, and it won't touch any real data you create afterward (new items, new users, new claims) on later restarts.
- If you ever want the demo set back to its original state, the simplest path is deleting the 20 sample items by hand (their claims cascade) and running `npm run seed` again — there's no destructive "reset" command, on purpose (see the working agreement above).

## Commands
```
cd server
npm run dev              # nodemon on :5000
npm run lint
npx prisma migrate dev --name <change>  # after editing schema.prisma: creates + applies a migration
npm run db:generate      # ALWAYS run this right after migrate dev — see Notes
npm run db:studio        # browse data
npm run seed              # re-run the seed by hand (it also runs automatically on every `npm run dev`)

cd client
npm run dev              # vite on :5173, proxies /api + /uploads → :5000 (server must be running)
npm run build             # production build (used here to catch compile errors — also run this as a sanity check)
npm run lint              # oxlint
```

Notes:
- npm on this machine blocks dependency install scripts (`allow-scripts`). Prisma still works, because the schema engine ships inside `@prisma/engines`. Our own `postinstall` runs `prisma generate`. Prefer pure-JS packages (e.g. `bcryptjs`, not `bcrypt`).
- Prisma refuses `migrate reset` when an AI agent runs it. Don't use it.
- `prisma migrate dev` does **not** reliably regenerate the client in this setup (adapter + `prisma.config.js`). Chaining `"db:migrate": "prisma migrate dev && prisma generate"` to fix this (tried in module 2) turned out to break `-- --name x` argument forwarding (see module 4's note) and got reverted. So: **always run `npx prisma migrate dev --name <change>` and `npm run db:generate` as two separate commands.** If a route ever throws "Cannot read properties of undefined (reading '<model>')" right after a schema change, that's this — run `npm run db:generate` and restart the server.
- When testing by hand: check for and kill stray `node src/server.js` processes first (`Get-CimInstance Win32_Process -Filter "Name='node.exe'"` filtered on `CommandLine -like '*server.js*'`) — Windows can let a new process bind a port a stale one already holds, silently sending requests to old code.
- `Stop`ping a backgrounded shell (e.g. a harness's task-stop) kills that shell but can leave its child process (an `npm`/`prisma` subprocess) running and still holding a DB connection. If a `prisma migrate dev` ever hangs, check `sys.dm_exec_requests`/`sys.dm_exec_sessions` for a session blocked on `LCK_M_X` before assuming it's just slow — find and `taskkill //F //T` the orphaned process tree (or `KILL <session_id>` in SQL Server directly), not just the shell.
- Both dev servers (`server` and `client`) share one persistent shell in this environment. Running two commands that each start with a bare `cd <dir> && ...` **in parallel** races on that shared cwd — one run actually started `npm run dev` inside `server/` a second time instead of starting the client. Always wrap it as `(cd <dir> && cmd) &`, with the `cd` *inside* the subshell, and when starting both servers, do it as two separate turns, not one parallel batch.

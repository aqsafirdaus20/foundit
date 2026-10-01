# FoundIt — Setup Guide

Everything needed to get this running on a brand-new machine, from installing the tools to seeing the app in your browser. For the architecture, API routes and conventions, see [CLAUDE.md](CLAUDE.md) — this file is just "how do I start it."

---

## 0. Install the prerequisites

Skip any tool you already have — just run the **check** command first.

### Git

Check:
```
git --version
```
If that fails:
- **Windows**: `winget install --id Git.Git -e` (or download from [git-scm.com](https://git-scm.com/downloads))
- **macOS**: `brew install git` (or it prompts to install Xcode Command Line Tools)
- **Linux (Debian/Ubuntu)**: `sudo apt update && sudo apt install git`

### Node.js 20 or newer (npm comes with it)

Check:
```
node -v
npm -v
```
You need Node **v20.x or higher**. If it's missing or too old:
- **Windows**: `winget install OpenJS.NodeJS.LTS` (or download the installer from [nodejs.org](https://nodejs.org))
- **macOS**: `brew install node`
- **Linux (Debian/Ubuntu)**: use [nvm](https://github.com/nvm-sh/nvm) rather than the distro's package (it's usually outdated):
  ```
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  nvm install 20
  ```

Re-run `node -v` afterward to confirm.

### SQL Server

FoundIt needs a running SQL Server instance reachable at `localhost:1433`, with **TCP/IP enabled** and **mixed-mode authentication** (a SQL login + password, not just Windows auth).

**Option A — Windows, a native instance**
1. Download **SQL Server Developer Edition** (free): https://www.microsoft.com/sql-server/sql-server-downloads
2. During install, choose "Mixed Mode" authentication and set an `sa` password (or create a login afterward in SSMS).
3. Open **SQL Server Configuration Manager** → *SQL Server Network Configuration* → *Protocols* → enable **TCP/IP** → restart the SQL Server service.
4. Check it's actually listening:
   ```
   Test-NetConnection -ComputerName localhost -Port 1433
   ```
   (PowerShell; `TcpTestSucceeded : True` means you're good.)

**Option B — macOS / Linux (or Windows, if you'd rather not install SQL Server natively) — via Docker**
```
docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=YourStrong!Passw0rd" \
  -p 1433:1433 --name foundit-sql -d mcr.microsoft.com/mssql/server:2022-latest
```
Check it's up:
```
docker ps
```
Your `DATABASE_URL` later will use `user=sa;password=YourStrong!Passw0rd` (or whatever you set).

**A SQL client** (to run the one `CREATE DATABASE` command in step 2, and handy for poking at data later) — pick one:
- [Azure Data Studio](https://learn.microsoft.com/sql/azure-data-studio/download-azure-data-studio) (free, cross-platform GUI)
- SSMS (Windows only, ships with the Developer Edition installer above)
- `sqlcmd` (command line; installed alongside SQL Server on Windows, or [installable separately](https://learn.microsoft.com/sql/tools/sqlcmd/sqlcmd-utility) on macOS/Linux)

---

## 1. Clone the repo

```
git clone <the repo URL>
cd foundIt
```

## 2. Create the database

Prisma will create all the **tables**, but not the database itself. Using whichever SQL client you picked above, run:

```sql
CREATE DATABASE foundit;
```

## 3. Backend setup

```
cd server
npm install
```

Create a file named `server/.env` (this is gitignored — never commit it) with:

```
NODE_ENV=development
PORT=5000
DATABASE_URL="sqlserver://localhost:1433;database=foundit;user=<your-sql-login>;password=<your-sql-password>;trustServerCertificate=true"
CLIENT_ORIGIN=http://localhost:5173
SESSION_SECRET=<any long random string>
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<pick a password for the admin account>
```
Fill in `<your-sql-login>` / `<your-sql-password>` with the login from step 0 (e.g. `sa` and the password you set, for the Docker option).

Apply the database schema (creates tables — inserts no data yet):
```
npx prisma migrate deploy
npm run db:generate
```

Start the backend:
```
npm run dev
```
You should see:
```
SQL Server connected
Admin ready: admin
Sample users ready: alice, bob, carol, dave, emma, frank (password: password123)
Seeded 20 sample items and 10 sample claims.
FoundIt API listening on http://localhost:5000/api/v1
```
That last block is the automatic seeding — see step 5. Leave this terminal running.

(`npm run dev` auto-restarts on file changes, via nodemon. `npm start` runs the same server without that, if you ever want it.)

## 4. Frontend setup

Open a **second terminal** (leave the backend running in the first one):

```
cd client
npm install
npm run dev
```
You should see Vite print something like:
```
VITE v8.3.1  ready in 260 ms
➜  Local:   http://localhost:5173/
```

Open **http://localhost:5173** in your browser. The frontend proxies its API calls to the backend on port 5000 (see `client/vite.config.js`), so both terminals need to stay running.

## 5. Log in and look around (seed data)

Seeding is **automatic** — it happens every time the backend starts, and it's safe to run more than once: the admin and sample users are always kept up to date, but the demo items/claims are only ever created the first time. You don't need to run anything by hand for this, but if you ever want to force it:
```
cd server
npm run seed
```

**Accounts you can log in with immediately:**

| Username | Password | Role |
|---|---|---|
| `admin` | whatever you set as `ADMIN_PASSWORD` | admin |
| `alice`, `bob`, `carol`, `dave`, `emma`, `frank` | `password123` | user |

Plus **20 sample lost-and-found items** (2 per category) and **10 sample claims** already in a mix of states — some pending (for the admin to review), some approved (so a few items already show as "claimed"), some rejected — so both the user side (search → claim → "my claims") and the admin side (report items → review claims) have real data to click through immediately.

To reset the demo set back to its original state, delete the sample items yourself (in the admin UI or the database) and run `npm run seed` again — there's no one-command destructive reset, on purpose.

---

## Troubleshooting

- **`node -v` / `git --version` says "command not found"** — the install didn't complete, or you need to open a new terminal so your `PATH` picks it up.
- **"Failed to connect to SQL Server"** — double-check `DATABASE_URL` in `server/.env` (login, password), that the `foundit` database exists (step 2), that SQL Server is actually running (`docker ps`, or the Windows service), and that TCP/IP is enabled.
- **Port 5000 or 5173 already in use** — something else is using it; stop that process, or change `PORT` in `server/.env` (and update the proxy target in `client/vite.config.js` to match).
- **A route errors with "Cannot read properties of undefined (reading '&lt;model&gt;')"** — the Prisma client is out of sync with the schema; run `npm run db:generate` in `server/` and restart the backend.

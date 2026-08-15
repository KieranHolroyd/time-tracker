# Hourmark

Simple job time tracking: pick a project, click **Add hour**, optionally add notes later.

Built with **SvelteKit** and **SQLite via Turso** (`@libsql/client`), with sign-in
from [Holroyd ID](../auth).

## Quick start

```bash
npm install
npm run dev
```

By default it uses a local SQLite file (`file:local.db`). No Turso account needed to try it.

Sign-in, though, always talks to a real provider — see [Sign-in](#sign-in) for what
local development needs.

## Sign-in

Hourmark has no user table and no passwords. It is an OIDC client of Holroyd ID:
it registers itself on boot, sends people through an authorization-code flow with
PKCE, and reads access out of the resulting token.

Nothing needs configuring on a `holroydnet.uk` hostname. Registration on a trusted
domain is authorised by *where the app lives*, so there is no client id, no secret
and nothing to rotate — set `ORIGIN` and that is the whole setup. Every other knob
in `.env.example` is for the cases that fall outside it.

### Profiles are ledgers, accounts own them

A profile is still what hours hang off; a Holroyd ID account is who you are.
The first time somebody signs in:

- If profiles exist that no account has claimed — the ones from before sign-in —
  they are offered a **claim screen** to pick one up or start fresh. Nothing is
  matched by name, because a wrong guess would hand over somebody else's hours.
- If there is nothing to choose between, a profile is created from their account
  name and they go straight in.

A claim is permanent, one account to one profile, and only the owner can rename or
recolour it.

### Access

Hourmark declares two permissions and publishes them at registration:

| Permission | Covers |
| --- | --- |
| `hours:read` | The ledger, the stats and the export |
| `hours:write` | Logging and editing hours, projects and settings |

Roles (`viewer`, `editor`, `admin`) bundle them, and every check in the app is on a
permission, never a role. **Registering does not grant anyone access** — an admin
has to grant it, and until then sign-in ends on the provider's `/denied` page. An
account granted a role without `hours:read` lands on `/no-access` here instead.

Revoking takes effect within ten minutes: claims are re-read whenever the
ten-minute access token is refreshed, not cached for the life of the session.

### Somewhere other than holroydnet.uk

Two cases need more than `ORIGIN`, both because the domain check is what
authorises tokenless registration:

- **Local development.** `localhost` is not a trusted domain. Easiest is to give
  the dev app a hostname on one (`ORIGIN=http://hourmark.localhost.holroydnet.uk:5173`);
  otherwise widen `TRUSTED_DOMAINS` on your provider, or set `APP_REGISTRATION_TOKEN`.
- **A bare IP, e.g. `http://192.168.1.50:3000`.** Same problem. Either put the app
  behind a hostname on the trusted domain, or register with `APP_REGISTRATION_TOKEN`
  and put the returned `AUTH_CLIENT_ID` / `AUTH_CLIENT_SECRET` in the environment.

`redirect_uris` is replaced wholesale on every registration, so two environments
sharing the slug will fight over it. List them all in `AUTH_EXTRA_REDIRECT_URIS`, or
give each environment its own slug.

The full contract is in the provider's `docs/integrating.md`.

## Docker / Unraid

Production image uses `@sveltejs/adapter-node`, listens on `3000`, and stores SQLite at `/data/hourmark.db`.

### Unraid (recommended)

From the project folder on Unraid (or any host that can build the image):

```bash
export ORIGIN=http://YOUR_UNRAID_IP:3000
docker compose -f docker-compose.yml -f docker-compose.unraid.yml up -d --build
```

That bind-mounts `/mnt/user/appdata/hourmark` → `/data`.

### Plain compose

```bash
export ORIGIN=http://YOUR_UNRAID_IP:3000
docker compose up -d --build
```

### Unraid Docker UI

| Setting | Value |
| --- | --- |
| Repository | `ghcr.io/<your-user>/time-tracker:latest` or a locally built `hourmark:latest` |
| **Container port** | **`3000`** (not 5173 — that is dev only) |
| **Host port** | e.g. `3000` → map **Host `3000` : Container `3000`** |
| Path | Host `/mnt/user/appdata/hourmark` → Container `/data` |
| `HOST` | `0.0.0.0` (default) |
| `PORT` | `3000` (default) |
| `ORIGIN` | `http://YOUR_UNRAID_IP:3000` (must match the browser URL, including port). A bare IP is not a trusted domain — see [Sign-in](#sign-in) |
| `TURSO_DATABASE_URL` | `file:/data/hourmark.db` (default) or your remote Turso URL |
| `TURSO_AUTH_TOKEN` | only if using remote Turso |
| **Command** | leave empty (default: `node build`) — do **not** use `npm run dev` |
| Restart | Unless-stopped |

Open **`http://YOUR_UNRAID_IP:3000`** in the browser.

### Unraid troubleshooting

**No logs in the UI** — Unraid often hides output until the container stays running. From the Unraid terminal:

```bash
docker logs hourmark
docker logs -f hourmark
```

If the container restarts in a loop, logs usually show the error (missing build, wrong command, etc.).

**Port not reachable** — confirm the template maps container port **3000**, not 5173. The production image does not run Vite.

**Forms fail / CSRF errors** — `ORIGIN` must exactly match what you type in the browser (scheme, IP/hostname, and port).

## Connect Turso

1. Create a database and token with the [Turso CLI](https://docs.turso.tech/cli/installation):

```bash
turso db create hourmark
turso db show hourmark --url
turso db tokens create hourmark
```

2. Set env vars (local `.env` or Docker):

```env
TURSO_DATABASE_URL=libsql://your-db-name-your-org.turso.io
TURSO_AUTH_TOKEN=your-token-here
```

3. Restart the app. Tables are created automatically on first request.

## Flow

1. Sign in with Holroyd ID, and claim or create a profile the first time
2. Create a project (or choose an existing one)
3. Click the big **Add hour** button — logs 1 hour for today
4. Open **More options** only if you need a different date, custom hours, or a comment up front
5. Add or edit notes on any entry in the recent list

# Hourmark

Simple job time tracking: pick a project, click **Add hour**, optionally add notes later.

Built with **SvelteKit** and **SQLite via Turso** (`@libsql/client`).

## Quick start

```bash
npm install
npm run dev
```

By default it uses a local SQLite file (`file:local.db`). No Turso account needed to try it.

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
| `ORIGIN` | `http://YOUR_UNRAID_IP:3000` (must match the browser URL, including port) |
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

1. Create a project (or choose an existing one)
2. Click the big **Add hour** button — logs 1 hour for today
3. Open **More options** only if you need a different date, custom hours, or a comment up front
4. Add or edit notes on any entry in the recent list

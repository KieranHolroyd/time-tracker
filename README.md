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
| Repository | `hourmark:latest` (build locally or from your registry) |
| Port | Host `3000` → Container `3000` |
| Path | Host `/mnt/user/appdata/hourmark` → Container `/data` |
| `ORIGIN` | `http://YOUR_UNRAID_IP:3000` (or your reverse-proxy URL) |
| `TURSO_DATABASE_URL` | `file:/data/hourmark.db` (default) |
| `TURSO_AUTH_TOKEN` | only if using remote Turso |
| Restart | Unless-stopped |

`ORIGIN` must match the URL in the browser or form submissions fail CSRF checks.

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

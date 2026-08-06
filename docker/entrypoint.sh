#!/bin/sh
set -eu

PORT="${PORT:-3000}"
HOST="${HOST:-0.0.0.0}"

echo "=== Hourmark ==="
echo "node $(node --version)"
echo "listen: http://${HOST}:${PORT}"
echo "data:   ${TURSO_DATABASE_URL:-file:/data/hourmark.db}"

mkdir -p /data

if [ ! -f /app/build/index.js ]; then
	echo "ERROR: /app/build/index.js is missing. Rebuild the image (npm run build failed during docker build)." >&2
	exit 1
fi

if [ -z "${ORIGIN:-}" ]; then
	echo "WARNING: ORIGIN is unset. Set it to the URL you open in the browser (e.g. http://192.168.1.50:${PORT})." >&2
else
	echo "origin: ${ORIGIN}"
fi

if [ "${PORT}" = "5173" ]; then
	echo "WARNING: PORT=5173 is the Vite dev server. Production uses PORT=3000." >&2
fi

echo "Starting…"
exec "$@"

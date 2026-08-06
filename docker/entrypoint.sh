#!/bin/sh
set -eu

mkdir -p /data

if [ -z "${ORIGIN:-}" ]; then
	echo "warning: ORIGIN is unset. Set it to the URL you open in the browser (e.g. http://192.168.1.50:3000) or form actions may fail." >&2
fi

exec "$@"

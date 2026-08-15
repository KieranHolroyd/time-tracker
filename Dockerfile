FROM node:22-bookworm-slim AS deps
WORKDIR /app

ENV NPM_CONFIG_FETCH_RETRIES=5 \
	NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
	NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000 \
	NPM_CONFIG_AUDIT=false \
	NPM_CONFIG_FUND=false

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
	npm ci --no-audit --no-fund

FROM deps AS build
COPY . .
RUN npm run build \
	&& npm prune --omit=dev

FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
	HOST=0.0.0.0 \
	PORT=3000 \
	TURSO_DATABASE_URL=file:/data/hourmark.db

# Unraid appdata mounts are simplest when the process can write the volume as-is.
RUN mkdir -p /data

COPY --from=build /app/build ./build
COPY --from=build /app/otel ./otel
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
	CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/entrypoint.sh"]

# --import loads the OpenTelemetry bootstrap ahead of the server so the
# auto-instrumentations can patch http and the libsql client before SvelteKit
# imports them. It is inert unless OTEL_EXPORTER_OTLP_ENDPOINT is set, so this
# image still runs identically with no collector in front of it.
CMD ["node", "--import", "./otel/instrumentation.mjs", "build"]

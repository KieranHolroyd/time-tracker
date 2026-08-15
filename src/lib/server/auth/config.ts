import { dev } from '$app/environment';
import { env as dynamicEnv } from '$env/dynamic/private';
import { APP_SLUG } from '$lib/auth/claims';

/**
 * Reads a variable, preferring SvelteKit's dynamic env and falling back to
 * `process.env`.
 *
 * Every export below is evaluated at import time, and `$env/dynamic/private`
 * is not populated until SvelteKit runs `set_private_env` inside `Server.init`.
 * Normally this module is not reached until after that, so the ordering holds
 * by luck — and an ESM loader hook breaks the luck. OpenTelemetry's `--import`
 * bootstrap registers one, which pulls the server module graph in early and
 * evaluates this file while the dynamic env is still empty. That would throw on
 * the ORIGIN check below, and silently blank the client credentials above it.
 * `process.env` is populated before any of that under adapter-node.
 */
function read(name: string): string | undefined {
	return dynamicEnv[name] || process.env[name];
}

export { APP_SLUG };

/** Trailing slashes make the issuer and redirect URIs stop matching. */
function trimUrl(value: string | undefined): string | undefined {
	const trimmed = value?.trim().replace(/\/+$/, '');
	return trimmed || undefined;
}

/** The provider. Its discovery document supplies every endpoint we use. */
export const AUTH_ISSUER = trimUrl(read('AUTH_ISSUER')) ?? 'https://auth.holroydnet.uk';

/**
 * Our own public origin. Taken from configuration rather than the incoming
 * request, because a redirect URI derived from a spoofable Host header is a way
 * to have codes delivered somewhere else. `ORIGIN` is already set for adapter-node's
 * CSRF checks, so production usually needs nothing new.
 */
export const APP_ORIGIN =
	trimUrl(read('APP_ORIGIN')) ?? trimUrl(read('ORIGIN')) ?? (dev ? 'http://localhost:5173' : undefined);

export const CALLBACK_PATH = '/auth/callback';

export function redirectUri(): string {
	if (!APP_ORIGIN) {
		throw new Error(
			'ORIGIN (or APP_ORIGIN) must be set so the OIDC redirect URI can be built — see .env.example'
		);
	}
	return `${APP_ORIGIN}${CALLBACK_PATH}`;
}

/**
 * Registration replaces `redirect_uris` wholesale, so an app re-registering from
 * two environments would otherwise fight over the list. Anything in here is sent
 * alongside our own callback.
 */
export const EXTRA_REDIRECT_URIS = (read('AUTH_EXTRA_REDIRECT_URIS') ?? '')
	.split(',')
	.map((uri) => uri.trim())
	.filter(Boolean);

/**
 * Only needed off a trusted domain — with it we become a confidential client.
 * Prefer leaving it unset: domain registration gives a public client with
 * nothing to store and nothing to rotate.
 */
export const REGISTRATION_TOKEN = read('APP_REGISTRATION_TOKEN')?.trim() || undefined;

/** Registration is idempotent by slug, so re-running it on boot is the point. */
export const REGISTER_ON_BOOT = (read('AUTH_REGISTER_ON_BOOT') ?? 'true').toLowerCase() !== 'false';

/**
 * A public client's id is simply the slug, so the default needs no configuration.
 * Only a confidential registration (one made with a registration token) hands
 * back a generated id and a secret, and those two have to be put in the environment.
 */
export const CLIENT_ID = read('AUTH_CLIENT_ID')?.trim() || APP_SLUG;
export const CLIENT_SECRET = read('AUTH_CLIENT_SECRET')?.trim() || undefined;

export const SESSION_COOKIE = 'hourmark_session';
export const FLOW_COOKIE = 'hourmark_auth_flow';

/** Matches the provider's refresh-token lifetime; nothing outlives that. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Refresh a little early rather than racing the 10-minute access token expiry. */
export const REFRESH_SKEW_MS = 60 * 1000;

export const SCOPES = ['openid', 'profile', 'email', 'offline_access', 'permissions'] as const;

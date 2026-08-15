/**
 * A small OIDC relying-party client for Holroyd ID.
 *
 * Hand-rolled rather than pulled from a library because the flow we need is one
 * authorization-code exchange with PKCE: everything here is standard, and Node 22's
 * WebCrypto covers the only hard part (RS256 verification). No dependencies, so
 * nothing to keep patched in an app that stores people's timesheets.
 */
import {
	AUTH_ISSUER,
	CLIENT_ID,
	CLIENT_SECRET,
	SCOPES,
	redirectUri
} from './config';
import type { Claims } from '$lib/auth/claims';

type Discovery = {
	issuer: string;
	authorization_endpoint: string;
	token_endpoint: string;
	userinfo_endpoint: string;
	jwks_uri: string;
	end_session_endpoint?: string;
};

export type TokenSet = {
	claims: Claims;
	accessToken: string;
	refreshToken: string | null;
	/** Epoch ms at which the access token stops being usable. */
	accessExpiresAt: number;
};

const DISCOVERY_TTL_MS = 10 * 60 * 1000;
const JWKS_TTL_MS = 10 * 60 * 1000;

let discovery: { at: number; value: Discovery } | null = null;
let jwks: { at: number; keys: JsonWebKey[] } | null = null;

/**
 * The issuer is the bare origin, not `…/api/auth`, and endpoint paths are not
 * derivable from it — so always go through discovery rather than concatenating.
 */
export async function discover(): Promise<Discovery> {
	if (discovery && Date.now() - discovery.at < DISCOVERY_TTL_MS) return discovery.value;

	const url = `${AUTH_ISSUER}/.well-known/openid-configuration`;
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`OIDC discovery failed: ${response.status} ${response.statusText} (${url})`);
	}

	const value = (await response.json()) as Discovery;
	if (value.issuer !== AUTH_ISSUER) {
		throw new Error(`OIDC issuer mismatch: expected ${AUTH_ISSUER}, got ${value.issuer}`);
	}

	discovery = { at: Date.now(), value };
	return value;
}

function base64url(bytes: Uint8Array): string {
	return Buffer.from(bytes).toString('base64url');
}

function randomToken(bytes = 32): string {
	return base64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

async function sha256(input: string): Promise<Uint8Array> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
	return new Uint8Array(digest);
}

export type PendingFlow = {
	state: string;
	nonce: string;
	verifier: string;
};

export function startFlow(): PendingFlow {
	return { state: randomToken(), nonce: randomToken(), verifier: randomToken() };
}

/** PKCE is mandatory for every client the provider registers, public or not. */
export async function authorizeUrl(flow: PendingFlow): Promise<string> {
	const { authorization_endpoint } = await discover();
	const challenge = base64url(await sha256(flow.verifier));

	const url = new URL(authorization_endpoint);
	url.searchParams.set('response_type', 'code');
	url.searchParams.set('client_id', CLIENT_ID);
	url.searchParams.set('redirect_uri', redirectUri());
	url.searchParams.set('scope', SCOPES.join(' '));
	url.searchParams.set('state', flow.state);
	url.searchParams.set('nonce', flow.nonce);
	url.searchParams.set('code_challenge', challenge);
	url.searchParams.set('code_challenge_method', 'S256');
	return url.toString();
}

/** Public clients put the id in the body; confidential ones use HTTP Basic. */
function clientAuth(body: URLSearchParams): HeadersInit {
	if (!CLIENT_SECRET) {
		body.set('client_id', CLIENT_ID);
		return { 'content-type': 'application/x-www-form-urlencoded' };
	}

	const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
	return {
		'content-type': 'application/x-www-form-urlencoded',
		authorization: `Basic ${basic}`
	};
}

type TokenResponse = {
	access_token: string;
	refresh_token?: string;
	id_token?: string;
	expires_in?: number;
	error?: string;
	error_description?: string;
};

async function postToken(body: URLSearchParams): Promise<TokenResponse> {
	const { token_endpoint } = await discover();
	const headers = clientAuth(body);

	const response = await fetch(token_endpoint, { method: 'POST', headers, body });
	const payload = (await response.json().catch(() => ({}))) as TokenResponse;

	if (!response.ok) {
		const detail = payload.error_description || payload.error || response.statusText;
		throw new Error(`Token request failed: ${detail}`);
	}

	return payload;
}

export async function exchangeCode(code: string, flow: PendingFlow): Promise<TokenSet> {
	const body = new URLSearchParams({
		grant_type: 'authorization_code',
		code,
		redirect_uri: redirectUri(),
		code_verifier: flow.verifier
	});

	const tokens = await postToken(body);
	if (!tokens.id_token) throw new Error('Token response carried no id_token');

	const claims = await verifyIdToken(tokens.id_token, flow.nonce);
	return toTokenSet(tokens, claims, null);
}

/**
 * Claims are a snapshot taken when the token was minted, so a refresh is also
 * how access changes reach us. Revocation therefore takes effect within the
 * access-token lifetime rather than lasting our whole session.
 */
export async function refreshTokens(refreshToken: string): Promise<TokenSet> {
	const tokens = await postToken(
		new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken })
	);

	// The nonce belongs to the original authorize request; a refreshed id_token
	// carries none, so verification checks everything else.
	const claims = tokens.id_token
		? await verifyIdToken(tokens.id_token, null)
		: await fetchUserInfo(tokens.access_token);

	return toTokenSet(tokens, claims, refreshToken);
}

function toTokenSet(
	tokens: TokenResponse,
	claims: Claims,
	previousRefreshToken: string | null
): TokenSet {
	const lifetime = (tokens.expires_in ?? 600) * 1000;
	return {
		claims,
		accessToken: tokens.access_token,
		refreshToken: tokens.refresh_token ?? previousRefreshToken,
		accessExpiresAt: Date.now() + lifetime
	};
}

export async function fetchUserInfo(accessToken: string): Promise<Claims> {
	const { userinfo_endpoint } = await discover();
	const response = await fetch(userinfo_endpoint, {
		headers: { authorization: `Bearer ${accessToken}` }
	});

	if (!response.ok) {
		throw new Error(`UserInfo request failed: ${response.status} ${response.statusText}`);
	}

	return (await response.json()) as Claims;
}

async function keyFor(kid: string | undefined): Promise<CryptoKey> {
	const fresh = !jwks || Date.now() - jwks.at > JWKS_TTL_MS;
	if (fresh) await loadJwks();

	let jwk = pickKey(kid);
	if (!jwk && !fresh) {
		// An unknown kid is what key rotation looks like; refetch once before failing.
		await loadJwks();
		jwk = pickKey(kid);
	}

	if (!jwk) throw new Error(`No JWKS key matches kid ${kid ?? '(none)'}`);

	return crypto.subtle.importKey(
		'jwk',
		jwk,
		{ name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
		false,
		['verify']
	);
}

function pickKey(kid: string | undefined): JsonWebKey | undefined {
	const keys = jwks?.keys ?? [];
	if (kid) return keys.find((key) => (key as { kid?: string }).kid === kid);
	return keys.length === 1 ? keys[0] : undefined;
}

async function loadJwks(): Promise<void> {
	const { jwks_uri } = await discover();
	const response = await fetch(jwks_uri);
	if (!response.ok) {
		throw new Error(`JWKS fetch failed: ${response.status} ${response.statusText}`);
	}

	const payload = (await response.json()) as { keys?: JsonWebKey[] };
	jwks = { at: Date.now(), keys: payload.keys ?? [] };
}

/**
 * Signature, issuer, audience, expiry and nonce — an id_token that fails any of
 * them is a token minted for somebody else, so all five are hard failures.
 */
export async function verifyIdToken(idToken: string, nonce: string | null): Promise<Claims> {
	const parts = idToken.split('.');
	if (parts.length !== 3) throw new Error('Malformed id_token');

	const [headerPart, payloadPart, signaturePart] = parts;
	const header = JSON.parse(Buffer.from(headerPart, 'base64url').toString()) as {
		alg?: string;
		kid?: string;
	};

	if (header.alg !== 'RS256') throw new Error(`Unexpected id_token algorithm ${header.alg}`);

	const key = await keyFor(header.kid);
	const valid = await crypto.subtle.verify(
		'RSASSA-PKCS1-v1_5',
		key,
		Buffer.from(signaturePart, 'base64url'),
		new TextEncoder().encode(`${headerPart}.${payloadPart}`)
	);
	if (!valid) throw new Error('id_token signature is not valid');

	const claims = JSON.parse(Buffer.from(payloadPart, 'base64url').toString()) as Claims & {
		iss?: string;
		aud?: string | string[];
		exp?: number;
		nonce?: string;
	};

	if (claims.iss !== AUTH_ISSUER) throw new Error(`id_token issuer ${claims.iss} is not expected`);

	const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
	if (!audiences.includes(CLIENT_ID)) throw new Error('id_token was not issued for this client');

	if (typeof claims.exp !== 'number' || claims.exp * 1000 <= Date.now()) {
		throw new Error('id_token has expired');
	}

	if (nonce !== null && claims.nonce !== nonce) throw new Error('id_token nonce does not match');
	if (!claims.sub) throw new Error('id_token carries no subject');

	return claims;
}

export async function hashToken(token: string): Promise<string> {
	return Buffer.from(await sha256(token)).toString('hex');
}

export { randomToken };

/**
 * Server-side sessions, kept in the app's own SQLite database.
 *
 * The cookie holds nothing but an opaque id; the tokens and claims live in a row
 * we can delete. That is what makes sign-out real, and it is where the refresh
 * happens — claims are re-read from the provider rather than cached for the
 * length of a browser session.
 */
import type { Cookies } from '@sveltejs/kit';
import { toSessionUser, type Claims, type SessionUser } from '$lib/auth/claims';
import { ensureSchema } from '../db';
import { REFRESH_SKEW_MS, SESSION_COOKIE, SESSION_TTL_MS } from './config';
import { hashToken, randomToken, refreshTokens, type TokenSet } from './oidc';

export type Session = {
	subject: string;
	claims: Claims;
	user: SessionUser;
	accessToken: string;
	expiresAt: number;
};

type SessionRow = {
	id: string;
	subject: string;
	claims: string;
	access_token: string;
	refresh_token: string | null;
	access_expires_at: number;
	expires_at: number;
};

function cookieOptions(maxAge: number) {
	return { path: '/', httpOnly: true, sameSite: 'lax', maxAge } as const;
}

export async function createSession(cookies: Cookies, tokens: TokenSet): Promise<Session> {
	const db = await ensureSchema();
	const token = randomToken();
	const expiresAt = Date.now() + SESSION_TTL_MS;

	await db.execute({
		sql: `INSERT INTO auth_sessions
			(id, subject, claims, access_token, refresh_token, access_expires_at, expires_at)
			VALUES (?, ?, ?, ?, ?, ?, ?)`,
		args: [
			await hashToken(token),
			tokens.claims.sub,
			JSON.stringify(tokens.claims),
			tokens.accessToken,
			tokens.refreshToken,
			tokens.accessExpiresAt,
			expiresAt
		]
	});

	cookies.set(SESSION_COOKIE, token, cookieOptions(Math.floor(SESSION_TTL_MS / 1000)));
	void pruneExpired();

	return {
		subject: tokens.claims.sub,
		claims: tokens.claims,
		user: toSessionUser(tokens.claims),
		accessToken: tokens.accessToken,
		expiresAt
	};
}

export async function readSession(cookies: Cookies): Promise<Session | null> {
	const token = cookies.get(SESSION_COOKIE);
	if (!token) return null;

	const db = await ensureSchema();
	const id = await hashToken(token);
	const result = await db.execute({
		sql: `SELECT id, subject, claims, access_token, refresh_token, access_expires_at, expires_at
			FROM auth_sessions WHERE id = ?`,
		args: [id]
	});

	if (result.rows.length === 0) {
		cookies.delete(SESSION_COOKIE, { path: '/' });
		return null;
	}

	const row = result.rows[0] as unknown as SessionRow;

	if (Number(row.expires_at) <= Date.now()) {
		await destroySession(cookies);
		return null;
	}

	const fresh = await ensureFreshTokens(row);
	if (!fresh) {
		// Refresh was refused: the grant is gone, or the provider revoked us.
		await destroySession(cookies);
		return null;
	}

	return {
		subject: row.subject,
		claims: fresh.claims,
		user: toSessionUser(fresh.claims),
		accessToken: fresh.accessToken,
		expiresAt: Number(row.expires_at)
	};
}

/**
 * Access tokens last ten minutes. Refreshing re-reads the claims, which is the
 * only reason a revoked grant ever stops working inside a live session.
 */
async function ensureFreshTokens(
	row: SessionRow
): Promise<{ claims: Claims; accessToken: string } | null> {
	const stillValid = Number(row.access_expires_at) - REFRESH_SKEW_MS > Date.now();
	if (stillValid) {
		return { claims: JSON.parse(row.claims) as Claims, accessToken: row.access_token };
	}

	if (!row.refresh_token) return null;

	let tokens: TokenSet;
	try {
		tokens = await refreshTokens(row.refresh_token);
	} catch (error) {
		console.warn('[auth] refresh failed, ending session:', error);
		return null;
	}

	const db = await ensureSchema();
	await db.execute({
		sql: `UPDATE auth_sessions
			SET claims = ?, access_token = ?, refresh_token = ?, access_expires_at = ?
			WHERE id = ?`,
		args: [
			JSON.stringify(tokens.claims),
			tokens.accessToken,
			tokens.refreshToken,
			tokens.accessExpiresAt,
			row.id
		]
	});

	return { claims: tokens.claims, accessToken: tokens.accessToken };
}

export async function destroySession(cookies: Cookies): Promise<void> {
	const token = cookies.get(SESSION_COOKIE);
	cookies.delete(SESSION_COOKIE, { path: '/' });
	if (!token) return;

	const db = await ensureSchema();
	await db.execute({ sql: 'DELETE FROM auth_sessions WHERE id = ?', args: [await hashToken(token)] });
}

async function pruneExpired(): Promise<void> {
	try {
		const db = await ensureSchema();
		await db.execute({
			sql: 'DELETE FROM auth_sessions WHERE expires_at <= ?',
			args: [Date.now()]
		});
	} catch (error) {
		console.warn('[auth] could not prune expired sessions:', error);
	}
}

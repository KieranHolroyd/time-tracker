/**
 * Claim shapes handed out by Holroyd ID, and the checks the app enforces on them.
 *
 * Safe to import on the client: it is pure reading of an already-verified token,
 * with no secrets and no provider calls. See holroydnet/auth `docs/integrating.md`.
 */

/**
 * Opaque constant, not a URL anything fetches. It must match the provider byte
 * for byte — a client looking for the wrong key sees a user with no permissions,
 * which surfaces as "access denied" rather than as an error.
 */
export const CLAIM_NAMESPACE = 'https://holroydnet.uk';

/** Our slug at the provider. Permanent in practice: grants and claims key off it. */
export const APP_SLUG = 'hourmark';

/** The catalogue we publish at registration, next to the checks that enforce it. */
export const PERMISSIONS = {
	read: 'hours:read',
	write: 'hours:write'
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export type Claims = {
	sub: string;
	name?: string;
	preferred_username?: string;
	email?: string;
	picture?: string;
	[key: string]: unknown;
};

/** What the app hands to the browser: identity plus the answer on access. */
export type SessionUser = {
	subject: string;
	name: string;
	username: string | null;
	email: string | null;
	picture: string | null;
	role: string | null;
	permissions: string[];
};

/**
 * The permission and role maps carry every application the user can reach, not
 * just ours — the provider's claim hooks receive the client's metadata but not
 * its id, so there is nothing to narrow by. Read our own slug; never iterate.
 */
export function permissionsFor(claims: Claims): string[] {
	const map = claims[`${CLAIM_NAMESPACE}/permissions`] as
		| Record<string, string[]>
		| undefined;
	const mine = map?.[APP_SLUG];
	return Array.isArray(mine) ? mine : [];
}

export function roleFor(claims: Claims): string | null {
	const map = claims[`${CLAIM_NAMESPACE}/roles`] as Record<string, string> | undefined;
	return map?.[APP_SLUG] ?? null;
}

/** Enforce on permissions, not roles: roles are how access is handed out. */
export function can(user: Pick<SessionUser, 'permissions'>, permission: Permission): boolean {
	return user.permissions.includes(permission);
}

export function displayName(claims: Claims): string {
	const candidate = claims.name?.trim() || claims.preferred_username?.trim();
	if (candidate) return candidate;
	const local = claims.email?.split('@')[0]?.trim();
	return local || 'Me';
}

export function toSessionUser(claims: Claims): SessionUser {
	return {
		subject: claims.sub,
		name: displayName(claims),
		username: claims.preferred_username?.trim() || null,
		email: claims.email?.trim() || null,
		picture: typeof claims.picture === 'string' ? claims.picture : null,
		role: roleFor(claims),
		permissions: permissionsFor(claims)
	};
}

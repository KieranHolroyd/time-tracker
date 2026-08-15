import { PROFILE_COLORS } from '$lib/constants';
import type { Profile } from '$lib/types';
import { ensureSchema } from './db';

const SELECT_PROFILE = 'SELECT id, name, color, created_at, oidc_subject FROM profiles';

function mapProfileRow(row: Record<string, unknown>): Profile {
	return {
		id: Number(row.id),
		name: String(row.name),
		color: String(row.color),
		created_at: String(row.created_at),
		claimed: row.oidc_subject != null
	};
}

function rethrowProfileError(error: unknown): never {
	if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
		throw new Error('A profile with that name already exists');
	}
	throw error;
}

export async function listProfiles(): Promise<Profile[]> {
	const db = await ensureSchema();
	const result = await db.execute({
		sql: `${SELECT_PROFILE} ORDER BY name COLLATE NOCASE ASC`
	});
	return result.rows.map(mapProfileRow);
}

/** Profiles no Holroyd ID account has taken over yet — the ledgers left from before sign-in. */
export async function listUnclaimedProfiles(): Promise<Profile[]> {
	const db = await ensureSchema();
	const result = await db.execute({
		sql: `${SELECT_PROFILE} WHERE oidc_subject IS NULL ORDER BY name COLLATE NOCASE ASC`
	});
	return result.rows.map(mapProfileRow);
}

export async function getProfile(id: number): Promise<Profile | null> {
	const db = await ensureSchema();
	const result = await db.execute({
		sql: `${SELECT_PROFILE} WHERE id = ?`,
		args: [id]
	});
	return result.rows.length ? mapProfileRow(result.rows[0]) : null;
}

/** The profile a signed-in account owns, or null while it still has to claim one. */
export async function getProfileForSubject(subject: string): Promise<Profile | null> {
	const db = await ensureSchema();
	const result = await db.execute({
		sql: `${SELECT_PROFILE} WHERE oidc_subject = ?`,
		args: [subject]
	});
	return result.rows.length ? mapProfileRow(result.rows[0]) : null;
}

export async function createProfile(
	name: string,
	options: { subject: string; color?: string }
): Promise<Profile> {
	const db = await ensureSchema();
	const trimmed = name.trim();
	if (!trimmed) throw new Error('Profile name is required');

	const profiles = await listProfiles();
	const picked = options.color?.trim() || PROFILE_COLORS[profiles.length % PROFILE_COLORS.length];

	const result = await db.execute({
		sql: `INSERT INTO profiles (name, color, oidc_subject) VALUES (?, ?, ?)
			RETURNING id, name, color, created_at, oidc_subject`,
		args: [trimmed, picked, options.subject]
	}).catch(rethrowProfileError);

	return mapProfileRow(result.rows[0]);
}

/**
 * Hand an existing profile to the account claiming it.
 *
 * The `oidc_subject IS NULL` guard is the whole safety property: two people
 * racing for the same profile means the second one updates no rows and is told
 * so, rather than quietly taking over somebody else's ledger.
 */
export async function claimProfile(id: number, subject: string): Promise<Profile> {
	const db = await ensureSchema();

	const result = await db.execute({
		sql: `UPDATE profiles SET oidc_subject = ?
			WHERE id = ? AND oidc_subject IS NULL
			RETURNING id, name, color, created_at, oidc_subject`,
		args: [subject, id]
	}).catch(rethrowProfileError);

	if (result.rows.length === 0) {
		throw new Error('That profile has already been claimed');
	}

	return mapProfileRow(result.rows[0]);
}

/**
 * The profile for a signed-in account, created on the spot when there is nothing
 * to choose between.
 *
 * Returns null when unclaimed profiles exist: those are ledgers from before
 * sign-in existed, and guessing which one belongs to this account would hand
 * somebody else's hours over. The claim screen asks instead.
 */
export async function ensureProfileForSubject(
	subject: string,
	preferredName: string
): Promise<Profile | null> {
	const existing = await getProfileForSubject(subject);
	if (existing) return existing;

	const unclaimed = await listUnclaimedProfiles();
	if (unclaimed.length > 0) return null;

	try {
		return await createProfile(await availableName(preferredName), { subject });
	} catch (error) {
		// Two requests can race here; the unique index means only one wins.
		const claimed = await getProfileForSubject(subject);
		if (claimed) return claimed;
		throw error;
	}
}

/** Profile names are unique, so a second "Kieran" becomes "Kieran 2". */
async function availableName(preferred: string): Promise<string> {
	const base = preferred.trim() || 'Me';
	const taken = new Set((await listProfiles()).map((profile) => profile.name.toLowerCase()));

	if (!taken.has(base.toLowerCase())) return base;

	for (let suffix = 2; suffix < 100; suffix++) {
		const candidate = `${base} ${suffix}`;
		if (!taken.has(candidate.toLowerCase())) return candidate;
	}

	return `${base} ${Date.now()}`;
}

/** Scoped to the owning account: nobody edits a profile they did not claim. */
export async function updateProfile(
	id: number,
	subject: string,
	input: { name?: string; color?: string }
): Promise<Profile> {
	const db = await ensureSchema();
	const updates: string[] = [];
	const args: (string | number)[] = [];

	if (input.name !== undefined) {
		const trimmed = input.name.trim();
		if (!trimmed) throw new Error('Profile name is required');
		updates.push('name = ?');
		args.push(trimmed);
	}

	if (input.color !== undefined) {
		const picked = input.color.trim();
		if (!picked) throw new Error('Profile color is required');
		updates.push('color = ?');
		args.push(picked);
	}

	if (updates.length === 0) throw new Error('Nothing to update');

	args.push(id, subject);

	const result = await db.execute({
		sql: `UPDATE profiles SET ${updates.join(', ')}
			WHERE id = ? AND oidc_subject = ?
			RETURNING id, name, color, created_at, oidc_subject`,
		args
	}).catch(rethrowProfileError);

	if (result.rows.length === 0) {
		throw new Error('Profile not found');
	}

	return mapProfileRow(result.rows[0]);
}

import { PROFILE_COLORS, PROFILE_COOKIE } from '$lib/constants';
import type { Profile } from '$lib/types';
import { ensureSchema } from './db';

function mapProfileRow(row: Record<string, unknown>): Profile {
	return {
		id: Number(row.id),
		name: String(row.name),
		color: String(row.color),
		created_at: String(row.created_at)
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
		sql: `SELECT id, name, color, created_at FROM profiles ORDER BY name COLLATE NOCASE ASC`
	});
	return result.rows.map(mapProfileRow);
}

export async function getProfile(id: number): Promise<Profile | null> {
	const db = await ensureSchema();
	const result = await db.execute({
		sql: 'SELECT id, name, color, created_at FROM profiles WHERE id = ?',
		args: [id]
	});
	return result.rows.length ? mapProfileRow(result.rows[0]) : null;
}

export async function createProfile(name: string, color?: string): Promise<Profile> {
	const db = await ensureSchema();
	const trimmed = name.trim();
	if (!trimmed) throw new Error('Profile name is required');

	const profiles = await listProfiles();
	const picked = color?.trim() || PROFILE_COLORS[profiles.length % PROFILE_COLORS.length];

	const result = await db.execute({
		sql: 'INSERT INTO profiles (name, color) VALUES (?, ?) RETURNING id, name, color, created_at',
		args: [trimmed, picked]
	}).catch(rethrowProfileError);

	return mapProfileRow(result.rows[0]);
}

export async function updateProfile(
	id: number,
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

	args.push(id);

	const result = await db.execute({
		sql: `UPDATE profiles SET ${updates.join(', ')}
			WHERE id = ?
			RETURNING id, name, color, created_at`,
		args
	}).catch(rethrowProfileError);

	if (result.rows.length === 0) {
		throw new Error('Profile not found');
	}

	return mapProfileRow(result.rows[0]);
}

export async function resolveActiveProfileId(
	cookies: { get: (name: string) => string | undefined }
): Promise<number | null> {
	const raw = cookies.get(PROFILE_COOKIE);
	if (!raw) return null;

	const id = Number(raw);
	if (!Number.isFinite(id) || id <= 0) return null;

	const profile = await getProfile(id);
	return profile ? id : null;
}

export { PROFILE_COOKIE };

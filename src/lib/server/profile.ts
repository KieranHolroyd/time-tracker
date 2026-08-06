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
	});

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

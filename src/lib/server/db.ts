import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createClient, type Client } from '@libsql/client';
import { env } from '$env/dynamic/private';

let client: Client | null = null;
let migrated = false;

function ensureFileDbDirectory(url: string) {
	if (!url.startsWith('file:')) return;

	const path = url.slice('file:'.length);
	// Relative paths like file:local.db are fine as-is; absolute paths need their parent dir.
	if (!path.startsWith('/')) return;

	mkdirSync(dirname(path), { recursive: true });
}

export function getDb(): Client {
	if (client) return client;

	const url = env.TURSO_DATABASE_URL?.trim() || 'file:local.db';
	const authToken = env.TURSO_AUTH_TOKEN?.trim();

	if (!url.startsWith('file:') && !authToken) {
		throw new Error('TURSO_AUTH_TOKEN is required for remote Turso databases');
	}

	ensureFileDbDirectory(url);

	client = createClient({
		url,
		authToken: authToken || undefined
	});

	return client;
}

export async function ensureSchema(): Promise<Client> {
	const db = getDb();
	if (migrated) return db;

	await db.batch(
		[
			`CREATE TABLE IF NOT EXISTS profiles (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				name TEXT NOT NULL UNIQUE,
				color TEXT NOT NULL DEFAULT '#e8a838',
				created_at TEXT NOT NULL DEFAULT (datetime('now'))
			)`,
			`CREATE TABLE IF NOT EXISTS projects (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				name TEXT NOT NULL,
				color TEXT NOT NULL DEFAULT '#e8a838',
				created_at TEXT NOT NULL DEFAULT (datetime('now')),
				archived_at TEXT
			)`,
			`CREATE TABLE IF NOT EXISTS project_profiles (
				project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
				profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
				PRIMARY KEY (project_id, profile_id)
			)`,
			`CREATE TABLE IF NOT EXISTS time_entries (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
				hours REAL NOT NULL DEFAULT 1,
				worked_on TEXT NOT NULL,
				comment TEXT,
				created_at TEXT NOT NULL DEFAULT (datetime('now'))
			)`,
			`CREATE INDEX IF NOT EXISTS idx_time_entries_project ON time_entries(project_id)`,
			`CREATE INDEX IF NOT EXISTS idx_time_entries_worked_on ON time_entries(worked_on)`,
			`CREATE INDEX IF NOT EXISTS idx_project_profiles_profile ON project_profiles(profile_id)`
		],
		'write'
	);

	const columns = (
		await db.execute('PRAGMA table_info(projects)')
	).rows.map((row) => String(row.name));
	if (!columns.includes('archived_at')) {
		await db.execute('ALTER TABLE projects ADD COLUMN archived_at TEXT');
	}

	await migrateExistingProjects(db);
	await migrateDropProjectNameUnique(db);
	await migrateProfileSettings(db);

	migrated = true;
	return db;
}

async function migrateProfileSettings(db: Client) {
	const columns = (await db.execute('PRAGMA table_info(profiles)')).rows.map((row) =>
		String(row.name)
	);

	if (!columns.includes('hourly_rate')) {
		await db.execute('ALTER TABLE profiles ADD COLUMN hourly_rate REAL');
	}
	if (!columns.includes('currency')) {
		await db.execute("ALTER TABLE profiles ADD COLUMN currency TEXT NOT NULL DEFAULT 'GBP'");
	}
	if (!columns.includes('weekly_hours_goal')) {
		await db.execute('ALTER TABLE profiles ADD COLUMN weekly_hours_goal REAL');
	}
}

async function migrateDropProjectNameUnique(db: Client) {
	const indexes = await db.execute(`PRAGMA index_list(projects)`);
	let hasUniqueName = false;

	for (const row of indexes.rows) {
		if (Number(row.unique) !== 1) continue;
		const info = await db.execute(`PRAGMA index_info('${String(row.name)}')`);
		if (info.rows.some((col) => String(col.name) === 'name')) {
			hasUniqueName = true;
			break;
		}
	}

	if (!hasUniqueName) return;

	await db.execute('PRAGMA foreign_keys = OFF');
	try {
		await db.batch(
			[
				`CREATE TABLE projects_migrated (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					name TEXT NOT NULL,
					color TEXT NOT NULL DEFAULT '#e8a838',
					created_at TEXT NOT NULL DEFAULT (datetime('now')),
					archived_at TEXT
				)`,
				`INSERT INTO projects_migrated (id, name, color, created_at, archived_at)
					SELECT id, name, color, created_at, archived_at FROM projects`,
				'DROP TABLE projects',
				'ALTER TABLE projects_migrated RENAME TO projects'
			],
			'write'
		);
	} finally {
		await db.execute('PRAGMA foreign_keys = ON');
	}
}

async function migrateExistingProjects(db: Client) {
	const junctionCount = (
		await db.execute('SELECT COUNT(*) AS count FROM project_profiles')
	).rows[0];
	if (Number(junctionCount.count) > 0) return;

	const projectCount = (await db.execute('SELECT COUNT(*) AS count FROM projects')).rows[0];
	if (Number(projectCount.count) === 0) return;

	const profileResult = await db.execute({
		sql: `INSERT INTO profiles (name, color) VALUES (?, ?)
			ON CONFLICT(name) DO UPDATE SET name = excluded.name
			RETURNING id`,
		args: ['Default', '#e8a838']
	});
	const profileId = Number(profileResult.rows[0].id);

	await db.execute({
		sql: `INSERT INTO project_profiles (project_id, profile_id)
			SELECT id, ? FROM projects`,
		args: [profileId]
	});
}

export type { Project, TimeEntry } from '$lib/types';

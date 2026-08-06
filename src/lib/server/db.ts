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
			`CREATE TABLE IF NOT EXISTS projects (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				name TEXT NOT NULL UNIQUE,
				color TEXT NOT NULL DEFAULT '#e8a838',
				created_at TEXT NOT NULL DEFAULT (datetime('now')),
				archived_at TEXT
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
			`CREATE INDEX IF NOT EXISTS idx_time_entries_worked_on ON time_entries(worked_on)`
		],
		'write'
	);

	const columns = (
		await db.execute('PRAGMA table_info(projects)')
	).rows.map((row) => String(row.name));
	if (!columns.includes('archived_at')) {
		await db.execute('ALTER TABLE projects ADD COLUMN archived_at TEXT');
	}

	migrated = true;
	return db;
}

export type { Project, TimeEntry } from '$lib/types';

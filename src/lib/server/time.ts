import { ensureSchema, type Project, type TimeEntry } from './db';
import { normalizeWorkedOn, todayLocal, weekStartLocal } from '$lib/dayjs';
import { PROJECT_COLORS } from '$lib/constants';

export type ProjectWithStats = Project & {
	total_hours: number;
	today_hours: number;
	entry_count: number;
};

export type Summary = {
	today: number;
	week: number;
	total: number;
};

export async function listProjects(includeArchived = false): Promise<Project[]> {
	const db = await ensureSchema();
	const result = await db.execute({
		sql: `SELECT id, name, color, created_at, archived_at
			FROM projects
			${includeArchived ? '' : 'WHERE archived_at IS NULL'}
			ORDER BY name COLLATE NOCASE ASC`
	});
	return result.rows.map(mapProjectRow);
}

function mapProjectRow(row: Record<string, unknown>): Project {
	return {
		id: Number(row.id),
		name: String(row.name),
		color: String(row.color),
		created_at: String(row.created_at),
		archived_at: row.archived_at == null ? null : String(row.archived_at)
	};
}

export async function listProjectsWithStats(): Promise<ProjectWithStats[]> {
	const db = await ensureSchema();
	const result = await db.execute({
		sql: `SELECT
			p.id,
			p.name,
			p.color,
			p.created_at,
			p.archived_at,
			COALESCE(SUM(e.hours), 0) AS total_hours,
			COALESCE(SUM(CASE WHEN e.worked_on = ? THEN e.hours END), 0) AS today_hours,
			COUNT(e.id) AS entry_count
		FROM projects p
		LEFT JOIN time_entries e ON e.project_id = p.id
		WHERE p.archived_at IS NULL
		GROUP BY p.id
		ORDER BY p.name COLLATE NOCASE ASC`,
		args: [todayLocal()]
	});

	return result.rows.map((row) => ({
		...mapProjectRow(row),
		total_hours: Number(row.total_hours),
		today_hours: Number(row.today_hours),
		entry_count: Number(row.entry_count)
	}));
}

export async function createProject(name: string, color?: string): Promise<Project> {
	const db = await ensureSchema();
	const trimmed = name.trim();
	if (!trimmed) throw new Error('Project name is required');

	const projects = await listProjects();
	const picked = color?.trim() || PROJECT_COLORS[projects.length % PROJECT_COLORS.length];

	const result = await db.execute({
		sql: 'INSERT INTO projects (name, color) VALUES (?, ?) RETURNING id, name, color, created_at, archived_at',
		args: [trimmed, picked]
	});

	const row = result.rows[0];
	return mapProjectRow(row);
}

export async function updateProject(
	id: number,
	input: { name?: string; color?: string }
): Promise<Project> {
	const db = await ensureSchema();
	const updates: string[] = [];
	const args: (string | number)[] = [];

	if (input.name !== undefined) {
		const trimmed = input.name.trim();
		if (!trimmed) throw new Error('Project name is required');
		updates.push('name = ?');
		args.push(trimmed);
	}

	if (input.color !== undefined) {
		const picked = input.color.trim();
		if (!picked) throw new Error('Project color is required');
		updates.push('color = ?');
		args.push(picked);
	}

	if (updates.length === 0) throw new Error('Nothing to update');

	args.push(id);

	const result = await db.execute({
		sql: `UPDATE projects SET ${updates.join(', ')}
			WHERE id = ? AND archived_at IS NULL
			RETURNING id, name, color, created_at, archived_at`,
		args
	});

	if (result.rows.length === 0) {
		throw new Error('Project not found');
	}

	return mapProjectRow(result.rows[0]);
}

export async function archiveProject(id: number): Promise<void> {
	const db = await ensureSchema();
	const result = await db.execute({
		sql: `UPDATE projects SET archived_at = datetime('now')
			WHERE id = ? AND archived_at IS NULL`,
		args: [id]
	});

	if (result.rowsAffected === 0) {
		throw new Error('Project not found');
	}
}

export async function listEntries(options: { projectId?: number; limit?: number } = {}): Promise<
	TimeEntry[]
> {
	const db = await ensureSchema();
	const { projectId, limit = 100 } = options;

	const result = await db.execute({
		sql: `SELECT
			e.id,
			e.project_id,
			p.name AS project_name,
			p.color AS project_color,
			e.hours,
			e.worked_on,
			e.comment,
			e.created_at
		FROM time_entries e
		JOIN projects p ON p.id = e.project_id
		${projectId ? 'WHERE e.project_id = ?' : ''}
		ORDER BY e.worked_on DESC, e.created_at DESC
		LIMIT ?`,
		args: projectId ? [projectId, limit] : [limit]
	});

	return result.rows.map((row) => ({
		id: Number(row.id),
		project_id: Number(row.project_id),
		project_name: String(row.project_name),
		project_color: String(row.project_color),
		hours: Number(row.hours),
		worked_on: String(row.worked_on),
		comment: row.comment == null ? null : String(row.comment),
		created_at: String(row.created_at)
	}));
}

export async function addHour(input: {
	projectId: number;
	hours?: number;
	workedOn?: string;
	comment?: string;
}): Promise<TimeEntry> {
	const db = await ensureSchema();
	const hours = input.hours && input.hours > 0 ? input.hours : 1;
	const workedOn = normalizeWorkedOn(input.workedOn);
	const comment = input.comment?.trim() || null;

	const project = await db.execute({
		sql: 'SELECT name, color FROM projects WHERE id = ? AND archived_at IS NULL',
		args: [input.projectId]
	});

	if (project.rows.length === 0) {
		throw new Error('Project not found');
	}

	const result = await db.execute({
		sql: `INSERT INTO time_entries (project_id, hours, worked_on, comment)
			VALUES (?, ?, ?, ?)
			RETURNING id, project_id, hours, worked_on, comment, created_at`,
		args: [input.projectId, hours, workedOn, comment]
	});

	const row = result.rows[0];

	return {
		id: Number(row.id),
		project_id: Number(row.project_id),
		project_name: String(project.rows[0].name),
		project_color: String(project.rows[0].color),
		hours: Number(row.hours),
		worked_on: String(row.worked_on),
		comment: row.comment == null ? null : String(row.comment),
		created_at: String(row.created_at)
	};
}

export async function updateEntryComment(id: number, comment: string): Promise<void> {
	const db = await ensureSchema();
	await db.execute({
		sql: 'UPDATE time_entries SET comment = ? WHERE id = ?',
		args: [comment.trim() || null, id]
	});
}

export async function deleteEntry(id: number): Promise<void> {
	const db = await ensureSchema();
	await db.execute({
		sql: 'DELETE FROM time_entries WHERE id = ?',
		args: [id]
	});
}

export async function summarize(projectId?: number): Promise<Summary> {
	const db = await ensureSchema();
	const args: (string | number)[] = [todayLocal(), weekStartLocal()];
	if (projectId) args.push(projectId);

	const result = await db.execute({
		sql: `SELECT
			COALESCE(SUM(CASE WHEN worked_on = ? THEN hours END), 0) AS today,
			COALESCE(SUM(CASE WHEN worked_on >= ? THEN hours END), 0) AS week,
			COALESCE(SUM(hours), 0) AS total
		FROM time_entries
		${projectId ? 'WHERE project_id = ?' : ''}`,
		args
	});

	const row = result.rows[0];
	return {
		today: Number(row.today),
		week: Number(row.week),
		total: Number(row.total)
	};
}

export { todayLocal, weekStartLocal } from '$lib/dayjs';

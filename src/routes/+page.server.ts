import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	addHour,
	archiveProject,
	createProject,
	deleteEntry,
	listEntries,
	listProjectsWithStats,
	summarize,
	todayLocal,
	updateEntryComment,
	updateProject
} from '$lib/server/time';

export const load: PageServerLoad = async ({ url }) => {
	const projects = await listProjectsWithStats();
	const requested = url.searchParams.get('project');
	const showAll = requested === 'all';

	let selectedProjectId: number | null = null;
	if (!showAll) {
		const match = projects.find((p) => p.id === Number(requested));
		selectedProjectId = match?.id ?? projects[0]?.id ?? null;
	}

	const [entries, summary, overall] = await Promise.all([
		listEntries({ projectId: selectedProjectId ?? undefined }),
		summarize(selectedProjectId ?? undefined),
		summarize()
	]);

	return {
		projects,
		entries,
		summary,
		overall,
		selectedProjectId,
		showAll,
		today: todayLocal()
	};
};

export const actions: Actions = {
	createProject: async ({ request }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '');

		try {
			const project = await createProject(name);
			return { ok: true, action: 'createProject', projectId: project.id };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Could not create project';
			return fail(400, { action: 'createProject', message });
		}
	},

	addHour: async ({ request }) => {
		const form = await request.formData();
		const projectId = Number(form.get('projectId'));
		const hoursRaw = String(form.get('hours') ?? '').trim();
		const workedOn = String(form.get('workedOn') ?? '').trim();
		const comment = String(form.get('comment') ?? '');

		if (!projectId) {
			return fail(400, { action: 'addHour', message: 'Choose a project first' });
		}

		const hours = hoursRaw ? Number(hoursRaw) : 1;
		if (!Number.isFinite(hours) || hours <= 0) {
			return fail(400, { action: 'addHour', message: 'Hours must be a positive number' });
		}

		try {
			await addHour({ projectId, hours, workedOn, comment });
			return { ok: true, action: 'addHour' };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Could not log time';
			return fail(400, { action: 'addHour', message });
		}
	},

	updateComment: async ({ request }) => {
		const form = await request.formData();
		const id = Number(form.get('id'));
		const comment = String(form.get('comment') ?? '');

		if (!id) {
			return fail(400, { action: 'updateComment', message: 'Missing entry' });
		}

		try {
			await updateEntryComment(id, comment);
			return { ok: true, action: 'updateComment' };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Could not update comment';
			return fail(400, { action: 'updateComment', message });
		}
	},

	deleteEntry: async ({ request }) => {
		const form = await request.formData();
		const id = Number(form.get('id'));

		if (!id) {
			return fail(400, { action: 'deleteEntry', message: 'Missing entry' });
		}

		try {
			await deleteEntry(id);
			return { ok: true, action: 'deleteEntry' };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Could not delete entry';
			return fail(400, { action: 'deleteEntry', message });
		}
	},

	updateProject: async ({ request }) => {
		const form = await request.formData();
		const id = Number(form.get('id'));
		const name = String(form.get('name') ?? '');
		const color = String(form.get('color') ?? '');

		if (!id) {
			return fail(400, { action: 'updateProject', message: 'Missing project' });
		}

		try {
			await updateProject(id, { name, color });
			return { ok: true, action: 'updateProject', projectId: id };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Could not update project';
			return fail(400, { action: 'updateProject', message, projectId: id });
		}
	},

	archiveProject: async ({ request }) => {
		const form = await request.formData();
		const id = Number(form.get('id'));

		if (!id) {
			return fail(400, { action: 'archiveProject', message: 'Missing project' });
		}

		try {
			await archiveProject(id);
			return { ok: true, action: 'archiveProject', projectId: id };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Could not archive project';
			return fail(400, { action: 'archiveProject', message });
		}
	}
};

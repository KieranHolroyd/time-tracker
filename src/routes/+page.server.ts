import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { PROFILE_COOKIE } from '$lib/constants';
import { createProfile, getProfile, resolveActiveProfileId } from '$lib/server/profile';
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

async function requireProfileId(cookies: { get: (name: string) => string | undefined }) {
	const profileId = await resolveActiveProfileId(cookies);
	if (!profileId) throw new Error('PROFILE_REQUIRED');
	return profileId;
}

export const load: PageServerLoad = async ({ url, parent }) => {
	const { activeProfileId, profiles } = await parent();

	if (!activeProfileId) {
		return {
			needsProfile: true as const,
			profiles,
			activeProfileId: null,
			projects: [],
			entries: [],
			summary: { today: 0, week: 0, total: 0 },
			overall: { today: 0, week: 0, total: 0 },
			selectedProjectId: null,
			showAll: false,
			today: todayLocal()
		};
	}

	const projects = await listProjectsWithStats(activeProfileId);
	const requested = url.searchParams.get('project');
	const showAll = requested === 'all';

	let selectedProjectId: number | null = null;
	if (!showAll) {
		const match = projects.find((p) => p.id === Number(requested));
		selectedProjectId = match?.id ?? projects[0]?.id ?? null;
	}

	const [entries, summary, overall] = await Promise.all([
		listEntries(activeProfileId, { projectId: selectedProjectId ?? undefined }),
		summarize(activeProfileId, selectedProjectId ?? undefined),
		summarize(activeProfileId)
	]);

	return {
		needsProfile: false as const,
		profiles,
		activeProfileId,
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
	selectProfile: async ({ request, cookies }) => {
		const form = await request.formData();
		const profileId = Number(form.get('profileId'));

		if (!profileId) {
			return fail(400, { action: 'selectProfile', message: 'Choose a profile' });
		}

		const profile = await getProfile(profileId);
		if (!profile) {
			return fail(400, { action: 'selectProfile', message: 'Profile not found' });
		}

		cookies.set(PROFILE_COOKIE, String(profileId), {
			path: '/',
			maxAge: 60 * 60 * 24 * 365,
			httpOnly: true,
			sameSite: 'lax'
		});

		throw redirect(303, '/');
	},

	createProfile: async ({ request, cookies }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '');

		try {
			const profile = await createProfile(name);
			cookies.set(PROFILE_COOKIE, String(profile.id), {
				path: '/',
				maxAge: 60 * 60 * 24 * 365,
				httpOnly: true,
				sameSite: 'lax'
			});
			return { ok: true, action: 'createProfile', profileId: profile.id };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Could not create profile';
			return fail(400, { action: 'createProfile', message });
		}
	},

	switchProfile: async ({ cookies }) => {
		cookies.delete(PROFILE_COOKIE, { path: '/' });
		throw redirect(303, '/');
	},

	createProject: async ({ request, cookies }) => {
		let activeProfileId: number;
		try {
			activeProfileId = await requireProfileId(cookies);
		} catch {
			return fail(400, { action: 'createProject', message: 'Choose a profile first' });
		}

		const form = await request.formData();
		const name = String(form.get('name') ?? '');

		try {
			const project = await createProject(name, [activeProfileId]);
			return { ok: true, action: 'createProject', projectId: project.id };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Could not create project';
			return fail(400, { action: 'createProject', message });
		}
	},

	addHour: async ({ request, cookies }) => {
		const activeProfileId = await resolveActiveProfileId(cookies);
		if (!activeProfileId) {
			return fail(400, { action: 'addHour', message: 'Choose a profile first' });
		}

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
			await addHour(activeProfileId, { projectId, hours, workedOn, comment });
			return { ok: true, action: 'addHour' };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Could not log time';
			return fail(400, { action: 'addHour', message });
		}
	},

	updateComment: async ({ request, cookies }) => {
		const activeProfileId = await resolveActiveProfileId(cookies);
		if (!activeProfileId) {
			return fail(400, { action: 'updateComment', message: 'Choose a profile first' });
		}

		const form = await request.formData();
		const id = Number(form.get('id'));
		const comment = String(form.get('comment') ?? '');

		if (!id) {
			return fail(400, { action: 'updateComment', message: 'Missing entry' });
		}

		try {
			await updateEntryComment(id, activeProfileId, comment);
			return { ok: true, action: 'updateComment' };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Could not update comment';
			return fail(400, { action: 'updateComment', message });
		}
	},

	deleteEntry: async ({ request, cookies }) => {
		const activeProfileId = await resolveActiveProfileId(cookies);
		if (!activeProfileId) {
			return fail(400, { action: 'deleteEntry', message: 'Choose a profile first' });
		}

		const form = await request.formData();
		const id = Number(form.get('id'));

		if (!id) {
			return fail(400, { action: 'deleteEntry', message: 'Missing entry' });
		}

		try {
			await deleteEntry(id, activeProfileId);
			return { ok: true, action: 'deleteEntry' };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Could not delete entry';
			return fail(400, { action: 'deleteEntry', message });
		}
	},

	updateProject: async ({ request, cookies }) => {
		const activeProfileId = await resolveActiveProfileId(cookies);
		if (!activeProfileId) {
			return fail(400, { action: 'updateProject', message: 'Choose a profile first' });
		}

		const form = await request.formData();
		const id = Number(form.get('id'));
		const name = String(form.get('name') ?? '');
		const color = String(form.get('color') ?? '');

		if (!id) {
			return fail(400, { action: 'updateProject', message: 'Missing project' });
		}

		try {
			await updateProject(id, activeProfileId, {
				name: name || undefined,
				color: color || undefined
			});
			return { ok: true, action: 'updateProject', projectId: id };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Could not update project';
			return fail(400, { action: 'updateProject', message, projectId: id });
		}
	},

	archiveProject: async ({ request, cookies }) => {
		const activeProfileId = await resolveActiveProfileId(cookies);
		if (!activeProfileId) {
			return fail(400, { action: 'archiveProject', message: 'Choose a profile first' });
		}

		const form = await request.formData();
		const id = Number(form.get('id'));

		if (!id) {
			return fail(400, { action: 'archiveProject', message: 'Missing project' });
		}

		try {
			await archiveProject(id, activeProfileId);
			return { ok: true, action: 'archiveProject', projectId: id };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Could not archive project';
			return fail(400, { action: 'archiveProject', message });
		}
	}
};

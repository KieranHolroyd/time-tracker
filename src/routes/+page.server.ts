import { fail, redirect, type ActionFailure } from '@sveltejs/kit';
import type { Actions, PageServerLoad, RequestEvent } from './$types';
import { PERMISSIONS, can } from '$lib/auth/claims';
import { claimProfile, createProfile, updateProfile } from '$lib/server/profile';
import { getProfileSettings, updateProfileSettings } from '$lib/server/settings';
import { parseDurationInput, parseLoggedDuration } from '$lib/format';
import {
	addHour,
	archiveProject,
	createProject,
	deleteEntry,
	listEntries,
	listProjectsWithStats,
	summarize,
	todayLocal,
	updateEntry,
	updateProject
} from '$lib/server/time';

type Guard =
	| { ok: true; profileId: number; subject: string }
	| { ok: false; failure: ActionFailure<{ action: string; message: string }> };

/** Refusals travel in the same `{ action, message }` shape every action returns. */
function refusal(action: string, message: string): Guard {
	return { ok: false, failure: fail(403, { action, message }) };
}

/**
 * Every write goes through here. `hooks.server.ts` has already established that
 * there is a session with read access, so what is left to check is write access
 * and whether this account has a ledger to write to yet.
 */
function requireWritableProfile({ locals }: RequestEvent, action: string): Guard {
	const { session, profile } = locals;

	if (!session) return refusal(action, 'Your session has expired — reload to sign in');
	if (!can(session.user, PERMISSIONS.write)) {
		return refusal(action, 'Your access to Hourmark is read-only');
	}
	if (!profile) return refusal(action, 'Choose a profile first');

	return { ok: true, profileId: profile.id, subject: session.subject };
}

export const load: PageServerLoad = async ({ url, parent }) => {
	const { profile, unclaimedProfiles, user } = await parent();

	if (!profile) {
		return {
			needsProfile: true as const,
			unclaimedProfiles,
			profile: null,
			activeProfileId: null,
			canWrite: false,
			projects: [],
			entries: [],
			summary: { today: 0, week: 0, total: 0 },
			overall: { today: 0, week: 0, total: 0 },
			settings: { hourly_rate: null, currency: 'GBP', weekly_hours_goal: null },
			selectedProjectId: null,
			showAll: false,
			today: todayLocal()
		};
	}

	const activeProfileId = profile.id;
	const projects = await listProjectsWithStats(activeProfileId);
	const requested = url.searchParams.get('project');
	const showAll = requested === 'all';

	let selectedProjectId: number | null = null;
	if (!showAll) {
		const match = projects.find((p) => p.id === Number(requested));
		selectedProjectId = match?.id ?? projects[0]?.id ?? null;
	}

	const [entries, summary, overall, settings] = await Promise.all([
		listEntries(activeProfileId, { projectId: selectedProjectId ?? undefined }),
		summarize(activeProfileId, selectedProjectId ?? undefined),
		summarize(activeProfileId),
		getProfileSettings(activeProfileId)
	]);

	return {
		needsProfile: false as const,
		unclaimedProfiles,
		profile,
		activeProfileId,
		canWrite: can(user ?? { permissions: [] }, PERMISSIONS.write),
		projects,
		entries,
		summary,
		overall,
		settings,
		selectedProjectId,
		showAll,
		today: todayLocal()
	};
};

export const actions: Actions = {
	/** Take over a ledger that predates sign-in. */
	claimProfile: async (event) => {
		const { session } = event.locals;
		if (!session) {
			return fail(401, { action: 'claimProfile', message: 'Your session has expired — reload to sign in' });
		}
		if (event.locals.profile) redirect(303, '/');

		const form = await event.request.formData();
		const profileId = Number(form.get('profileId'));

		if (!profileId) {
			return fail(400, { action: 'claimProfile', message: 'Choose a profile' });
		}

		try {
			await claimProfile(profileId, session.subject);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Could not open that profile';
			return fail(400, { action: 'claimProfile', message });
		}

		redirect(303, '/');
	},

	createProfile: async (event) => {
		const { session } = event.locals;
		if (!session) {
			return fail(401, { action: 'createProfile', message: 'Your session has expired — reload to sign in' });
		}
		if (event.locals.profile) redirect(303, '/');

		const form = await event.request.formData();
		const name = String(form.get('name') ?? '');

		try {
			const profile = await createProfile(name, { subject: session.subject });
			return { ok: true, action: 'createProfile', profileId: profile.id };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Could not create profile';
			return fail(400, { action: 'createProfile', message });
		}
	},

	updateProfile: async (event) => {
		const guard = requireWritableProfile(event, 'updateProfile');
		if (!guard.ok) return guard.failure;

		const form = await event.request.formData();
		const name = String(form.get('name') ?? '');
		const color = String(form.get('color') ?? '');

		try {
			await updateProfile(guard.profileId, guard.subject, { name, color });
			return { ok: true, action: 'updateProfile', profileId: guard.profileId };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Could not update profile';
			return fail(400, { action: 'updateProfile', message, profileId: guard.profileId });
		}
	},

	createProject: async (event) => {
		const guard = requireWritableProfile(event, 'createProject');
		if (!guard.ok) return guard.failure;

		const form = await event.request.formData();
		const name = String(form.get('name') ?? '');

		try {
			const project = await createProject(name, [guard.profileId]);
			return { ok: true, action: 'createProject', projectId: project.id };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Could not create project';
			return fail(400, { action: 'createProject', message });
		}
	},

	addHour: async (event) => {
		const guard = requireWritableProfile(event, 'addHour');
		if (!guard.ok) return guard.failure;

		const form = await event.request.formData();
		const projectId = Number(form.get('projectId'));
		const workedOn = String(form.get('workedOn') ?? '').trim();
		const comment = String(form.get('comment') ?? '');

		if (!projectId) {
			return fail(400, { action: 'addHour', message: 'Choose a project first' });
		}

		let hours: number;
		try {
			hours = parseLoggedDuration(form);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Invalid duration';
			return fail(400, { action: 'addHour', message });
		}

		try {
			await addHour(guard.profileId, { projectId, hours, workedOn, comment });
			return { ok: true, action: 'addHour' };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Could not log time';
			return fail(400, { action: 'addHour', message });
		}
	},

	updateEntry: async (event) => {
		const guard = requireWritableProfile(event, 'updateEntry');
		if (!guard.ok) return guard.failure;

		const form = await event.request.formData();
		const id = Number(form.get('id'));
		const comment = String(form.get('comment') ?? '');

		if (!id) {
			return fail(400, { action: 'updateEntry', message: 'Missing entry' });
		}

		let hours: number;
		try {
			hours = parseDurationInput(form.get('durationHours'), form.get('durationMinutes'));
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Invalid duration';
			return fail(400, { action: 'updateEntry', message, entryId: id });
		}

		try {
			await updateEntry(id, guard.profileId, { hours, comment });
			return { ok: true, action: 'updateEntry' };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Could not update entry';
			return fail(400, { action: 'updateEntry', message, entryId: id });
		}
	},

	deleteEntry: async (event) => {
		const guard = requireWritableProfile(event, 'deleteEntry');
		if (!guard.ok) return guard.failure;

		const form = await event.request.formData();
		const id = Number(form.get('id'));

		if (!id) {
			return fail(400, { action: 'deleteEntry', message: 'Missing entry' });
		}

		try {
			await deleteEntry(id, guard.profileId);
			return { ok: true, action: 'deleteEntry' };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Could not delete entry';
			return fail(400, { action: 'deleteEntry', message });
		}
	},

	updateProject: async (event) => {
		const guard = requireWritableProfile(event, 'updateProject');
		if (!guard.ok) return guard.failure;

		const form = await event.request.formData();
		const id = Number(form.get('id'));
		const name = String(form.get('name') ?? '');
		const color = String(form.get('color') ?? '');

		if (!id) {
			return fail(400, { action: 'updateProject', message: 'Missing project' });
		}

		try {
			await updateProject(id, guard.profileId, {
				name: name || undefined,
				color: color || undefined
			});
			return { ok: true, action: 'updateProject', projectId: id };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Could not update project';
			return fail(400, { action: 'updateProject', message, projectId: id });
		}
	},

	archiveProject: async (event) => {
		const guard = requireWritableProfile(event, 'archiveProject');
		if (!guard.ok) return guard.failure;

		const form = await event.request.formData();
		const id = Number(form.get('id'));

		if (!id) {
			return fail(400, { action: 'archiveProject', message: 'Missing project' });
		}

		try {
			await archiveProject(id, guard.profileId);
			return { ok: true, action: 'archiveProject', projectId: id };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Could not archive project';
			return fail(400, { action: 'archiveProject', message });
		}
	},

	updateSettings: async (event) => {
		const guard = requireWritableProfile(event, 'updateSettings');
		if (!guard.ok) return guard.failure;

		const form = await event.request.formData();
		const hourlyRateRaw = String(form.get('hourlyRate') ?? '').trim();
		const currency = String(form.get('currency') ?? 'GBP');
		const weeklyGoalRaw = String(form.get('weeklyHoursGoal') ?? '').trim();

		const hourly_rate = hourlyRateRaw ? Number(hourlyRateRaw) : null;
		const weekly_hours_goal = weeklyGoalRaw ? Number(weeklyGoalRaw) : null;

		if (hourlyRateRaw && (!Number.isFinite(hourly_rate!) || hourly_rate! < 0)) {
			return fail(400, { action: 'updateSettings', message: 'Hourly rate must be zero or greater' });
		}

		if (weeklyGoalRaw && (!Number.isFinite(weekly_hours_goal!) || weekly_hours_goal! <= 0)) {
			return fail(400, {
				action: 'updateSettings',
				message: 'Weekly hours goal must be greater than zero'
			});
		}

		try {
			await updateProfileSettings(guard.profileId, {
				hourly_rate,
				currency,
				weekly_hours_goal
			});
			return { ok: true, action: 'updateSettings' };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Could not save settings';
			return fail(400, { action: 'updateSettings', message });
		}
	}
};

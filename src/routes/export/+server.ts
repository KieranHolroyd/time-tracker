import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isReversedRange, rangeFromParams } from '$lib/date-range';
import { exportFilename, formatExport } from '$lib/server/export';
import { getProfile, resolveActiveProfileId } from '$lib/server/profile';
import { getProfileSettings } from '$lib/server/settings';
import { listEntries, listProjectsWithStats, todayLocal } from '$lib/server/time';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const profileId = await resolveActiveProfileId(cookies);
	if (!profileId) throw error(401, 'Select a profile first');

	const profile = await getProfile(profileId);
	if (!profile) throw error(401, 'Profile not found');

	const projectParam = url.searchParams.get('project');
	const projects = await listProjectsWithStats(profileId);

	let projectId: number | undefined;
	let projectName: string | undefined;

	if (projectParam && projectParam !== 'all') {
		const match = projects.find((project) => project.id === Number(projectParam));
		if (!match) throw error(404, 'Project not found');
		projectId = match.id;
		projectName = match.name;
	}

	const range = rangeFromParams(url.searchParams);
	if (isReversedRange(range)) {
		throw error(400, 'The start of the range must come before the end');
	}

	// Every entry, not just noted ones — the summary would understate time otherwise.
	const [entries, settings] = await Promise.all([
		listEntries(profileId, {
			projectId,
			limit: 0,
			from: range.from ?? undefined,
			to: range.to ?? undefined
		}),
		getProfileSettings(profileId)
	]);

	const body = formatExport({
		profile,
		entries,
		today: todayLocal(),
		projectName,
		settings,
		range
	});

	return new Response(body, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Content-Disposition': `attachment; filename="${exportFilename(profile, projectName, range)}"`
		}
	});
};

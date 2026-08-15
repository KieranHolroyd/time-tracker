import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isReversedRange, rangeFromParams } from '$lib/date-range';
import { exportFilename, formatExport } from '$lib/server/export';
import { getProfileSettings } from '$lib/server/settings';
import { listEntries, listProjectsWithStats, todayLocal } from '$lib/server/time';

// Reading the export needs `hours:read`, which `hooks.server.ts` has already
// established for every non-public route — so all that is left is the ledger.
export const GET: RequestHandler = async ({ url, locals }) => {
	const profile = locals.profile;
	if (!profile) throw error(401, 'Choose a profile first');

	const profileId = profile.id;
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

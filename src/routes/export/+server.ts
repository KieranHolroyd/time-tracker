import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { exportFilename, formatNotesExport } from '$lib/server/export';
import { getProfile, resolveActiveProfileId } from '$lib/server/profile';
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

	const entries = await listEntries(profileId, {
		projectId,
		limit: 0,
		notesOnly: true
	});

	const body = formatNotesExport({
		profile,
		entries,
		today: todayLocal(),
		projectName
	});

	return new Response(body, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Content-Disposition': `attachment; filename="${exportFilename(profile, projectName)}"`
		}
	});
};

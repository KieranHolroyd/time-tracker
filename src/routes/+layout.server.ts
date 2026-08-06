import type { LayoutServerLoad } from './$types';
import { listProfiles, resolveActiveProfileId } from '$lib/server/profile';

export const load: LayoutServerLoad = async ({ cookies }) => {
	const [profiles, activeProfileId] = await Promise.all([
		listProfiles(),
		resolveActiveProfileId(cookies)
	]);

	return {
		profiles,
		activeProfileId
	};
};

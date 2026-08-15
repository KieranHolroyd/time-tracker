import type { LayoutServerLoad } from './$types';
import { listUnclaimedProfiles } from '$lib/server/profile';

export const load: LayoutServerLoad = async ({ locals }) => {
	const { session, profile } = locals;

	if (!session) {
		return { user: null, profile: null, unclaimedProfiles: [] };
	}

	return {
		user: session.user,
		profile,
		// Only ever non-empty for an account that has not claimed a ledger yet.
		unclaimedProfiles: profile ? [] : await listUnclaimedProfiles()
	};
};

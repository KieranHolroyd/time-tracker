import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const reason = url.searchParams.get('reason')?.trim();

	return {
		// Bounded, so a crafted link cannot turn this page into a billboard.
		reason: reason && reason.length <= 200 ? reason : 'The sign-in could not be completed.'
	};
};

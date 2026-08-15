import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { PERMISSIONS, can } from '$lib/auth/claims';

export const load: PageServerLoad = async ({ locals }) => {
	const session = locals.session;
	if (!session) redirect(302, '/auth/login');

	// A grant added since the last look shows up on the next token refresh, so
	// landing here with access now simply means it worked.
	if (can(session.user, PERMISSIONS.read)) redirect(303, '/');

	return { user: session.user };
};

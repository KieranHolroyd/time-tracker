import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { destroySession } from '$lib/server/auth/session';

/**
 * Local sign-out: our session row goes, the provider's stays. RP-initiated
 * logout is refused for a self-registered client, and dropping everyone's
 * Holroyd ID session because they left a timesheet would be the wrong trade
 * anyway. The next sign-in is a silent redirect.
 */
export const POST: RequestHandler = async ({ cookies }) => {
	await destroySession(cookies);
	redirect(303, '/');
};

import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { destroySession } from '$lib/server/auth/session';

/**
 * Local sign-out: our session row goes, the provider's stays. RP-initiated
 * logout is refused for a self-registered client, and dropping everyone's
 * Holroyd ID session because they left a timesheet would be the wrong trade
 * anyway.
 *
 * Landing on `/` would therefore look like sign-out did nothing: the guard in
 * hooks bounces a session-less GET to `/auth/login`, the provider still holds
 * an SSO session, and the whole round trip completes without a prompt. So we
 * land on a public page instead, and let the next sign-in be deliberate.
 */
export const POST: RequestHandler = async ({ cookies }) => {
	await destroySession(cookies);
	redirect(303, '/auth/signed-out');
};

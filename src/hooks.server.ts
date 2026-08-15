import { error, redirect, type Handle } from '@sveltejs/kit';
import { PERMISSIONS, can } from '$lib/auth/claims';
import { registerApplication } from '$lib/server/auth/register';
import { readSession } from '$lib/server/auth/session';
import { ensureProfileForSubject } from '$lib/server/profile';

/** Reachable signed out — the sign-in flow itself, and the two dead ends it can land on. */
const PUBLIC_PATHS = ['/auth/login', '/auth/callback', '/auth/logout', '/auth/error', '/no-access'];

// Registration is idempotent and runs once per process; kicked off at startup so
// the first sign-in does not wait on it.
void registerApplication();

export const handle: Handle = async ({ event, resolve }) => {
	const session = await readSession(event.cookies);

	event.locals.session = session;
	event.locals.profile = null;

	if (PUBLIC_PATHS.includes(event.url.pathname)) return resolve(event);

	if (!session) {
		// A form post or a fetch has nowhere useful to be redirected to; the browser
		// would follow the redirect and hand the sign-in page back as the response.
		if (event.request.method !== 'GET') error(401, 'Your session has expired — reload to sign in');

		const next = event.url.pathname + event.url.search;
		redirect(302, `/auth/login?next=${encodeURIComponent(next)}`);
	}

	// The provider refuses ungranted users at its authorize endpoint, so this only
	// catches a grant whose role does not carry read access.
	if (!can(session.user, PERMISSIONS.read)) redirect(303, '/no-access');

	// Only once access is established: nobody who cannot use Hourmark should end
	// up owning a ledger in it.
	event.locals.profile = await ensureProfileForSubject(session.subject, session.user.name);

	return resolve(event);
};

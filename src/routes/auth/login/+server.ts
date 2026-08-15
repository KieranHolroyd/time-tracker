import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { FLOW_COOKIE } from '$lib/server/auth/config';
import { authorizeUrl, startFlow } from '$lib/server/auth/oidc';

/**
 * Only same-site paths, so `?next=` cannot be used to bounce somebody off to
 * another origin carrying our sign-in as the referrer. `//evil.com` is a path
 * to the browser and an origin to `new URL`, hence the second check.
 */
function safeNext(raw: string | null): string {
	if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/';
	return raw;
}

export const GET: RequestHandler = async ({ cookies, url, locals }) => {
	if (locals.session) redirect(303, safeNext(url.searchParams.get('next')));

	const flow = startFlow();
	let destination: string;

	try {
		destination = await authorizeUrl(flow);
	} catch (cause) {
		console.error('[auth] could not build the authorize URL:', cause);
		error(503, 'Sign-in is unavailable: Holroyd ID could not be reached');
	}

	// The verifier and nonce have to survive the round trip and must not reach the
	// browser's scripts; ten minutes is more than any sign-in takes.
	cookies.set(FLOW_COOKIE, JSON.stringify({ ...flow, next: safeNext(url.searchParams.get('next')) }), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 600
	});

	redirect(302, destination);
};

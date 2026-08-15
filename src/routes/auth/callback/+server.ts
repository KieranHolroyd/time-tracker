import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { FLOW_COOKIE } from '$lib/server/auth/config';
import { exchangeCode, type PendingFlow } from '$lib/server/auth/oidc';
import { createSession } from '$lib/server/auth/session';

type StoredFlow = PendingFlow & { next: string };

function readFlow(raw: string | undefined): StoredFlow | null {
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw) as Partial<StoredFlow>;
		if (!parsed.state || !parsed.nonce || !parsed.verifier) return null;
		return { ...parsed, next: parsed.next || '/' } as StoredFlow;
	} catch {
		return null;
	}
}

function failed(reason: string): never {
	redirect(303, `/auth/error?reason=${encodeURIComponent(reason)}`);
}

export const GET: RequestHandler = async ({ url, cookies }) => {
	const flow = readFlow(cookies.get(FLOW_COOKIE));
	// One code, one attempt: the flow cookie goes whatever happens next.
	cookies.delete(FLOW_COOKIE, { path: '/' });

	const providerError = url.searchParams.get('error');
	if (providerError) {
		console.warn('[auth] provider refused the authorize request:', providerError);
		failed(url.searchParams.get('error_description') || providerError);
	}

	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');

	if (!flow) failed('The sign-in attempt expired. Try again.');
	if (!code || state !== flow.state) failed('The sign-in response did not match this browser.');

	try {
		const tokens = await exchangeCode(code, flow);
		await createSession(cookies, tokens);
	} catch (cause) {
		console.error('[auth] code exchange failed:', cause);
		failed('Holroyd ID could not complete the sign-in.');
	}

	redirect(303, flow.next);
};

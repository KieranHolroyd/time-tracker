/**
 * Self-registration with Holroyd ID.
 *
 * `PUT /api/applications/register` is idempotent by slug, so this runs on every
 * boot and keeps the redirect URIs and the permission catalogue in step with the
 * code that enforces them. On a trusted domain it needs no credential at all —
 * which is why this app has no client id or secret to configure.
 */
import { APP_SLUG, PERMISSIONS } from '$lib/auth/claims';
import {
	AUTH_ISSUER,
	EXTRA_REDIRECT_URIS,
	REGISTER_ON_BOOT,
	REGISTRATION_TOKEN,
	redirectUri
} from './config';

/**
 * The manifest is the whole truth, not an addition: a permission dropped here
 * disappears at the provider too. Roles may only name permissions declared in
 * the same call.
 */
const MANIFEST = {
	name: 'Hourmark',
	description: 'Job time tracking — log hours against projects and export the notes.',
	trusted: true,
	permissions: [
		{ key: PERMISSIONS.read, description: 'See logged hours, projects and exports' },
		{ key: PERMISSIONS.write, description: 'Log and edit hours, projects and settings' }
	],
	roles: [
		{ key: 'viewer', description: 'Read the ledger', permissions: [PERMISSIONS.read] },
		{
			key: 'editor',
			description: 'Log and edit time',
			permissions: [PERMISSIONS.read, PERMISSIONS.write]
		},
		{
			key: 'admin',
			description: 'Full access',
			permissions: [PERMISSIONS.read, PERMISSIONS.write]
		}
	]
};

let attempt: Promise<void> | null = null;

/** Runs once per process. Never rejects: a provider blip must not stop the app booting. */
export function registerApplication(): Promise<void> {
	attempt ??= register().catch((error) => {
		console.error('[auth] registration with Holroyd ID failed:', describe(error));
		console.error('[auth] sign-in will still work if the app is already registered');
	});
	return attempt;
}

async function register(): Promise<void> {
	if (!REGISTER_ON_BOOT) return;

	const redirectUris = [redirectUri(), ...EXTRA_REDIRECT_URIS];
	const headers: Record<string, string> = { 'content-type': 'application/json' };
	if (REGISTRATION_TOKEN) headers['x-registration-token'] = REGISTRATION_TOKEN;

	const response = await fetch(`${AUTH_ISSUER}/api/applications/register`, {
		method: 'PUT',
		headers,
		body: JSON.stringify({ slug: APP_SLUG, redirect_uris: redirectUris, ...MANIFEST })
	});

	if (!response.ok) {
		const body = await response.text().catch(() => '');
		throw new Error(`${response.status} ${response.statusText} ${body}`.trim());
	}

	const result = (await response.json().catch(() => ({}))) as {
		status?: string;
		client_id?: string;
	};

	console.log(
		`[auth] ${result.status ?? 'registered'} "${APP_SLUG}" with ${AUTH_ISSUER} ` +
			`(client_id ${result.client_id ?? APP_SLUG}); callbacks: ${redirectUris.join(', ')}`
	);
}

function describe(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { Session } from '$lib/server/auth/session';
import type { Profile } from '$lib/types';

declare global {
	namespace App {
		interface Locals {
			/** Null only on the routes that are reachable signed out. */
			session: Session | null;
			/** The ledger this account owns, or null until it claims one. */
			profile: Profile | null;
		}
		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};

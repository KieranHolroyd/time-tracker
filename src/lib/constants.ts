export const PROJECT_COLORS = [
	'#e8a838',
	'#6eb5a0',
	'#d4776a',
	'#7a9cc6',
	'#c4a484',
	'#b8a0d4'
] as const;

/** Human-readable swatch names, so pickers never have to show raw hex. */
export const COLOR_NAMES: Record<string, string> = {
	'#e8a838': 'Brass',
	'#6eb5a0': 'Sage',
	'#d4776a': 'Clay',
	'#7a9cc6': 'Steel',
	'#c4a484': 'Sand',
	'#b8a0d4': 'Lilac'
};

export const PROFILE_COLORS = [
	'#e8a838',
	'#6eb5a0',
	'#d4776a',
	'#7a9cc6',
	'#b8a0d4',
	'#c4a484',
	'#8fbc8f',
	'#dda0dd'
] as const;

export const PROFILE_COOKIE = 'hourmark_profile';

/** Presence check interval while the work timer is running. */
export const TIMER_CHECK_INTERVAL_MS = 15 * 60 * 1000;

/** How long the user has to confirm a presence check. */
export const TIMER_CHECK_TIMEOUT_MS = 30 * 1000;

export const TIMER_STORAGE_KEY = 'hourmark_timer';

import { dayjs, parseDate, todayLocal } from '$lib/dayjs';
import { TIMER_CHECK_INTERVAL_MS } from '$lib/constants';

export type DurationParts = { hours: number; minutes: number };

/** Split decimal hours into whole hours and minutes (rounded to nearest minute). */
export function hoursToParts(hours: number): DurationParts {
	const totalMinutes = Math.round(hours * 60);
	return {
		hours: Math.floor(totalMinutes / 60),
		minutes: totalMinutes % 60
	};
}

/** Combine hours and minutes into decimal hours stored in the database. */
export function partsToHours(hours: number, minutes: number): number {
	const h = Math.max(0, Math.floor(hours) || 0);
	const m = Math.max(0, Math.min(59, Math.floor(minutes) || 0));
	return h + m / 60;
}

export function parseDurationInput(
	hoursRaw: FormDataEntryValue | null | undefined,
	minutesRaw: FormDataEntryValue | null | undefined
): number {
	const hoursStr = String(hoursRaw ?? '').trim();
	const minutesStr = String(minutesRaw ?? '').trim();
	const hours = hoursStr === '' ? 0 : Number(hoursStr);
	const minutes = minutesStr === '' ? 0 : Number(minutesStr);

	if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
		throw new Error('Hours and minutes must be numbers');
	}
	if (hours < 0 || minutes < 0) {
		throw new Error('Duration cannot be negative');
	}
	if (minutes >= 60) {
		throw new Error('Minutes must be less than 60');
	}

	const total = partsToHours(hours, minutes);
	if (total <= 0) {
		throw new Error('Duration must be greater than zero');
	}

	return total;
}

/** Read duration from form fields (hours + minutes, or legacy decimal hours). */
export function parseLoggedDuration(form: FormData): number {
	if (form.has('durationHours') || form.has('durationMinutes')) {
		return parseDurationInput(form.get('durationHours'), form.get('durationMinutes'));
	}

	const legacy = String(form.get('hours') ?? '').trim();
	const hours = legacy ? Number(legacy) : 1;
	if (!Number.isFinite(hours) || hours <= 0) {
		throw new Error('Duration must be greater than zero');
	}

	return hours;
}

/** Human-readable duration, e.g. "1h 30m", "45m", "2h". */
export function formatDuration(hours: number): string {
	const { hours: h, minutes: m } = hoursToParts(hours);
	if (h === 0 && m === 0) return '0m';
	if (m === 0) return `${h}h`;
	if (h === 0) return `${m}m`;
	return `${h}h ${m}m`;
}

/** Live timer display, e.g. "1:05:03" or "05:03". */
export function formatElapsed(ms: number): string {
	const totalSeconds = Math.max(0, Math.floor(ms / 1000));
	const h = Math.floor(totalSeconds / 3600);
	const m = Math.floor((totalSeconds % 3600) / 60);
	const s = totalSeconds % 60;
	if (h > 0) {
		return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
	}
	return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Convert milliseconds to hours/minutes for logging (minimum 1 minute). */
export function msToLogParts(ms: number): DurationParts {
	const totalMinutes = Math.max(1, Math.round(ms / 60_000));
	return {
		hours: Math.floor(totalMinutes / 60),
		minutes: totalMinutes % 60
	};
}

/** Duration credited when a presence check times out (15-minute blocks). */
export function msOnPresenceTimeout(startedAt: number, now = Date.now()): number {
	const elapsed = Math.max(0, now - startedAt);
	return Math.floor(elapsed / TIMER_CHECK_INTERVAL_MS) * TIMER_CHECK_INTERVAL_MS;
}

/** @deprecated Prefer formatDuration for display. */
export function formatHours(hours: number): string {
	return Number.isInteger(hours) ? String(hours) : hours.toFixed(2).replace(/\.?0+$/, '');
}

export function formatDate(iso: string): string {
	return parseDate(iso).format('ddd, D MMM');
}

/** Longer label for modals and confirmations. */
export function formatDateLong(iso: string): string {
	return parseDate(iso).format('dddd, D MMMM YYYY');
}

/** "Today" / "Yesterday" where it applies, otherwise a short date. */
export function dayLabel(iso: string, today: string = todayLocal()): string {
	const date = parseDate(iso);
	const ref = parseDate(today);

	if (date.isSame(ref, 'day')) return 'Today';
	if (date.isSame(ref.subtract(1, 'day'), 'day')) return 'Yesterday';

	return formatDate(iso);
}

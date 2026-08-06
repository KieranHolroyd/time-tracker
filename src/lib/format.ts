import { dayjs, parseDate, todayLocal } from '$lib/dayjs';

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

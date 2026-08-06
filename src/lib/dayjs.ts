import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import isoWeek from 'dayjs/plugin/isoWeek';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

dayjs.extend(customParseFormat);
dayjs.extend(isoWeek);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export const DATE_FORMAT = 'YYYY-MM-DD';

/** Parse a stored date string (YYYY-MM-DD) in local time. */
export function parseDate(value: string) {
	return dayjs(value, DATE_FORMAT, true);
}

/** True when value is a valid YYYY-MM-DD date. */
export function isValidDate(value: string): boolean {
	return parseDate(value).isValid();
}

/** Today's date as YYYY-MM-DD (local). */
export function todayLocal(): string {
	return dayjs().format(DATE_FORMAT);
}

/** Monday-based start of the current week as YYYY-MM-DD (local). */
export function weekStartLocal(): string {
	return dayjs().startOf('isoWeek').format(DATE_FORMAT);
}

/** Normalize user input to YYYY-MM-DD, or return today when empty. */
export function normalizeWorkedOn(value?: string): string {
	const trimmed = value?.trim();
	if (!trimmed) return todayLocal();

	const parsed = parseDate(trimmed);
	if (!parsed.isValid()) {
		throw new Error('Invalid date');
	}

	return parsed.format(DATE_FORMAT);
}

export { dayjs };

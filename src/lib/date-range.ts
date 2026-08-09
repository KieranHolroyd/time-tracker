import { DATE_FORMAT, dayjs, isValidDate, todayLocal } from '$lib/dayjs';

export type RangePresetId =
	| 'all'
	| 'this-week'
	| 'last-week'
	| 'this-month'
	| 'last-month'
	| 'last-30'
	| 'this-year'
	| 'custom';

/** `null` on either end means unbounded. */
export type DateRange = {
	from: string | null;
	to: string | null;
};

export const ALL_TIME: DateRange = { from: null, to: null };

export const RANGE_PRESETS: { id: RangePresetId; label: string }[] = [
	{ id: 'all', label: 'All time' },
	{ id: 'this-week', label: 'This week' },
	{ id: 'last-week', label: 'Last week' },
	{ id: 'this-month', label: 'This month' },
	{ id: 'last-month', label: 'Last month' },
	{ id: 'last-30', label: 'Last 30 days' },
	{ id: 'this-year', label: 'This year' },
	{ id: 'custom', label: 'Custom range' }
];

/**
 * Turn a preset into concrete dates. Weeks are Monday-based to match the app's
 * week summaries. `custom` resolves to all-time; the caller supplies the dates.
 */
export function resolveRange(preset: RangePresetId, today: string = todayLocal()): DateRange {
	const ref = dayjs(today, DATE_FORMAT, true);
	const iso = (value: dayjs.Dayjs) => value.format(DATE_FORMAT);

	switch (preset) {
		case 'this-week':
			return { from: iso(ref.startOf('isoWeek')), to: iso(ref.endOf('isoWeek')) };
		case 'last-week': {
			const start = ref.subtract(1, 'week').startOf('isoWeek');
			return { from: iso(start), to: iso(start.endOf('isoWeek')) };
		}
		case 'this-month':
			return { from: iso(ref.startOf('month')), to: iso(ref.endOf('month')) };
		case 'last-month': {
			const start = ref.subtract(1, 'month').startOf('month');
			return { from: iso(start), to: iso(start.endOf('month')) };
		}
		case 'last-30':
			return { from: iso(ref.subtract(29, 'day')), to: iso(ref) };
		case 'this-year':
			return { from: iso(ref.startOf('year')), to: iso(ref.endOf('year')) };
		case 'all':
		case 'custom':
		default:
			return ALL_TIME;
	}
}

/** Read a range off a URL, ignoring anything that isn't a valid date. */
export function rangeFromParams(params: URLSearchParams): DateRange {
	const from = params.get('from');
	const to = params.get('to');

	return {
		from: from && isValidDate(from) ? from : null,
		to: to && isValidDate(to) ? to : null
	};
}

export function isEmptyRange(range: DateRange): boolean {
	return range.from == null && range.to == null;
}

/** True when both ends are set and the range runs backwards. */
export function isReversedRange(range: DateRange): boolean {
	return range.from != null && range.to != null && range.from > range.to;
}

/** Compact slug for filenames, e.g. `2026-07-01-to-2026-07-31`. */
export function rangeSlug(range: DateRange): string | null {
	if (isEmptyRange(range)) return null;
	if (range.from && range.to) return `${range.from}-to-${range.to}`;
	return range.from ? `from-${range.from}` : `until-${range.to}`;
}

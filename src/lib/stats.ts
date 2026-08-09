import { parseDate } from '$lib/dayjs';
import type { TimeEntry } from '$lib/types';

/** One aggregated slice of time — a project, a month, a weekday. */
export type Bucket = {
	key: string;
	label: string;
	hours: number;
	entries: number;
	/** Fraction of the total, 0–1. Zero when nothing is logged. */
	share: number;
};

export type DayPeak = {
	date: string;
	hours: number;
};

export type EntryStats = {
	totalHours: number;
	entryCount: number;
	notedCount: number;
	/** Earliest and latest dates with an entry, in ISO form. */
	firstDate: string | null;
	lastDate: string | null;
	/** Calendar days covered by the range, inclusive. */
	spanDays: number;
	/** Distinct dates that have at least one entry. */
	daysWorked: number;
	averagePerDayWorked: number;
	averagePerCalendarDay: number;
	busiestDay: DayPeak | null;
	byProject: Bucket[];
	byMonth: Bucket[];
	byWeekday: Bucket[];
};

const WEEKDAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type Accumulator = { label: string; hours: number; entries: number };

function accumulate(
	entries: TimeEntry[],
	keyOf: (entry: TimeEntry) => { key: string; label: string }
): Map<string, Accumulator> {
	const buckets = new Map<string, Accumulator>();

	for (const entry of entries) {
		const { key, label } = keyOf(entry);
		const bucket = buckets.get(key) ?? { label, hours: 0, entries: 0 };
		bucket.hours += entry.hours;
		bucket.entries += 1;
		buckets.set(key, bucket);
	}

	return buckets;
}

function toBuckets(source: Map<string, Accumulator>, totalHours: number): Bucket[] {
	return [...source.entries()].map(([key, bucket]) => ({
		key,
		label: bucket.label,
		hours: bucket.hours,
		entries: bucket.entries,
		share: totalHours > 0 ? bucket.hours / totalHours : 0
	}));
}

function byHoursDescending(a: Bucket, b: Bucket): number {
	return b.hours - a.hours || a.label.localeCompare(b.label);
}

/**
 * Aggregate a set of entries along every axis the export reports on. Pure and
 * order-independent: callers may pass entries in any order.
 */
export function buildEntryStats(entries: TimeEntry[]): EntryStats {
	const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0);
	const notedCount = entries.filter((entry) => entry.comment?.trim()).length;

	const dates = entries.map((entry) => entry.worked_on).sort();
	const firstDate = dates[0] ?? null;
	const lastDate = dates[dates.length - 1] ?? null;

	const perDay = accumulate(entries, (entry) => ({
		key: entry.worked_on,
		label: entry.worked_on
	}));

	let busiestDay: DayPeak | null = null;
	for (const [date, bucket] of perDay) {
		if (!busiestDay || bucket.hours > busiestDay.hours) {
			busiestDay = { date, hours: bucket.hours };
		}
	}

	const daysWorked = perDay.size;
	const spanDays =
		firstDate && lastDate ? parseDate(lastDate).diff(parseDate(firstDate), 'day') + 1 : 0;

	const byWeekday = toBuckets(
		accumulate(entries, (entry) => {
			const date = parseDate(entry.worked_on);
			return { key: date.format('d'), label: date.format('dddd') };
		}),
		totalHours
	).sort((a, b) => WEEKDAY_ORDER.indexOf(a.label) - WEEKDAY_ORDER.indexOf(b.label));

	const byMonth = toBuckets(
		accumulate(entries, (entry) => {
			const date = parseDate(entry.worked_on);
			return { key: date.format('YYYY-MM'), label: date.format('MMM YYYY') };
		}),
		totalHours
	).sort((a, b) => a.key.localeCompare(b.key));

	const byProject = toBuckets(
		accumulate(entries, (entry) => ({
			key: String(entry.project_id),
			label: entry.project_name
		})),
		totalHours
	).sort(byHoursDescending);

	return {
		totalHours,
		entryCount: entries.length,
		notedCount,
		firstDate,
		lastDate,
		spanDays,
		daysWorked,
		averagePerDayWorked: daysWorked > 0 ? totalHours / daysWorked : 0,
		averagePerCalendarDay: spanDays > 0 ? totalHours / spanDays : 0,
		busiestDay,
		byProject,
		byMonth,
		byWeekday
	};
}

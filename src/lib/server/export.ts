import { ALL_TIME, isEmptyRange, rangeSlug, type DateRange } from '$lib/date-range';
import { billableAmount } from '$lib/earnings';
import {
	dayLabel,
	formatDateLong,
	formatDateMedium,
	formatDuration,
	formatMoney
} from '$lib/format';
import { buildEntryStats, type Bucket, type EntryStats } from '$lib/stats';
import type { Profile, ProfileSettings, TimeEntry } from '$lib/types';

type ExportOptions = {
	profile: Profile;
	/** Every entry in scope — stats cover all of them, notes only the commented ones. */
	entries: TimeEntry[];
	today: string;
	projectName?: string;
	settings?: ProfileSettings;
	/** The window that was asked for, which may be wider than the data found. */
	range?: DateRange;
};

/** Describes the requested window, which can be wider than the logged period. */
function describeRange(range: DateRange): string {
	if (range.from && range.to) {
		return range.from === range.to
			? formatDateMedium(range.from)
			: `${formatDateMedium(range.from)} – ${formatDateMedium(range.to)}`;
	}
	if (range.from) return `${formatDateMedium(range.from)} onwards`;
	if (range.to) return `up to ${formatDateMedium(range.to)}`;
	return 'All time';
}

const RULE_WIDTH = 60;
const HEAVY_RULE = '='.repeat(RULE_WIDTH);
const LIGHT_RULE = '-'.repeat(RULE_WIDTH);

type Column = {
	header: string;
	align?: 'left' | 'right';
};

/**
 * Render fixed-width columns for a monospaced text file. `footer` is separated
 * from the body by a rule so totals read as a distinct row.
 */
function renderTable(columns: Column[], rows: string[][], footer?: string[]): string[] {
	const all = footer ? [...rows, footer] : rows;
	const widths = columns.map((column, index) =>
		Math.max(column.header.length, ...all.map((row) => (row[index] ?? '').length))
	);

	const line = (cells: string[]) =>
		'  ' +
		columns
			.map((column, index) => {
				const cell = cells[index] ?? '';
				return column.align === 'right'
					? cell.padStart(widths[index])
					: cell.padEnd(widths[index]);
			})
			.join('   ')
			.trimEnd();

	const rule = '  ' + '-'.repeat(widths.reduce((sum, width) => sum + width, 0) + (widths.length - 1) * 3);

	const out = [line(columns.map((column) => column.header)), rule, ...rows.map(line)];
	if (footer) out.push(rule, line(footer));
	return out;
}

function labelledRows(pairs: [string, string][]): string[] {
	const width = Math.max(...pairs.map(([label]) => label.length));
	return pairs.map(([label, value]) => `  ${label.padEnd(width)}   ${value}`);
}

function percent(share: number): string {
	return `${(share * 100).toFixed(1)}%`;
}

function summarySection(stats: EntryStats, rate: number | null, currency: string): string[] {
	const pairs: [string, string][] = [];

	if (stats.firstDate && stats.lastDate) {
		// A single-day range already states its own length.
		pairs.push([
			'Period',
			stats.firstDate === stats.lastDate
				? formatDateMedium(stats.firstDate)
				: `${formatDateMedium(stats.firstDate)} – ${formatDateMedium(stats.lastDate)} (${stats.spanDays} days)`
		]);
	}

	pairs.push(
		['Days worked', String(stats.daysWorked)],
		['Entries', `${stats.entryCount} (${stats.notedCount} with notes)`],
		['Total logged', formatDuration(stats.totalHours)],
		['Average per working day', formatDuration(stats.averagePerDayWorked)]
	);

	if (stats.spanDays > stats.daysWorked) {
		pairs.push(['Average per calendar day', formatDuration(stats.averagePerCalendarDay)]);
	}

	if (stats.busiestDay) {
		pairs.push([
			'Busiest day',
			`${formatDateMedium(stats.busiestDay.date)} (${formatDuration(stats.busiestDay.hours)})`
		]);
	}

	const earned = billableAmount(stats.totalHours, rate);
	if (earned != null) {
		pairs.push(['Earnings', formatMoney(earned, currency)]);
		pairs.push(['Hourly rate', `${formatMoney(rate!, currency)} / hour`]);
	}

	return ['SUMMARY', '', ...labelledRows(pairs)];
}

function bucketTable(
	title: string,
	heading: string,
	buckets: Bucket[],
	rate: number | null,
	currency: string,
	options: { showShare?: boolean; totalLabel?: string } = {}
): string[] {
	if (buckets.length === 0) return [];

	const { showShare = true, totalLabel = 'Total' } = options;
	const showEarnings = rate != null && rate > 0;

	const columns: Column[] = [
		{ header: heading },
		{ header: 'Entries', align: 'right' },
		{ header: 'Hours', align: 'right' }
	];
	if (showShare) columns.push({ header: 'Share', align: 'right' });
	if (showEarnings) columns.push({ header: 'Earnings', align: 'right' });

	const rows = buckets.map((bucket) => {
		const row = [bucket.label, String(bucket.entries), formatDuration(bucket.hours)];
		if (showShare) row.push(percent(bucket.share));
		if (showEarnings) row.push(formatMoney(billableAmount(bucket.hours, rate) ?? 0, currency));
		return row;
	});

	const totalHours = buckets.reduce((sum, bucket) => sum + bucket.hours, 0);
	const totalEntries = buckets.reduce((sum, bucket) => sum + bucket.entries, 0);
	const footer = [totalLabel, String(totalEntries), formatDuration(totalHours)];
	if (showShare) footer.push(percent(totalHours > 0 ? 1 : 0));
	if (showEarnings) footer.push(formatMoney(billableAmount(totalHours, rate) ?? 0, currency));

	return [title, '', ...renderTable(columns, rows, footer)];
}

function entriesSection(
	entries: TimeEntry[],
	today: string,
	rate: number | null,
	currency: string
): string[] {
	if (entries.length === 0) {
		return ['ENTRIES', '', '  Nothing logged in this period.'];
	}

	const lines = ['ENTRIES'];

	const byProject = new Map<string, TimeEntry[]>();
	for (const entry of entries) {
		const group = byProject.get(entry.project_name) ?? [];
		group.push(entry);
		byProject.set(entry.project_name, group);
	}

	for (const [project, projectEntries] of byProject) {
		const projectHours = projectEntries.reduce((sum, entry) => sum + entry.hours, 0);
		lines.push(
			'',
			`## ${project} — ${formatDuration(projectHours)} across ${projectEntries.length} ${
				projectEntries.length === 1 ? 'entry' : 'entries'
			}`,
			''
		);

		const byDate = new Map<string, TimeEntry[]>();
		for (const entry of projectEntries) {
			const group = byDate.get(entry.worked_on) ?? [];
			group.push(entry);
			byDate.set(entry.worked_on, group);
		}

		for (const [date, dateEntries] of byDate) {
			const dayHours = dateEntries.reduce((sum, entry) => sum + entry.hours, 0);
			const earned = billableAmount(dayHours, rate);
			const dayTotal = earned == null
				? formatDuration(dayHours)
				: `${formatDuration(dayHours)} · ${formatMoney(earned, currency)}`;

			// dayLabel falls back to the date itself, so only prefix it when it reads
			// as something the full date doesn't already say.
			const relative = dayLabel(date, today);
			const heading =
				relative === 'Today' || relative === 'Yesterday'
					? `${relative}, ${formatDateLong(date)}`
					: formatDateLong(date);

			lines.push(`### ${heading} — ${dayTotal}`);
			for (const entry of dateEntries) {
				const note = entry.comment?.trim();
				// Unannotated hours still count towards every total above, so they are
				// listed too — just without a trailing note.
				lines.push(note ? `  • ${formatDuration(entry.hours)} — ${note}` : `  • ${formatDuration(entry.hours)}`);
			}
			lines.push('');
		}
	}

	return lines;
}

export function formatExport({
	profile,
	entries,
	today,
	projectName,
	settings,
	range = ALL_TIME
}: ExportOptions): string {
	const rate = settings?.hourly_rate ?? null;
	const currency = settings?.currency ?? 'GBP';
	const stats = buildEntryStats(entries);

	const sections: string[][] = [
		[
			`Hourmark — ${profile.name}`,
			projectName ? `Project: ${projectName}` : 'All projects',
			`Range: ${describeRange(range)}`,
			`Generated: ${formatDateLong(today)}`,
			'',
			HEAVY_RULE
		]
	];

	if (stats.entryCount === 0) {
		sections.push([
			isEmptyRange(range) ? 'No time logged yet.' : 'No time logged in this range.'
		]);
		return sections.flatMap((section) => [...section, '']).join('\n').trimEnd() + '\n';
	}

	sections.push(summarySection(stats, rate, currency));

	// A single-project export has nothing to compare against, so the split is noise.
	if (stats.byProject.length > 1) {
		sections.push(bucketTable('BY PROJECT', 'Project', stats.byProject, rate, currency));
	}

	if (stats.byMonth.length > 1) {
		sections.push(
			bucketTable('BY MONTH', 'Month', stats.byMonth, rate, currency, { showShare: true })
		);
	}

	if (stats.daysWorked > 1) {
		sections.push(
			bucketTable('BY WEEKDAY', 'Weekday', stats.byWeekday, rate, currency, {
				showShare: true
			})
		);
	}

	sections.push([LIGHT_RULE]);
	sections.push(entriesSection(entries, today, rate, currency));

	return sections.flatMap((section) => [...section, '']).join('\n').trimEnd() + '\n';
}

export function exportFilename(
	profile: Profile,
	projectName?: string,
	range: DateRange = ALL_TIME
): string {
	const slug = (projectName ?? 'all-notes')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
	// Naming by the range rather than the download date keeps repeat exports of the
	// same period from piling up as "file (1)".
	const period = rangeSlug(range) ?? new Date().toISOString().slice(0, 10);
	return `hourmark-${profile.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${slug}-${period}.txt`;
}

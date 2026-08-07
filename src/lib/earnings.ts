import { parseDate } from '$lib/dayjs';
import type { ProfileSettings, Summary } from '$lib/types';

export type WeekProgress = {
	logged: number;
	goal: number;
	percent: number;
	remaining: number;
};

export type EarningsSummary = {
	today: number | null;
	week: number | null;
	total: number | null;
	projectedWeekHours: number | null;
	projectedWeekEarnings: number | null;
	weekProgress: WeekProgress | null;
};

export function hasBillableRate(settings: ProfileSettings): boolean {
	return settings.hourly_rate != null && settings.hourly_rate > 0;
}

export function billableAmount(hours: number, hourlyRate: number | null): number | null {
	if (hourlyRate == null || hourlyRate <= 0 || hours <= 0) return null;
	return hours * hourlyRate;
}

export function weekProgress(weekHours: number, weeklyGoal: number | null): WeekProgress | null {
	if (weeklyGoal == null || weeklyGoal <= 0) return null;

	return {
		logged: weekHours,
		goal: weeklyGoal,
		percent: Math.min(100, (weekHours / weeklyGoal) * 100),
		remaining: Math.max(0, weeklyGoal - weekHours)
	};
}

/** Extrapolate this week's hours at the current daily pace (ISO week, Mon start). */
export function projectedWeekHours(weekHours: number, todayIso: string): number | null {
	if (weekHours <= 0) return null;

	const today = parseDate(todayIso);
	if (!today.isValid()) return null;

	const dayOfWeek = today.isoWeekday();
	if (dayOfWeek <= 0) return null;

	return (weekHours / dayOfWeek) * 7;
}

export function buildEarningsSummary(
	summary: Summary,
	settings: ProfileSettings,
	today: string
): EarningsSummary {
	const rate = settings.hourly_rate;
	const projectedWeekHoursValue = projectedWeekHours(summary.week, today);

	return {
		today: billableAmount(summary.today, rate),
		week: billableAmount(summary.week, rate),
		total: billableAmount(summary.total, rate),
		projectedWeekHours: projectedWeekHoursValue,
		projectedWeekEarnings: billableAmount(projectedWeekHoursValue ?? 0, rate),
		weekProgress: weekProgress(summary.week, settings.weekly_hours_goal)
	};
}

export function buildOverallEarningsSummary(
	overall: Summary,
	settings: ProfileSettings,
	today: string
): EarningsSummary {
	return buildEarningsSummary(overall, settings, today);
}

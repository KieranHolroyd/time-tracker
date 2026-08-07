import { SUPPORTED_CURRENCIES } from '$lib/constants';
import type { ProfileSettings } from '$lib/types';
import { ensureSchema } from './db';

const DEFAULT_SETTINGS: ProfileSettings = {
	hourly_rate: null,
	currency: 'GBP',
	weekly_hours_goal: null
};

function mapSettingsRow(row: Record<string, unknown>): ProfileSettings {
	const hourlyRate = row.hourly_rate;
	const weeklyGoal = row.weekly_hours_goal;

	return {
		hourly_rate:
			hourlyRate == null || hourlyRate === '' ? null : Number(hourlyRate),
		currency: String(row.currency ?? 'GBP'),
		weekly_hours_goal:
			weeklyGoal == null || weeklyGoal === '' ? null : Number(weeklyGoal)
	};
}

export async function getProfileSettings(profileId: number): Promise<ProfileSettings> {
	const db = await ensureSchema();
	const result = await db.execute({
		sql: 'SELECT hourly_rate, currency, weekly_hours_goal FROM profiles WHERE id = ?',
		args: [profileId]
	});

	if (result.rows.length === 0) return DEFAULT_SETTINGS;
	return mapSettingsRow(result.rows[0]);
}

export async function updateProfileSettings(
	profileId: number,
	input: ProfileSettings
): Promise<ProfileSettings> {
	const db = await ensureSchema();

	if (input.hourly_rate != null && (!Number.isFinite(input.hourly_rate) || input.hourly_rate < 0)) {
		throw new Error('Hourly rate must be zero or greater');
	}

	if (
		input.weekly_hours_goal != null &&
		(!Number.isFinite(input.weekly_hours_goal) || input.weekly_hours_goal <= 0)
	) {
		throw new Error('Weekly hours goal must be greater than zero');
	}

	const currency = input.currency.trim().toUpperCase();
	if (!currency) throw new Error('Currency is required');
	if (!SUPPORTED_CURRENCIES.includes(currency as (typeof SUPPORTED_CURRENCIES)[number])) {
		throw new Error('Unsupported currency');
	}

	const result = await db.execute({
		sql: `UPDATE profiles
			SET hourly_rate = ?, currency = ?, weekly_hours_goal = ?
			WHERE id = ?
			RETURNING hourly_rate, currency, weekly_hours_goal`,
		args: [input.hourly_rate, currency, input.weekly_hours_goal, profileId]
	});

	if (result.rows.length === 0) {
		throw new Error('Profile not found');
	}

	return mapSettingsRow(result.rows[0]);
}

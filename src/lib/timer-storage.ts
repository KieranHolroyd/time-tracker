import { TIMER_STORAGE_KEY } from '$lib/constants';

export type StoredTimer = {
	profileId: number;
	projectId: number;
	projectName: string;
	startedAt: number;
	nextCheckAt: number;
	awaitingCheck: boolean;
	checkDeadlineAt: number | null;
};

export function loadTimer(profileId: number): StoredTimer | null {
	if (typeof localStorage === 'undefined') return null;

	try {
		const raw = localStorage.getItem(TIMER_STORAGE_KEY);
		if (!raw) return null;

		const parsed = JSON.parse(raw) as StoredTimer;
		if (parsed.profileId !== profileId) return null;
		if (!parsed.projectId || !parsed.startedAt) return null;

		return parsed;
	} catch {
		return null;
	}
}

export function saveTimer(timer: StoredTimer): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timer));
}

export function clearTimerStorage(): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.removeItem(TIMER_STORAGE_KEY);
}

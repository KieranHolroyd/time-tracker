import { dayLabel, formatDateLong, formatHours } from '$lib/format';
import type { Profile, TimeEntry } from '$lib/types';

type ExportOptions = {
	profile: Profile;
	entries: TimeEntry[];
	today: string;
	projectName?: string;
};

export function formatNotesExport({ profile, entries, today, projectName }: ExportOptions): string {
	const lines: string[] = [
		`Hourmark — ${profile.name}`,
		projectName ? `Project: ${projectName}` : 'All projects',
		`Generated: ${formatDateLong(today)}`,
		'',
		'─'.repeat(48)
	];

	const withNotes = entries.filter((entry) => entry.comment?.trim());
	if (withNotes.length === 0) {
		lines.push('', 'No notes to export.');
		return lines.join('\n');
	}

	const byProject = new Map<string, TimeEntry[]>();
	for (const entry of withNotes) {
		const key = entry.project_name;
		const group = byProject.get(key) ?? [];
		group.push(entry);
		byProject.set(key, group);
	}

	for (const [project, projectEntries] of byProject) {
		lines.push('', `## ${project}`, '');

		const byDate = new Map<string, TimeEntry[]>();
		for (const entry of projectEntries) {
			const group = byDate.get(entry.worked_on) ?? [];
			group.push(entry);
			byDate.set(entry.worked_on, group);
		}

		for (const [date, dateEntries] of byDate) {
			lines.push(`### ${dayLabel(date, today)} (${formatDateLong(date)})`);
			for (const entry of dateEntries) {
				const hours = formatHours(entry.hours);
				lines.push(`  • ${hours}h — ${entry.comment!.trim()}`);
			}
			lines.push('');
		}
	}

	return lines.join('\n').trimEnd() + '\n';
}

export function exportFilename(profile: Profile, projectName?: string): string {
	const slug = (projectName ?? 'all-notes')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
	const date = new Date().toISOString().slice(0, 10);
	return `hourmark-${profile.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${slug}-${date}.txt`;
}

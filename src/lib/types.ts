export type Profile = {
	id: number;
	name: string;
	color: string;
	created_at: string;
};

export type Project = {
	id: number;
	name: string;
	color: string;
	created_at: string;
	archived_at: string | null;
};

export type ProjectWithStats = Project & {
	total_hours: number;
	today_hours: number;
	entry_count: number;
};

export type TimeEntry = {
	id: number;
	project_id: number;
	project_name: string;
	project_color: string;
	hours: number;
	worked_on: string;
	comment: string | null;
	created_at: string;
};

export type Summary = {
	today: number;
	week: number;
	total: number;
};

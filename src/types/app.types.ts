import type { User } from "@supabase/supabase-js";
import { Option, Schema } from "effect";
import type { Tables } from "./database.types";

// Database row types (aliases for convenience)
export type DbOrganization = Tables<"organizations">;
export type AttendanceRow = Tables<"attendance">;
export type AttendancePartial = Pick<AttendanceRow, "date_str" | "daily_hours">;
export type UserSettings = Tables<"user_settings">;

export const UserId = Schema.String.pipe(Schema.brand("@App/UserId"));
export type UserId = Schema.Schema.Type<typeof UserId>;

export const OrganizationId = Schema.String.pipe(Schema.brand("@App/OrganizationId"));
export type OrganizationId = Schema.Schema.Type<typeof OrganizationId>;

export type MarkedDateKey = `${number}-${number}-${number}`;

export interface Organization {
	readonly id: OrganizationId;
	readonly name: string;
	readonly hourly_rate: number;
	readonly daily_hours: number;
	readonly tds_percentage: Option.Option<number>;
	readonly user_id: UserId;
	readonly color: Option.Option<string>;
	readonly created_at: Option.Option<string>;
	readonly updated_at: Option.Option<string>;
}

export const organizationFromDb = (row: DbOrganization): Organization => ({
	id: row.id as OrganizationId,
	name: row.name,
	hourly_rate: row.hourly_rate ?? 0,
	daily_hours: row.daily_hours ?? 8,
	tds_percentage: Option.fromNullable(row.tds_percentage),
	user_id: row.user_id as UserId,
	color: Option.fromNullable(row.color),
	created_at: Option.fromNullable(row.created_at),
	updated_at: Option.fromNullable(row.updated_at),
});

// Nepali date
export interface NepaliDate {
	year: number;
	month: number; // 0-indexed (0 = Baisakh)
	day: number;
}

// Month info (from nepali-calendar utility)
export interface MonthInfo {
	year: number;
	month: number;
	startWeekday: number; // 0=Sun, 6=Sat
	daysInMonth: number;
}

// Monthly salary stats
export interface MonthlyStats {
	daysWorked: number;
	totalHours: number;
	totalSalary: number;
	grossSalary: number;
	tdsAmount: number;
	netSalary: number;
}

// Marked dates map: "YYYY-M-D" → daily_hours
export type MarkedDatesMap = Record<string, number>;

// Theme
export type Theme = "dark" | "light";

// App Context shape (for store.tsx)
export interface AppContextValue {
	viewYear: number;
	setViewYear: (year: number) => void;
	viewMonth: number;
	setViewMonth: (month: number) => void;

	hourlyRate: number;
	setHourlyRate: (val: number | "") => void;
	dailyHours: number;
	setDailyHours: (val: number) => void;
	tdsPercentage: Option.Option<number>;
	setTdsPercentage: (val: number | "") => void;

	markedDates: MarkedDatesMap;
	toggleDate: (year: number, month: number, day: number) => void;
	isMarked: (year: number, month: number, day: number) => boolean;
	resetData: () => void;
	forceLogout: () => void;

	globalAlert: Option.Option<string>;
	setGlobalAlert: (msg: Option.Option<string>) => void;
	globalConfirm: Option.Option<{ message: string; onConfirm: () => void }>;
	setGlobalConfirm: (config: Option.Option<{ message: string; onConfirm: () => void }>) => void;

	user: Option.Option<User>;
	loadingAuth: boolean;
	isSyncing: boolean;
	theme: Theme;
	toggleTheme: () => void;
	getMonthlyStats: () => MonthlyStats;
	currentDate: NepaliDate;

	organizations: Organization[];
	currentOrg: Option.Option<Organization>;
	switchOrganization: (orgId: OrganizationId) => void;
	addOrganization: (name: string) => void;
	updateOrganization: (id: OrganizationId, updates: Partial<DbOrganization>) => void;
	deleteOrganization: (id: OrganizationId) => void;
}

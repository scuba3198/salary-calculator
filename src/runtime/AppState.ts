import type { User } from "@supabase/supabase-js";
import { Option } from "effect";
import type {
	MarkedDatesMap,
	NepaliDate,
	Organization,
	OrganizationId,
	Theme,
	UserId,
} from "../types/app.types";
import { getCurrentDate } from "../utils/nepali-calendar";
import type { AppIntent } from "./AppIntent";

export interface AppState {
	// Auth
	readonly user: Option.Option<User>;
	readonly loadingAuth: boolean;

	// Organizations
	readonly organizations: ReadonlyArray<Organization>;
	readonly currentOrgId: Option.Option<OrganizationId>;

	// Attendance
	readonly markedDates: Readonly<MarkedDatesMap>;

	// Sync
	readonly isSyncing: boolean;

	// Calendar View
	readonly viewYear: number;
	readonly viewMonth: number;
	readonly currentDate: NepaliDate;

	// Theme
	readonly theme: Theme;

	// UI Modals (global)
	readonly globalAlert: Option.Option<string>;
	readonly globalConfirm: Option.Option<{
		readonly message: string;
		readonly intentOnConfirm: AppIntent;
	}>;
	readonly isInstallPromptVisible: boolean;
}

export const initialAppState: AppState = {
	user: Option.none(),
	loadingAuth: true,
	organizations: [
		{
			id: "guest" as OrganizationId,
			name: "Guest Workspace",
			hourly_rate: 500,
			daily_hours: 8,
			tds_percentage: Option.some(10),
			user_id: "" as UserId,
			color: Option.none(),
			created_at: Option.some(new Date().toISOString()),
			updated_at: Option.none(),
		},
	],
	currentOrgId: Option.some("guest" as OrganizationId),
	markedDates: {},
	isSyncing: false,
	viewYear: getCurrentDate().year,
	viewMonth: getCurrentDate().month,
	currentDate: getCurrentDate(),
	theme: "dark",
	globalAlert: Option.none(),
	globalConfirm: Option.none(),
	isInstallPromptVisible: false,
};

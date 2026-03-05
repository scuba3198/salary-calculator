import type { User } from "@supabase/supabase-js";
import type { MarkedDatesMap, NepaliDate, Organization, Theme } from "../types/app.types";
import { getCurrentDate } from "../utils/nepali-calendar";
import type { AppIntent } from "./AppIntent";

export interface AppState {
	// Auth
	readonly user: User | null;
	readonly loadingAuth: boolean;

	// Organizations
	readonly organizations: ReadonlyArray<Organization>;
	readonly currentOrgId: string | null;

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
	readonly globalAlert: string | null;
	readonly globalConfirm: {
		readonly message: string;
		readonly intentOnConfirm: AppIntent;
	} | null;
	readonly isInstallPromptVisible: boolean;
}

const savedOrgsRaw = JSON.parse(localStorage.getItem("organizations") || "[]");
const savedOrgs = Array.isArray(savedOrgsRaw)
	? savedOrgsRaw.map((org: Organization) => ({
		...org,
		hourly_rate: Math.max(org.hourly_rate || 0, org.id === "guest" ? 500 : 0),
	}))
	: [];

export const initialAppState: AppState = {
	user: null,
	loadingAuth: true,
	organizations: savedOrgs.length > 0
		? savedOrgs
		: [
			{
				id: "guest",
				name: "Guest Workspace",
				hourly_rate: 500,
				daily_hours: 8,
				tds_percentage: 10,
				user_id: "",
				color: null,
				created_at: new Date().toISOString(),
				updated_at: null,
			},
		],
	currentOrgId: localStorage.getItem("currentOrgId") || "guest",
	markedDates: JSON.parse(localStorage.getItem("markedDates") || "{}"),
	isSyncing: false,
	viewYear: getCurrentDate().year,
	viewMonth: getCurrentDate().month,
	currentDate: getCurrentDate(),
	theme: (localStorage.getItem("theme") as "light" | "dark") || "dark",
	globalAlert: null,
	globalConfirm: null,
	isInstallPromptVisible: false,
};

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

const savedOrgsRaw: unknown = JSON.parse(localStorage.getItem("organizations") || "[]");

const isOption = (u: unknown): u is Option.Option<unknown> => {
	if (typeof u !== "object" || u === null) return false;
	if (!("_tag" in u)) return false;
	const tag = (u as { readonly _tag?: unknown })._tag;
	return tag === "Some" || tag === "None";
};

const savedOrgs = Array.isArray(savedOrgsRaw)
	? savedOrgsRaw.map((org): Organization => {
			const row = org as Record<string, unknown>;
			const id = (row["id"] ?? "guest") as OrganizationId;

			const tdsRaw = row["tds_percentage"];
			const colorRaw = row["color"];
			const createdAtRaw = row["created_at"];
			const updatedAtRaw = row["updated_at"];

			return {
				id,
				name: String(row["name"] ?? "Workspace"),
				hourly_rate: Math.max(
					Number(row["hourly_rate"] ?? 0),
					id === ("guest" as OrganizationId) ? 500 : 0,
				),
				daily_hours: Number(row["daily_hours"] ?? 8),
				tds_percentage: isOption(tdsRaw)
					? (tdsRaw as Option.Option<number>)
					: Option.fromNullable(typeof tdsRaw === "number" ? tdsRaw : null),
				user_id: (row["user_id"] ?? "") as UserId,
				color: isOption(colorRaw)
					? (colorRaw as Option.Option<string>)
					: Option.fromNullable(typeof colorRaw === "string" ? colorRaw : null),
				created_at: isOption(createdAtRaw)
					? (createdAtRaw as Option.Option<string>)
					: Option.fromNullable(typeof createdAtRaw === "string" ? createdAtRaw : null),
				updated_at: isOption(updatedAtRaw)
					? (updatedAtRaw as Option.Option<string>)
					: Option.fromNullable(typeof updatedAtRaw === "string" ? updatedAtRaw : null),
			};
		})
	: [];

export const initialAppState: AppState = {
	user: Option.none(),
	loadingAuth: true,
	organizations:
		savedOrgs.length > 0
			? savedOrgs
			: [
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
	currentOrgId: Option.orElse(
		Option.fromNullable(localStorage.getItem("currentOrgId") as OrganizationId | null),
		() => Option.some("guest" as OrganizationId),
	),
	markedDates: JSON.parse(localStorage.getItem("markedDates") || "{}"),
	isSyncing: false,
	viewYear: getCurrentDate().year,
	viewMonth: getCurrentDate().month,
	currentDate: getCurrentDate(),
	theme: (localStorage.getItem("theme") as "light" | "dark") || "dark",
	globalAlert: Option.none(),
	globalConfirm: Option.none(),
	isInstallPromptVisible: false,
};

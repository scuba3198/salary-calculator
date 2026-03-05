import { Effect, SubscriptionRef } from "effect";
import type { Organization } from "../../types/app.types";
import type { AppState } from "../AppState";
import type { SupabaseService } from "../services/SupabaseService";

export const handleAddOrg = (
	name: string,
	stateRef: SubscriptionRef.SubscriptionRef<AppState>,
	supabase: SupabaseService,
) =>
	Effect.gen(function* () {
		const state = yield* SubscriptionRef.get(stateRef);
		if (!state.user || state.currentOrgId === "guest") return;

		const newOrg = yield* supabase.query<Organization>(
			"addOrg",
			supabase.client
				.from("organizations")
				.insert({
					user_id: state.user.id,
					name,
					hourly_rate: 0,
					daily_hours: 8,
					tds_percentage: null,
				})
				.select()
				.single(),
		);

		yield* SubscriptionRef.update(stateRef, (s) => ({
			...s,
			organizations: [...s.organizations, newOrg],
			currentOrgId: newOrg.id,
			markedDates: {}, // Force clear for new workspace
		}));
		localStorage.setItem("last_org_id", newOrg.id);
	});

export const handleSwitchOrg = (
	orgId: string,
	stateRef: SubscriptionRef.SubscriptionRef<AppState>,
	supabase: SupabaseService,
) =>
	Effect.gen(function* () {
		const state = yield* SubscriptionRef.get(stateRef);
		if (state.currentOrgId === orgId) return;

		yield* SubscriptionRef.update(stateRef, (s) => ({
			...s,
			currentOrgId: orgId,
			markedDates: {}, // Clear immediately while syncing
			isSyncing: true,
		}));
		localStorage.setItem("last_org_id", orgId);

		if (state.user && orgId !== "guest") {
			// Fetch Attendance for new org
			const attendance = yield* supabase.query<import("../../types/app.types").AttendancePartial[]>(
				"fetchAttendance",
				supabase.client
					.from("attendance")
					.select("date_str, daily_hours")
					.eq("organization_id", orgId),
			);

			const remoteDates: Record<string, number> = {};
			attendance.forEach((row) => {
				if (row.date_str) remoteDates[row.date_str] = row.daily_hours ?? 8;
			});

			yield* SubscriptionRef.update(stateRef, (s) => ({
				...s,
				markedDates: remoteDates,
				isSyncing: false,
			}));
		} else {
			yield* SubscriptionRef.update(stateRef, (s) => ({ ...s, isSyncing: false }));
		}
	});

export const handleDeleteOrg = (
	id: string,
	stateRef: SubscriptionRef.SubscriptionRef<AppState>,
	supabase: SupabaseService,
) =>
	Effect.gen(function* () {
		const state = yield* SubscriptionRef.get(stateRef);
		if (!state.user || state.currentOrgId === "guest") return;

		yield* supabase.query("deleteOrg", supabase.client.from("organizations").delete().eq("id", id));

		const stateAfterDelete = yield* SubscriptionRef.updateAndGet(stateRef, (s) => {
			const nextOrgs = s.organizations.filter((o) => o.id !== id);
			const nextId = s.currentOrgId === id ? (nextOrgs[0]?.id ?? null) : s.currentOrgId;
			return {
				...s,
				organizations: nextOrgs,
				currentOrgId: nextId,
				...(s.currentOrgId === id && {
					markedDates: {}, // Clear dates if active org was deleted
					isSyncing: !!nextId,
				}),
			};
		});

		// If we switched orgs due to deletion, fetch new attendance
		if (state.currentOrgId === id && stateAfterDelete.currentOrgId) {
			localStorage.setItem("last_org_id", stateAfterDelete.currentOrgId);

			const attendance = yield* supabase.query<import("../../types/app.types").AttendancePartial[]>(
				"fetchAttendance",
				supabase.client
					.from("attendance")
					.select("date_str, daily_hours")
					.eq("organization_id", stateAfterDelete.currentOrgId),
			);

			const remoteDates: Record<string, number> = {};
			attendance.forEach((row) => {
				if (row.date_str) remoteDates[row.date_str] = row.daily_hours ?? 8;
			});

			yield* SubscriptionRef.update(stateRef, (s) => ({
				...s,
				markedDates: remoteDates,
				isSyncing: false,
			}));
		}
	});

export const handleUpdateOrg = (
	id: string,
	updates: Partial<Organization>,
	stateRef: SubscriptionRef.SubscriptionRef<AppState>,
	supabase: SupabaseService,
) =>
	Effect.gen(function* () {
		const state = yield* SubscriptionRef.get(stateRef);

		// Update local immediately
		yield* SubscriptionRef.update(stateRef, (s) => ({
			...s,
			organizations: s.organizations.map((o) => (o.id === id ? { ...o, ...updates } : o)),
		}));

		if (!state.user || state.currentOrgId === "guest") return;

		yield* supabase.query(
			"updateOrg",
			supabase.client.from("organizations").update(updates).eq("id", id),
		);
	});

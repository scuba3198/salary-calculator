import { Effect, Option, SubscriptionRef } from "effect";
import type { DbOrganization, Organization, OrganizationId } from "../../types/app.types";
import { organizationFromDb } from "../../types/app.types";
import type { AppState } from "../AppState";
import type { SupabaseServiceApi } from "../services/SupabaseService";
import { LocalStorageService } from "../services/LocalStorageService";

export const handleAddOrg = (
	name: string,
	stateRef: SubscriptionRef.SubscriptionRef<AppState>,
	supabase: SupabaseServiceApi,
) =>
	Effect.gen(function* () {
		const state = yield* SubscriptionRef.get(stateRef);
		if (
			Option.isNone(state.user) ||
			Option.isNone(state.currentOrgId) ||
			state.currentOrgId.value === ("guest" as import("../../types/app.types").OrganizationId)
		)
			return;

		const newOrgRow = yield* supabase.query<DbOrganization>(
			"addOrg",
			supabase.client
				.from("organizations")
				.insert({
					user_id: state.user.value.id,
					name,
					hourly_rate: 0,
					daily_hours: 8,
					tds_percentage: null,
				})
				.select()
				.single(),
		);
		const newOrg = organizationFromDb(newOrgRow);

		yield* SubscriptionRef.update(stateRef, (s) => ({
			...s,
			organizations: [...s.organizations, newOrg],
			currentOrgId: Option.some(newOrg.id),
			markedDates: {}, // Force clear for new workspace
		}));
		const storage = yield* LocalStorageService;
		yield* storage.saveLastOrgId(newOrg.id).pipe(Effect.catchAll(() => Effect.void));
	});

export const handleSwitchOrg = (
	orgId: OrganizationId,
	stateRef: SubscriptionRef.SubscriptionRef<AppState>,
	supabase: SupabaseServiceApi,
) =>
	Effect.gen(function* () {
		const state = yield* SubscriptionRef.get(stateRef);
		if (Option.isSome(state.currentOrgId) && state.currentOrgId.value === orgId) return;

		yield* SubscriptionRef.update(stateRef, (s) => ({
			...s,
			currentOrgId: Option.some(orgId),
			markedDates: {}, // Clear immediately while syncing
			isSyncing: true,
		}));
		const storage = yield* LocalStorageService;
		yield* storage.saveLastOrgId(orgId).pipe(Effect.catchAll(() => Effect.void));

		if (
			Option.isSome(state.user) &&
			orgId !== ("guest" as import("../../types/app.types").OrganizationId)
		) {
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
	id: OrganizationId,
	stateRef: SubscriptionRef.SubscriptionRef<AppState>,
	supabase: SupabaseServiceApi,
) =>
	Effect.gen(function* () {
		const state = yield* SubscriptionRef.get(stateRef);
		if (
			Option.isNone(state.user) ||
			Option.isNone(state.currentOrgId) ||
			state.currentOrgId.value === ("guest" as import("../../types/app.types").OrganizationId)
		)
			return;

		yield* supabase.query("deleteOrg", supabase.client.from("organizations").delete().eq("id", id));

		const stateAfterDelete = yield* SubscriptionRef.updateAndGet(stateRef, (s) => {
			const nextOrgs = s.organizations.filter((o) => o.id !== id);
			const nextId =
				Option.isSome(s.currentOrgId) && s.currentOrgId.value === id
					? Option.fromNullable(nextOrgs[0]?.id ?? null)
					: s.currentOrgId;
			return {
				...s,
				organizations: nextOrgs,
				currentOrgId: nextId,
				...(Option.isSome(s.currentOrgId) &&
					s.currentOrgId.value === id && {
						markedDates: {}, // Clear dates if active org was deleted
						isSyncing: Option.isSome(nextId),
					}),
			};
		});

		// If we switched orgs due to deletion, fetch new attendance
		if (
			Option.isSome(state.currentOrgId) &&
			state.currentOrgId.value === id &&
			Option.isSome(stateAfterDelete.currentOrgId)
		) {
			const storage = yield* LocalStorageService;
			yield* storage
				.saveLastOrgId(stateAfterDelete.currentOrgId.value)
				.pipe(Effect.catchAll(() => Effect.void));

			const attendance = yield* supabase.query<import("../../types/app.types").AttendancePartial[]>(
				"fetchAttendance",
				supabase.client
					.from("attendance")
					.select("date_str, daily_hours")
					.eq("organization_id", stateAfterDelete.currentOrgId.value),
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
	id: OrganizationId,
	updates: Partial<Organization>,
	stateRef: SubscriptionRef.SubscriptionRef<AppState>,
	supabase: SupabaseServiceApi,
) =>
	Effect.gen(function* () {
		const state = yield* SubscriptionRef.get(stateRef);

		// Update local immediately
		yield* SubscriptionRef.update(stateRef, (s) => ({
			...s,
			organizations: s.organizations.map((o) => (o.id === id ? { ...o, ...updates } : o)),
		}));

		if (
			Option.isNone(state.user) ||
			Option.isNone(state.currentOrgId) ||
			state.currentOrgId.value === ("guest" as import("../../types/app.types").OrganizationId)
		)
			return;

		const dbUpdates: Partial<DbOrganization> = {};
		if (updates.name !== undefined) dbUpdates.name = updates.name;
		if (updates.hourly_rate !== undefined) dbUpdates.hourly_rate = updates.hourly_rate;
		if (updates.daily_hours !== undefined) dbUpdates.daily_hours = updates.daily_hours;
		if (updates.tds_percentage !== undefined) {
			dbUpdates.tds_percentage = Option.match(updates.tds_percentage, {
				onNone: () => null,
				onSome: (n) => n,
			});
		}
		if (updates.color !== undefined) {
			dbUpdates.color = Option.match(updates.color, { onNone: () => null, onSome: (c) => c });
		}

		yield* supabase.query(
			"updateOrg",
			supabase.client.from("organizations").update(dbUpdates).eq("id", id),
		);
	});

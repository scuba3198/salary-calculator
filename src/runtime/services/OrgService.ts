import { Effect, Option, SubscriptionRef } from "effect";
import type {
	AttendancePartial,
	DbOrganization,
	MarkedDatesMap,
	Organization,
	OrganizationId,
} from "../../types/app.types";
import { organizationFromDb } from "../../types/app.types";
import type { AppState } from "../AppState";
import { SupabaseService } from "./SupabaseService";
import { LocalStorageService } from "./LocalStorageService";

export class OrgService extends Effect.Service<OrgService>()("OrgService", {
	accessors: true,
	dependencies: [SupabaseService.Default, LocalStorageService.Default],
	effect: Effect.gen(function* () {
		const supabase = yield* SupabaseService;
		const localStorageService = yield* LocalStorageService;

		const addOrganization = Effect.fn("OrgService.addOrganization")(function* (
			name: string,
			stateRef: SubscriptionRef.SubscriptionRef<AppState>,
		) {
			const state = yield* SubscriptionRef.get(stateRef);
			const currentOrgId = Option.getOrUndefined(state.currentOrgId);
			if (Option.isNone(state.user) || currentOrgId === "guest" || !currentOrgId) return;

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
				markedDates: {},
			}));
			yield* localStorageService.saveLastOrgId(newOrg.id).pipe(Effect.catchAll(() => Effect.void));
		});

		const switchOrganization = Effect.fn("OrgService.switchOrganization")(function* (
			orgId: OrganizationId,
			stateRef: SubscriptionRef.SubscriptionRef<AppState>,
		) {
			const state = yield* SubscriptionRef.get(stateRef);
			const currentOrgId = Option.getOrUndefined(state.currentOrgId);
			if (currentOrgId === orgId) return;

			yield* SubscriptionRef.update(stateRef, (s) => ({
				...s,
				currentOrgId: Option.some(orgId),
				markedDates: {},
				isSyncing: true,
			}));
			yield* localStorageService.saveLastOrgId(orgId).pipe(Effect.catchAll(() => Effect.void));

			if (Option.isSome(state.user) && orgId !== "guest") {
				const attendance = yield* supabase.query<AttendancePartial[]>(
					"fetchAttendance",
					supabase.client
						.from("attendance")
						.select("date_str, daily_hours")
						.eq("organization_id", orgId),
				);

				const remoteDates = attendance.reduce<MarkedDatesMap>((acc, row) => {
					if (row.date_str) acc[row.date_str] = row.daily_hours ?? 8;
					return acc;
				}, {});

				yield* SubscriptionRef.update(stateRef, (s) => ({
					...s,
					markedDates: remoteDates,
					isSyncing: false,
				}));
			} else {
				yield* SubscriptionRef.update(stateRef, (s) => ({ ...s, isSyncing: false }));
			}
		});

		const deleteOrganization = Effect.fn("OrgService.deleteOrganization")(function* (
			id: OrganizationId,
			stateRef: SubscriptionRef.SubscriptionRef<AppState>,
		) {
			const state = yield* SubscriptionRef.get(stateRef);
			const currentOrgId = Option.getOrUndefined(state.currentOrgId);
			if (Option.isNone(state.user) || currentOrgId === "guest" || !currentOrgId) return;

			yield* supabase.query(
				"deleteOrg",
				supabase.client.from("organizations").delete().eq("id", id),
			);

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
							markedDates: {},
							isSyncing: Option.isSome(nextId),
						}),
				};
			});

			if (
				Option.isSome(state.currentOrgId) &&
				state.currentOrgId.value === id &&
				Option.isSome(stateAfterDelete.currentOrgId)
			) {
				yield* localStorageService
					.saveLastOrgId(stateAfterDelete.currentOrgId.value)
					.pipe(Effect.catchAll(() => Effect.void));
				const attendance = yield* supabase.query<AttendancePartial[]>(
					"fetchAttendance",
					supabase.client
						.from("attendance")
						.select("date_str, daily_hours")
						.eq("organization_id", stateAfterDelete.currentOrgId.value),
				);
				const remoteDates = attendance.reduce<MarkedDatesMap>((acc, row) => {
					if (row.date_str) acc[row.date_str] = row.daily_hours ?? 8;
					return acc;
				}, {});
				yield* SubscriptionRef.update(stateRef, (s) => ({
					...s,
					markedDates: remoteDates,
					isSyncing: false,
				}));
			}
		});

		const updateOrganization = Effect.fn("OrgService.updateOrganization")(function* (
			id: OrganizationId,
			updates: Partial<Organization>,
			stateRef: SubscriptionRef.SubscriptionRef<AppState>,
		) {
			const state = yield* SubscriptionRef.get(stateRef);
			const currentOrgId = Option.getOrUndefined(state.currentOrgId);

			yield* SubscriptionRef.update(stateRef, (s) => ({
				...s,
				organizations: s.organizations.map((o) => (o.id === id ? { ...o, ...updates } : o)),
			}));

			if (Option.isNone(state.user) || currentOrgId === "guest" || !currentOrgId) return;

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

		return { addOrganization, switchOrganization, deleteOrganization, updateOrganization };
	}),
}) {}

import { Effect, Option, SubscriptionRef } from "effect";
import type { AppState } from "../AppState";
import type { SupabaseServiceApi } from "../services/SupabaseService";

export const handleToggleDate = (
	year: number,
	month: number,
	day: number,
	stateRef: SubscriptionRef.SubscriptionRef<AppState>,
	supabase: SupabaseServiceApi,
) =>
	Effect.gen(function* () {
		const state = yield* SubscriptionRef.get(stateRef);
		const currentOrgId = Option.getOrUndefined(state.currentOrgId);
		if (!currentOrgId || state.isSyncing) return;

		const dateKey = `${year}-${month + 1}-${day}`;
		const isAdding = !state.markedDates[dateKey];
		const currentOrg = state.organizations.find((o) => o.id === currentOrgId);
		const hours = currentOrg?.daily_hours ?? 8;

		// Optimistic update
		yield* SubscriptionRef.update(stateRef, (s) => {
			const nextDates = { ...s.markedDates };
			if (isAdding) {
				nextDates[dateKey] = hours;
			} else {
				delete nextDates[dateKey];
			}
			return { ...s, markedDates: nextDates };
		});

		// Remote sync (only if not guest)
		if (
			Option.isNone(state.user) ||
			currentOrgId === ("guest" as import("../../types/app.types").OrganizationId)
		)
			return;

		const syncEffect = isAdding
			? supabase.query(
					"addAttendance",
					supabase.client.from("attendance").insert({
						user_id: state.user.value.id,
						organization_id: currentOrgId,
						date_str: dateKey,
						daily_hours: hours,
					}),
				)
			: supabase.query(
					"removeAttendance",
					supabase.client
						.from("attendance")
						.delete()
						.eq("organization_id", currentOrgId)
						.eq("date_str", dateKey),
				);

		yield* syncEffect.pipe(
			Effect.catchTags({
				SupabaseNetworkError: () =>
					// Rollback
					SubscriptionRef.update(stateRef, (s) => {
						const nextDates = { ...s.markedDates };
						if (isAdding) {
							delete nextDates[dateKey];
						} else {
							nextDates[dateKey] = hours;
						}
						return { ...s, markedDates: nextDates };
					}),
				SupabaseQueryError: () =>
					// Rollback
					SubscriptionRef.update(stateRef, (s) => {
						const nextDates = { ...s.markedDates };
						if (isAdding) {
							delete nextDates[dateKey];
						} else {
							nextDates[dateKey] = hours;
						}
						return { ...s, markedDates: nextDates };
					}),
			}),
		);
	});

export const handleResetData = (
	stateRef: SubscriptionRef.SubscriptionRef<AppState>,
	supabase: SupabaseServiceApi,
) =>
	Effect.gen(function* () {
		const state = yield* SubscriptionRef.get(stateRef);
		const currentOrgId = Option.getOrUndefined(state.currentOrgId);
		if (!currentOrgId || state.isSyncing) return;

		// Optimistic clear
		yield* SubscriptionRef.update(stateRef, (s) => ({ ...s, markedDates: {} }));

		if (
			Option.isNone(state.user) ||
			currentOrgId === ("guest" as import("../../types/app.types").OrganizationId)
		)
			return;

		yield* supabase
			.query(
				"resetAttendance",
				supabase.client.from("attendance").delete().eq("organization_id", currentOrgId),
			)
			.pipe(
				Effect.catchTags({
					SupabaseNetworkError: () => Effect.void,
					SupabaseQueryError: () => Effect.void,
				}),
			);
	});

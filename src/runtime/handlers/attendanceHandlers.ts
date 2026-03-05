import { Effect, SubscriptionRef } from "effect";
import type { AppState } from "../AppState";
import type { SupabaseService } from "../services/SupabaseService";

export const handleToggleDate = (
	year: number,
	month: number,
	day: number,
	stateRef: SubscriptionRef.SubscriptionRef<AppState>,
	supabase: SupabaseService,
) =>
	Effect.gen(function* () {
		const state = yield* SubscriptionRef.get(stateRef);
		if (!state.currentOrgId || state.isSyncing) return;

		const dateKey = `${year}-${month + 1}-${day}`;
		const isAdding = !state.markedDates[dateKey];
		const currentOrg = state.organizations.find((o) => o.id === state.currentOrgId);
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
		if (!state.user || state.currentOrgId === "guest") return;

		const syncEffect = isAdding
			? supabase.query(
					"addAttendance",
					supabase.client.from("attendance").insert({
						user_id: state.user.id,
						organization_id: state.currentOrgId,
						date_str: dateKey,
						daily_hours: hours,
					}),
				)
			: supabase.query(
					"removeAttendance",
					supabase.client
						.from("attendance")
						.delete()
						.eq("organization_id", state.currentOrgId)
						.eq("date_str", dateKey),
				);

		yield* syncEffect.pipe(
			Effect.catchAll(() =>
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
			),
		);
	});

export const handleResetData = (
	stateRef: SubscriptionRef.SubscriptionRef<AppState>,
	supabase: SupabaseService,
) =>
	Effect.gen(function* () {
		const state = yield* SubscriptionRef.get(stateRef);
		if (!state.currentOrgId || state.isSyncing) return;

		// Optimistic clear
		yield* SubscriptionRef.update(stateRef, (s) => ({ ...s, markedDates: {} }));

		if (!state.user || state.currentOrgId === "guest") return;

		yield* supabase
			.query(
				"resetAttendance",
				supabase.client.from("attendance").delete().eq("organization_id", state.currentOrgId),
			)
			.pipe(
				Effect.catchAll(
					() =>
						// Failure handled silently here, user sees reset UI
						Effect.void,
				),
			);
	});

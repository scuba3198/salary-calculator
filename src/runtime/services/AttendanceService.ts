import { Effect, Option, SubscriptionRef } from "effect";
import type { AppState } from "../AppState";
import { SupabaseService } from "./SupabaseService";

export class AttendanceService extends Effect.Service<AttendanceService>()("AttendanceService", {
	accessors: true,
	dependencies: [SupabaseService.Default],
	effect: Effect.gen(function* () {
		const supabase = yield* SupabaseService;

		const toggleDate = Effect.fn("AttendanceService.toggleDate")(function* (
			year: number,
			month: number,
			day: number,
			stateRef: SubscriptionRef.SubscriptionRef<AppState>,
		) {
			const state = yield* SubscriptionRef.get(stateRef);
			const currentOrgId = Option.getOrUndefined(state.currentOrgId);
			if (!currentOrgId || state.isSyncing) return;

			const dateKey = `${year}-${month + 1}-${day}`;
			const isAdding = !state.markedDates[dateKey];
			const currentOrg = state.organizations.find((o) => o.id === currentOrgId);
			const hours = currentOrg?.daily_hours ?? 8;

			yield* SubscriptionRef.update(stateRef, (s) => {
				const nextDates = { ...s.markedDates };
				if (isAdding) nextDates[dateKey] = hours;
				else delete nextDates[dateKey];
				return { ...s, markedDates: nextDates };
			});

			if (Option.isNone(state.user) || currentOrgId === "guest") return;

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
						SubscriptionRef.update(stateRef, (s) => {
							const nextDates = { ...s.markedDates };
							if (isAdding) delete nextDates[dateKey];
							else nextDates[dateKey] = hours;
							return { ...s, markedDates: nextDates };
						}),
					SupabaseQueryError: () =>
						SubscriptionRef.update(stateRef, (s) => {
							const nextDates = { ...s.markedDates };
							if (isAdding) delete nextDates[dateKey];
							else nextDates[dateKey] = hours;
							return { ...s, markedDates: nextDates };
						}),
				}),
			);
		});

		const resetData = Effect.fn("AttendanceService.resetData")(function* (
			stateRef: SubscriptionRef.SubscriptionRef<AppState>,
		) {
			const state = yield* SubscriptionRef.get(stateRef);
			const currentOrgId = Option.getOrUndefined(state.currentOrgId);
			if (!currentOrgId || state.isSyncing) return;

			yield* SubscriptionRef.update(stateRef, (s) => ({ ...s, markedDates: {} }));

			if (Option.isNone(state.user) || currentOrgId === "guest") return;

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

		return { toggleDate, resetData };
	}),
}) {}

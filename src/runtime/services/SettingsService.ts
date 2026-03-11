import { Effect, Option, SubscriptionRef } from "effect";
import type { AppState } from "../AppState";
import { SupabaseService } from "./SupabaseService";

export class SettingsService extends Effect.Service<SettingsService>()("SettingsService", {
	accessors: true,
	dependencies: [SupabaseService.Default],
	effect: Effect.gen(function* () {
		const supabase = yield* SupabaseService;

		const setHourlyRate = Effect.fn("SettingsService.setHourlyRate")(function* (
			value: number | "",
			stateRef: SubscriptionRef.SubscriptionRef<AppState>,
		) {
			const state = yield* SubscriptionRef.get(stateRef);
			const currentOrgId = Option.getOrUndefined(state.currentOrgId);
			if (!currentOrgId) return;

			yield* SubscriptionRef.update(stateRef, (s) => ({
				...s,
				organizations: s.organizations.map((o) =>
					Option.isSome(s.currentOrgId) && o.id === s.currentOrgId.value
						? { ...o, hourly_rate: value === "" ? 0 : value }
						: o,
				),
			}));

			if (Option.isSome(state.user) && currentOrgId !== "guest") {
				yield* supabase.query(
					"updateHourlyRate",
					supabase.client
						.from("organizations")
						.update({ hourly_rate: value === "" ? 0 : value })
						.eq("id", currentOrgId),
				);
			}
		});

		const setDailyHours = Effect.fn("SettingsService.setDailyHours")(function* (
			value: number | "",
			stateRef: SubscriptionRef.SubscriptionRef<AppState>,
		) {
			const state = yield* SubscriptionRef.get(stateRef);
			const currentOrgId = Option.getOrUndefined(state.currentOrgId);
			if (!currentOrgId) return;

			yield* SubscriptionRef.update(stateRef, (s) => ({
				...s,
				organizations: s.organizations.map((o) =>
					Option.isSome(s.currentOrgId) && o.id === s.currentOrgId.value
						? { ...o, daily_hours: value === "" ? 0 : value }
						: o,
				),
			}));

			if (Option.isSome(state.user) && currentOrgId !== "guest") {
				yield* supabase.query(
					"updateDailyHours",
					supabase.client
						.from("organizations")
						.update({ daily_hours: value === "" ? 0 : value })
						.eq("id", currentOrgId),
				);
			}
		});

		const setTdsPercentage = Effect.fn("SettingsService.setTdsPercentage")(function* (
			value: number | "",
			stateRef: SubscriptionRef.SubscriptionRef<AppState>,
		) {
			const state = yield* SubscriptionRef.get(stateRef);
			const currentOrgId = Option.getOrUndefined(state.currentOrgId);
			if (!currentOrgId) return;

			yield* SubscriptionRef.update(stateRef, (s) => ({
				...s,
				organizations: s.organizations.map((o) =>
					Option.isSome(s.currentOrgId) && o.id === s.currentOrgId.value
						? { ...o, tds_percentage: value === "" ? Option.none() : Option.some(value) }
						: o,
				),
			}));

			if (Option.isSome(state.user) && currentOrgId !== "guest") {
				yield* supabase.query(
					"updateTds",
					supabase.client
						.from("organizations")
						.update({ tds_percentage: value === "" ? null : value })
						.eq("id", currentOrgId),
				);
			}
		});

		return { setHourlyRate, setDailyHours, setTdsPercentage };
	}),
}) {}

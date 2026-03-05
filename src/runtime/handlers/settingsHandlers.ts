import { Effect, SubscriptionRef } from "effect";
import type { AppState } from "../AppState";
import type { SupabaseService } from "../services/SupabaseService";

export const handleSetHourlyRate = (
	value: number | "",
	stateRef: SubscriptionRef.SubscriptionRef<AppState>,
	supabase: SupabaseService,
) =>
	Effect.gen(function* () {
		const state = yield* SubscriptionRef.get(stateRef);
		if (!state.currentOrgId) return;

		yield* SubscriptionRef.update(stateRef, (s) => ({
			...s,
			organizations: s.organizations.map((o) =>
				o.id === s.currentOrgId ? { ...o, hourly_rate: value === "" ? 0 : value } : o,
			),
		}));

		if (state.user && state.currentOrgId !== "guest") {
			yield* supabase.query(
				"updateHourlyRate",
				supabase.client
					.from("organizations")
					.update({ hourly_rate: value === "" ? 0 : value })
					.eq("id", state.currentOrgId),
			);
		}
	});

export const handleSetDailyHours = (
	value: number,
	stateRef: SubscriptionRef.SubscriptionRef<AppState>,
	supabase: SupabaseService,
) =>
	Effect.gen(function* () {
		const state = yield* SubscriptionRef.get(stateRef);
		if (!state.currentOrgId) return;

		yield* SubscriptionRef.update(stateRef, (s) => ({
			...s,
			organizations: s.organizations.map((o) =>
				o.id === s.currentOrgId ? { ...o, daily_hours: value } : o,
			),
		}));

		if (state.user && state.currentOrgId !== "guest") {
			yield* supabase.query(
				"updateDailyHours",
				supabase.client
					.from("organizations")
					.update({ daily_hours: value })
					.eq("id", state.currentOrgId),
			);
		}
	});

export const handleSetTdsPercentage = (
	value: number | "",
	stateRef: SubscriptionRef.SubscriptionRef<AppState>,
	supabase: SupabaseService,
) =>
	Effect.gen(function* () {
		const state = yield* SubscriptionRef.get(stateRef);
		if (!state.currentOrgId) return;

		yield* SubscriptionRef.update(stateRef, (s) => ({
			...s,
			organizations: s.organizations.map((o) =>
				o.id === s.currentOrgId ? { ...o, tds_percentage: value === "" ? null : value } : o,
			),
		}));

		if (state.user && state.currentOrgId !== "guest") {
			yield* supabase.query(
				"updateTds",
				supabase.client
					.from("organizations")
					.update({ tds_percentage: value === "" ? null : value })
					.eq("id", state.currentOrgId),
			);
		}
	});

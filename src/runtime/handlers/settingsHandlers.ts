import { Effect, Option, SubscriptionRef } from "effect";
import type { AppState } from "../AppState";
import type { SupabaseServiceApi } from "../services/SupabaseService";

export const handleSetHourlyRate = (
	value: number | "",
	stateRef: SubscriptionRef.SubscriptionRef<AppState>,
	supabase: SupabaseServiceApi,
) =>
	Effect.gen(function* () {
		const state = yield* SubscriptionRef.get(stateRef);
		if (Option.isNone(state.currentOrgId)) return;

		yield* SubscriptionRef.update(stateRef, (s) => ({
			...s,
			organizations: s.organizations.map((o) =>
				Option.isSome(s.currentOrgId) && o.id === s.currentOrgId.value
					? { ...o, hourly_rate: value === "" ? 0 : value }
					: o,
			),
		}));

		if (
			Option.isSome(state.user) &&
			state.currentOrgId.value !== ("guest" as import("../../types/app.types").OrganizationId)
		) {
			yield* supabase.query(
				"updateHourlyRate",
				supabase.client
					.from("organizations")
					.update({ hourly_rate: value === "" ? 0 : value })
					.eq("id", state.currentOrgId.value),
			);
		}
	});

export const handleSetDailyHours = (
	value: number | "",
	stateRef: SubscriptionRef.SubscriptionRef<AppState>,
	supabase: SupabaseServiceApi,
) =>
	Effect.gen(function* () {
		const state = yield* SubscriptionRef.get(stateRef);
		if (Option.isNone(state.currentOrgId)) return;

		yield* SubscriptionRef.update(stateRef, (s) => ({
			...s,
			organizations: s.organizations.map((o) =>
				Option.isSome(s.currentOrgId) && o.id === s.currentOrgId.value
					? { ...o, daily_hours: value === "" ? 0 : value }
					: o,
			),
		}));

		if (
			Option.isSome(state.user) &&
			state.currentOrgId.value !== ("guest" as import("../../types/app.types").OrganizationId)
		) {
			yield* supabase.query(
				"updateDailyHours",
				supabase.client
					.from("organizations")
					.update({ daily_hours: value === "" ? 0 : value })
					.eq("id", state.currentOrgId.value),
			);
		}
	});

export const handleSetTdsPercentage = (
	value: number | "",
	stateRef: SubscriptionRef.SubscriptionRef<AppState>,
	supabase: SupabaseServiceApi,
) =>
	Effect.gen(function* () {
		const state = yield* SubscriptionRef.get(stateRef);
		if (Option.isNone(state.currentOrgId)) return;

		yield* SubscriptionRef.update(stateRef, (s) => ({
			...s,
			organizations: s.organizations.map((o) =>
				Option.isSome(s.currentOrgId) && o.id === s.currentOrgId.value
					? { ...o, tds_percentage: value === "" ? Option.none() : Option.some(value) }
					: o,
			),
		}));

		if (
			Option.isSome(state.user) &&
			state.currentOrgId.value !== ("guest" as import("../../types/app.types").OrganizationId)
		) {
			yield* supabase.query(
				"updateTds",
				supabase.client
					.from("organizations")
					.update({ tds_percentage: value === "" ? null : value })
					.eq("id", state.currentOrgId.value),
			);
		}
	});

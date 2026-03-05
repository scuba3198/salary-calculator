import type { User } from "@supabase/supabase-js";
import { Effect, Fiber, pipe, Ref, SubscriptionRef } from "effect";
import type { MarkedDatesMap, Organization, Theme } from "../../types/app.types";
import { type AppState } from "../AppState";
import type { AuthService } from "../services/AuthService";
import type { SupabaseService } from "../services/SupabaseService";

export const handleAuthChanged = (
	user: User | null,
	stateRef: SubscriptionRef.SubscriptionRef<AppState>,
	syncFiberRef: Ref.Ref<Fiber.RuntimeFiber<void, unknown> | null>,
	supabase: SupabaseService,
) =>
	Effect.gen(function* () {
		// 1. Interrupt any running sync fiber
		const oldFiber = yield* Ref.get(syncFiberRef);
		if (oldFiber) {
			yield* Fiber.interrupt(oldFiber);
			yield* Ref.set(syncFiberRef, null);
		}

		if (!user) {
			// Guest Mode
			yield* SubscriptionRef.update(stateRef, (s) => {
				const savedOrgsRaw = JSON.parse(localStorage.getItem("organizations") || "[]");
				const savedOrgs = Array.isArray(savedOrgsRaw)
					? savedOrgsRaw.map((org: Organization) => ({
						...org,
						hourly_rate: Math.max(org.hourly_rate || 0, org.id === "guest" ? 500 : 0),
					}))
					: [];

				return {
					...s,
					user: null,
					loadingAuth: false,
					organizations: savedOrgs.length > 0
						? savedOrgs
						: [
							{
								id: "guest",
								name: "Guest Workspace",
								hourly_rate: 500,
								daily_hours: 8,
								tds_percentage: 10,
								user_id: "",
								color: null,
								created_at: new Date().toISOString(),
								updated_at: null,
							} as Organization,
						],
					currentOrgId: localStorage.getItem("currentOrgId") || "guest",
					markedDates: {},
				};
			});
		} else {
			// Authenticated Mode
			yield* SubscriptionRef.update(stateRef, (s) => ({
				...s,
				user,
				isSyncing: true,
				loadingAuth: true,
			}));

			// Fork a NEW sync fiber
			const newFiber = yield* pipe(
				loadUserData(user.id, stateRef, supabase),
				Effect.ensuring(
					SubscriptionRef.update(stateRef, (s) => ({
						...s,
						isSyncing: false,
						loadingAuth: false,
					})),
				),
				Effect.interruptible,
				Effect.fork,
			);
			yield* Ref.set(syncFiberRef, newFiber);
		}
	});

const loadUserData = (
	userId: string,
	stateRef: SubscriptionRef.SubscriptionRef<AppState>,
	supabase: SupabaseService,
) =>
	Effect.gen(function* () {
		// Fetch Orgs
		const orgs = yield* supabase.query<Organization[]>(
			"fetchOrgs",
			supabase.client
				.from("organizations")
				.select("*")
				.eq("user_id", userId)
				.order("created_at", { ascending: true }),
		);

		const savedId = localStorage.getItem("last_org_id");
		const activeId = orgs.find((o) => o.id === savedId)?.id ?? orgs[0]?.id ?? null;

		const { finalOrgs, finalActiveId } = yield* (orgs.length === 0
			? Effect.gen(function* () {
				const newOrg = yield* supabase.query<Organization>(
					"createInitialOrg",
					supabase.client
						.from("organizations")
						.insert({
							user_id: userId,
							name: "Primary Job",
							hourly_rate: 0,
							daily_hours: 8,
							tds_percentage: null,
						})
						.select()
						.single(),
				);
				return { finalOrgs: [newOrg], finalActiveId: newOrg.id as string | null };
			})
			: Effect.succeed({ finalOrgs: orgs, finalActiveId: activeId }));

		yield* SubscriptionRef.update(stateRef, (s) => ({
			...s,
			organizations: finalOrgs,
			currentOrgId: finalActiveId,
		}));

		if (finalActiveId) {
			localStorage.setItem("last_org_id", finalActiveId);

			// Fetch Attendance
			const attendance = yield* supabase.query<import("../../types/app.types").AttendancePartial[]>(
				"fetchAttendance",
				supabase.client
					.from("attendance")
					.select("date_str, daily_hours")
					.eq("organization_id", finalActiveId),
			);

			const remoteDates = attendance.reduce<MarkedDatesMap>((acc, row) => {
				if (row.date_str) {
					acc[row.date_str] = row.daily_hours ?? 8;
				}
				return acc;
			}, {});

			yield* SubscriptionRef.update(stateRef, (s) => ({
				...s,
				markedDates: remoteDates,
			}));
		}

		// Theme
		const settings = yield* supabase
			.query<{ theme: string | null }>(
				"fetchSettings",
				supabase.client.from("user_settings").select("theme").eq("user_id", userId).single(),
			)
			.pipe(Effect.catchAll(() => Effect.succeed({ theme: null })));

		if (settings?.theme) {
			yield* SubscriptionRef.update(stateRef, (s) => ({
				...s,
				theme: settings.theme as Theme,
			}));
		}
	});

export const handleForceLogout = (authService: AuthService) =>
	Effect.gen(function* () {
		yield* authService.signOut;
	});

export const handleLogin = (
	email: string,
	password: string,
	auth: AuthService,
	stateRef: SubscriptionRef.SubscriptionRef<AppState>,
) =>
	Effect.gen(function* () {
		yield* SubscriptionRef.update(stateRef, (s) => ({ ...s, loadingAuth: true }));
		yield* auth.signIn(email, password).pipe(
			Effect.catchAll((err) =>
				SubscriptionRef.update(stateRef, (s) => ({
					...s,
					globalAlert: err.message,
					loadingAuth: false,
				})),
			),
		);
	});

export const handleSignUp = (
	email: string,
	password: string,
	fullName: string,
	auth: AuthService,
	stateRef: SubscriptionRef.SubscriptionRef<AppState>,
) =>
	Effect.gen(function* () {
		yield* SubscriptionRef.update(stateRef, (s) => ({ ...s, loadingAuth: true }));
		yield* auth.signUp(email, password, fullName).pipe(
			Effect.catchAll((err) =>
				SubscriptionRef.update(stateRef, (s) => ({
					...s,
					globalAlert: err.message,
					loadingAuth: false,
				})),
			),
		);
	});

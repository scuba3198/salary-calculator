import type { User } from "@supabase/supabase-js";
import { Effect, Fiber, Option, pipe, Ref, SubscriptionRef } from "effect";
import type {
	DbOrganization,
	MarkedDatesMap,
	Organization,
	OrganizationId,
	Theme,
	UserId,
} from "../../types/app.types";
import { organizationFromDb } from "../../types/app.types";
import type { AppState } from "../AppState";
import type { AuthServiceApi } from "../services/AuthService";
import type { SupabaseServiceApi } from "../services/SupabaseService";
import { LocalStorageService } from "../services/LocalStorageService";

export const handleAuthChanged = (
	user: User | null,
	stateRef: SubscriptionRef.SubscriptionRef<AppState>,
	syncFiberRef: Ref.Ref<Fiber.RuntimeFiber<void, unknown> | null>,
	supabase: SupabaseServiceApi,
) =>
	Effect.gen(function* () {
		// 1. Interrupt any running sync fiber
		const oldFiber = yield* Ref.get(syncFiberRef);
		if (oldFiber) {
			yield* Fiber.interrupt(oldFiber);
			yield* Ref.set(syncFiberRef, null);
		}

		if (!user) {
			// Guest Mode - load guest state from LocalStorageService
			const storage = yield* LocalStorageService;
			const savedOrgs = yield* storage.loadOrganizations.pipe(
				Effect.catchAll(() => Effect.succeed<Organization[]>([])),
			);
			const storedCurrentOrgId = yield* storage.loadCurrentOrgId.pipe(
				Effect.catchAll(() => Effect.succeed(Option.none<OrganizationId>())),
			);

			yield* SubscriptionRef.update(stateRef, (s) => {
				const organizations =
					savedOrgs.length > 0
						? savedOrgs
						: [
								{
									id: "guest" as OrganizationId,
									name: "Guest Workspace",
									hourly_rate: 500,
									daily_hours: 8,
									tds_percentage: Option.some(10),
									user_id: "" as UserId,
									color: Option.none(),
									created_at: Option.some(new Date().toISOString()),
									updated_at: Option.none(),
								} as Organization,
							];

				const currentOrgId =
					Option.isSome(storedCurrentOrgId) &&
					organizations.some((o) => o.id === storedCurrentOrgId.value)
						? storedCurrentOrgId
						: Option.some("guest" as OrganizationId);

				return {
					...s,
					user: Option.none(),
					loadingAuth: false,
					organizations,
					currentOrgId,
					markedDates: {},
				};
			});
		} else {
			// Authenticated Mode
			yield* SubscriptionRef.update(stateRef, (s) => ({
				...s,
				user: Option.some(user),
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
	supabase: SupabaseServiceApi,
) =>
	Effect.gen(function* () {
		// Fetch Orgs
		const orgRows = yield* supabase.query<DbOrganization[]>(
			"fetchOrgs",
			supabase.client
				.from("organizations")
				.select("*")
				.eq("user_id", userId)
				.order("created_at", { ascending: true }),
		);
		const orgs = orgRows.map(organizationFromDb);

		const storage = yield* LocalStorageService;
		const savedIdOption = yield* storage.loadLastOrgId.pipe(
			Effect.catchAll(() => Effect.succeed(Option.none<OrganizationId>())),
		);
		const savedId = Option.getOrUndefined(savedIdOption);
		const activeId =
			orgs.find((o) => o.id === (savedId as OrganizationId | null))?.id ?? orgs[0]?.id ?? null;
		const activeIdOption = Option.fromNullable(activeId);

		const { finalOrgs, finalActiveId } = yield* orgs.length === 0
			? Effect.gen(function* () {
					const newOrgRow = yield* supabase.query<DbOrganization>(
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
					const newOrg = organizationFromDb(newOrgRow);
					return { finalOrgs: [newOrg], finalActiveId: Option.some(newOrg.id) };
				})
			: Effect.succeed({ finalOrgs: orgs, finalActiveId: activeIdOption });

		yield* SubscriptionRef.update(stateRef, (s) => ({
			...s,
			organizations: finalOrgs,
			currentOrgId: finalActiveId,
		}));

		if (Option.isSome(finalActiveId)) {
			yield* storage.saveLastOrgId(finalActiveId.value).pipe(Effect.catchAll(() => Effect.void));

			// Fetch Attendance
			const attendance = yield* supabase.query<import("../../types/app.types").AttendancePartial[]>(
				"fetchAttendance",
				supabase.client
					.from("attendance")
					.select("date_str, daily_hours")
					.eq("organization_id", finalActiveId.value),
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
			.pipe(
				Effect.catchTags({
					SupabaseNetworkError: () => Effect.succeed({ theme: null }),
					SupabaseQueryError: () => Effect.succeed({ theme: null }),
				}),
			);

		if (settings?.theme) {
			yield* SubscriptionRef.update(stateRef, (s) => ({
				...s,
				theme: settings.theme as Theme,
			}));
		}
	});

export const handleForceLogout = (authService: AuthServiceApi) =>
	Effect.gen(function* () {
		yield* authService.signOut();
	});

export const handleLogin = (
	email: string,
	password: string,
	auth: AuthServiceApi,
	stateRef: SubscriptionRef.SubscriptionRef<AppState>,
) =>
	Effect.gen(function* () {
		yield* SubscriptionRef.update(stateRef, (s) => ({ ...s, loadingAuth: true }));
		yield* auth.signIn(email, password).pipe(
			Effect.catchTag("AuthSignInError", (err) =>
				SubscriptionRef.update(stateRef, (s) => ({
					...s,
					globalAlert: Option.some(err.message),
					loadingAuth: false,
				})),
			),
		);
	});

export const handleSignUp = (
	email: string,
	password: string,
	fullName: string,
	auth: AuthServiceApi,
	stateRef: SubscriptionRef.SubscriptionRef<AppState>,
) =>
	Effect.gen(function* () {
		yield* SubscriptionRef.update(stateRef, (s) => ({ ...s, loadingAuth: true }));
		yield* auth.signUp(email, password, fullName).pipe(
			Effect.catchTag("AuthSignUpError", (err) =>
				SubscriptionRef.update(stateRef, (s) => ({
					...s,
					globalAlert: Option.some(err.message),
					loadingAuth: false,
				})),
			),
		);
	});

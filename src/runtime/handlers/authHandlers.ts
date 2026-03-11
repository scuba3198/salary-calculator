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
			// Guest Mode
			yield* SubscriptionRef.update(stateRef, (s) => {
				const savedOrgsRaw: unknown = JSON.parse(localStorage.getItem("organizations") || "[]");

				const isOption = (u: unknown): u is Option.Option<unknown> => {
					if (typeof u !== "object" || u === null) return false;
					if (!("_tag" in u)) return false;
					const tag = (u as { readonly _tag?: unknown })._tag;
					return tag === "Some" || tag === "None";
				};

				const savedOrgs = Array.isArray(savedOrgsRaw)
					? savedOrgsRaw.map((org): Organization => {
							const row = org as Record<string, unknown>;
							const id = (row["id"] ?? "guest") as OrganizationId;

							const tdsRaw = row["tds_percentage"];
							const colorRaw = row["color"];
							const createdAtRaw = row["created_at"];
							const updatedAtRaw = row["updated_at"];

							return {
								id,
								name: String(row["name"] ?? "Workspace"),
								hourly_rate: Math.max(
									Number(row["hourly_rate"] ?? 0),
									id === ("guest" as OrganizationId) ? 500 : 0,
								),
								daily_hours: Number(row["daily_hours"] ?? 8),
								tds_percentage: isOption(tdsRaw)
									? (tdsRaw as Option.Option<number>)
									: Option.fromNullable(typeof tdsRaw === "number" ? tdsRaw : null),
								user_id: (row["user_id"] ?? "") as UserId,
								color: isOption(colorRaw)
									? (colorRaw as Option.Option<string>)
									: Option.fromNullable(typeof colorRaw === "string" ? colorRaw : null),
								created_at: isOption(createdAtRaw)
									? (createdAtRaw as Option.Option<string>)
									: Option.fromNullable(typeof createdAtRaw === "string" ? createdAtRaw : null),
								updated_at: isOption(updatedAtRaw)
									? (updatedAtRaw as Option.Option<string>)
									: Option.fromNullable(typeof updatedAtRaw === "string" ? updatedAtRaw : null),
							};
						})
					: [];

				return {
					...s,
					user: Option.none(),
					loadingAuth: false,
					organizations:
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
								],
					currentOrgId: Option.orElse(
						Option.fromNullable(localStorage.getItem("currentOrgId") as OrganizationId | null),
						() => Option.some("guest" as OrganizationId),
					),
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

		const savedId = localStorage.getItem("last_org_id");
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
			localStorage.setItem("last_org_id", finalActiveId.value);

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

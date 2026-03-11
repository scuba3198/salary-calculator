import { Effect, type Fiber, Option, Queue, Ref, Schedule, Stream, SubscriptionRef } from "effect";
import type { Theme } from "../types/app.types";
import { getCurrentDate } from "../utils/nepali-calendar";
import type { AppIntent } from "./AppIntent";
import { type AppState, initialAppState } from "./AppState";
import {
	handleAuthChanged,
	handleForceLogout,
	handleLogin,
	handleSignUp,
} from "./handlers/authHandlers";
import { LocalStorageService } from "./services/LocalStorageService";
import { AttendanceService } from "./services/AttendanceService";
import { AuthService } from "./services/AuthService";
import { type BeforeInstallPromptEvent, InstallService } from "./services/InstallService";
import { OrgService } from "./services/OrgService";
import { SettingsService } from "./services/SettingsService";
import { SupabaseService } from "./services/SupabaseService";

let deferredPrompt: BeforeInstallPromptEvent | null = null;

export const appProgram = Effect.gen(function* () {
	const supabase = yield* SupabaseService;
	const auth = yield* AuthService;
	const installService = yield* InstallService;
	const orgs = yield* OrgService;
	const attendance = yield* AttendanceService;
	const settings = yield* SettingsService;
	const localStorageService = yield* LocalStorageService;
	const stateRef = yield* SubscriptionRef.make<AppState>(initialAppState);
	const intentQueue = yield* Queue.unbounded<AppIntent>();
	const syncFiberRef = yield* Ref.make<Fiber.RuntimeFiber<void, unknown> | null>(null);

	// 1. Auth Stream → Intent Queue
	yield* auth.authChanges.pipe(
		Stream.tap(({ user }) => Queue.offer(intentQueue, { _tag: "AuthChanged", user })),
		Stream.runDrain,
		Effect.interruptible,
		Effect.forkDaemon,
	);

	// 2. Persistence Stream (watches state, writes to localStorage via LocalStorageService)
	yield* stateRef.changes.pipe(
		Stream.tap((state) =>
			Effect.gen(function* () {
				yield* localStorageService.persistFromState(state).pipe(
					Effect.catchAll(() => Effect.void),
				);
				yield* Effect.sync(() => {
					document.documentElement.setAttribute("data-theme", state.theme);
				});
			}),
		),
		Stream.runDrain,
		Effect.forkDaemon,
	);

	// 3. Clock tick (updates currentDate every 60s)
	yield* Effect.repeat(
		Effect.gen(function* () {
			const now = getCurrentDate();
			yield* SubscriptionRef.update(stateRef, (s) => ({ ...s, currentDate: now }));
		}),
		Schedule.spaced("60 seconds"),
	).pipe(Effect.forkDaemon);

	// 4. Install Prompt Stream
	yield* installService.installEvents.pipe(
		Stream.tap((event) =>
			Effect.gen(function* () {
				const shouldShow = yield* Effect.sync(() => {
					deferredPrompt = event;
					const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
					const nav = navigator as Navigator & { readonly standalone?: boolean };
					const isStandalone =
						window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
					return isMobile && !isStandalone;
				});

				if (shouldShow) {
					yield* Queue.offer(intentQueue, { _tag: "SetInstallPromptVisible", visible: true });
				}
			}),
		),
		Stream.runDrain,
		Effect.forkDaemon,
	);

	// 5. Main Intent Loop
	const processIntentLoop = Effect.forever(
		Effect.gen(function* () {
			const intent = yield* Queue.take(intentQueue);

			switch (intent._tag) {
				case "AuthChanged":
					yield* handleAuthChanged(intent.user, stateRef, syncFiberRef, supabase);
					break;
				case "ForceLogout":
					yield* handleForceLogout(auth);
					break;
				case "SubmitLogin":
					yield* handleLogin(intent.email, intent.password, auth, stateRef);
					break;
				case "SubmitSignUp":
					yield* handleSignUp(intent.email, intent.password, intent.fullName, auth, stateRef);
					break;
				case "ToggleTheme":
					yield* SubscriptionRef.update(stateRef, (s) => ({
						...s,
						theme: (s.theme === "dark" ? "light" : "dark") as Theme,
					}));
					break;
				case "SetViewYear":
					yield* SubscriptionRef.update(stateRef, (s) => ({ ...s, viewYear: intent.year }));
					break;
				case "SetViewMonth":
					yield* SubscriptionRef.update(stateRef, (s) => ({ ...s, viewMonth: intent.month }));
					break;
				case "ToggleDate":
					yield* attendance.toggleDate(intent.year, intent.month, intent.day, stateRef);
					break;
				case "AddOrganization":
					yield* orgs.addOrganization(intent.name, stateRef);
					break;
				case "SwitchOrganization":
					yield* orgs.switchOrganization(intent.orgId, stateRef);
					break;
				case "UpdateOrganization":
					yield* orgs.updateOrganization(intent.id, intent.updates, stateRef);
					break;
				case "DeleteOrganization":
					yield* orgs.deleteOrganization(intent.id, stateRef);
					break;
				case "SetHourlyRate":
					yield* settings.setHourlyRate(intent.value, stateRef);
					break;
				case "SetDailyHours":
					yield* settings.setDailyHours(intent.value, stateRef);
					break;
				case "SetTdsPercentage":
					yield* settings.setTdsPercentage(intent.value, stateRef);
					break;
				case "RequestReset":
					yield* SubscriptionRef.update(stateRef, (s) => ({
						...s,
						globalConfirm: Option.some({
							message: "Are you sure you want to clear all data for this organization?",
							intentOnConfirm: { _tag: "ConfirmAction" } as const,
						}),
					}));
					break;
				case "ConfirmAction":
					yield* SubscriptionRef.update(stateRef, (s) => ({ ...s, globalConfirm: Option.none() }));
					yield* attendance.resetData(stateRef);
					break;
				case "DismissAlert":
					yield* SubscriptionRef.update(stateRef, (s) => ({ ...s, globalAlert: Option.none() }));
					break;
				case "ShowAlert":
					yield* SubscriptionRef.update(stateRef, (s) => ({
						...s,
						globalAlert: Option.some(intent.message),
					}));
					break;
				case "DismissConfirm":
					yield* SubscriptionRef.update(stateRef, (s) => ({ ...s, globalConfirm: Option.none() }));
					break;
				case "PromptInstall":
					if (deferredPrompt) {
						yield* installService.showPrompt(deferredPrompt);
						deferredPrompt = null;
						yield* SubscriptionRef.update(stateRef, (s) => ({
							...s,
							isInstallPromptVisible: false,
						}));
					} else {
						yield* SubscriptionRef.update(stateRef, (s) => ({
							...s,
							isInstallPromptVisible: false,
							globalAlert: Option.some(
								"To install: Tap the browser menu (usually three dots or share icon) and select 'Install app' or 'Add to Home Screen'.",
							),
						}));
					}
					break;
				case "SetInstallPromptVisible":
					yield* SubscriptionRef.update(stateRef, (s) => ({
						...s,
						isInstallPromptVisible: intent.visible,
					}));
					break;
				case "DismissInstallPrompt":
					yield* SubscriptionRef.update(stateRef, (s) => ({ ...s, isInstallPromptVisible: false }));
					break;
				default:
					break;
			}
		}),
	);

	yield* Effect.forkDaemon(processIntentLoop);

	return {
		stateStream: stateRef.changes,
		intentQueue,
	};
});

import { Effect, type Fiber, Queue, Ref, Schedule, Stream, SubscriptionRef } from "effect";
import type { Theme } from "../types/app.types";
import { getCurrentDate } from "../utils/nepali-calendar";
import type { AppIntent } from "./AppIntent";
import { type AppState, initialAppState } from "./AppState";
import { handleResetData, handleToggleDate } from "./handlers/attendanceHandlers";
import {
	handleAuthChanged,
	handleForceLogout,
	handleLogin,
	handleSignUp,
} from "./handlers/authHandlers";
import {
	handleAddOrg,
	handleDeleteOrg,
	handleSwitchOrg,
	handleUpdateOrg,
} from "./handlers/orgHandlers";
import {
	handleSetDailyHours,
	handleSetHourlyRate,
	handleSetTdsPercentage,
} from "./handlers/settingsHandlers";
import { AuthService } from "./services/AuthService";
import { InstallService, type BeforeInstallPromptEvent } from "./services/InstallService";
import { SupabaseService } from "./services/SupabaseService";

let deferredPrompt: BeforeInstallPromptEvent | null = null;

export const appProgram = Effect.gen(function* () {
	const supabase = yield* SupabaseService;
	const auth = yield* AuthService;
	const installService = yield* InstallService;
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

	// 2. Persistence Stream (watches state, writes to localStorage)
	yield* stateRef.changes.pipe(
		Stream.tap((state) =>
			Effect.sync(() => {
				localStorage.setItem("theme", state.theme);
				document.documentElement.setAttribute("data-theme", state.theme);
				if (state.currentOrgId) localStorage.setItem("currentOrgId", state.currentOrgId);
				if (!state.user) {
					localStorage.setItem("markedDates", JSON.stringify(state.markedDates));
					localStorage.setItem("organizations", JSON.stringify(state.organizations));
				}
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
			Effect.sync(() => {
				deferredPrompt = event;
				const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
				const isStandalone =
					window.matchMedia("(display-mode: standalone)").matches ||
					("standalone" in navigator && (navigator as any).standalone);

				if (isMobile && !isStandalone) {
					Effect.runSync(Queue.offer(intentQueue, { _tag: "SetInstallPromptVisible", visible: true }));
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
					yield* handleToggleDate(intent.year, intent.month, intent.day, stateRef, supabase);
					break;
				case "AddOrganization":
					yield* handleAddOrg(intent.name, stateRef, supabase);
					break;
				case "SwitchOrganization":
					yield* handleSwitchOrg(intent.orgId, stateRef, supabase);
					break;
				case "UpdateOrganization":
					yield* handleUpdateOrg(intent.id, intent.updates, stateRef, supabase);
					break;
				case "DeleteOrganization":
					yield* handleDeleteOrg(intent.id, stateRef, supabase);
					break;
				case "SetHourlyRate":
					yield* handleSetHourlyRate(intent.value, stateRef, supabase);
					break;
				case "SetDailyHours":
					yield* handleSetDailyHours(intent.value, stateRef, supabase);
					break;
				case "SetTdsPercentage":
					yield* handleSetTdsPercentage(intent.value, stateRef, supabase);
					break;
				case "RequestReset":
					yield* SubscriptionRef.update(stateRef, (s) => ({
						...s,
						globalConfirm: {
							message: "Are you sure you want to clear all data for this organization?",
							intentOnConfirm: { _tag: "ConfirmAction" } as const,
						},
					}));
					break;
				case "ConfirmAction":
					yield* SubscriptionRef.update(stateRef, (s) => ({ ...s, globalConfirm: null }));
					yield* handleResetData(stateRef, supabase);
					break;
				case "DismissAlert":
					yield* SubscriptionRef.update(stateRef, (s) => ({ ...s, globalAlert: null }));
					break;
				case "ShowAlert":
					yield* SubscriptionRef.update(stateRef, (s) => ({ ...s, globalAlert: intent.message }));
					break;
				case "DismissConfirm":
					yield* SubscriptionRef.update(stateRef, (s) => ({ ...s, globalConfirm: null }));
					break;
				case "PromptInstall":
					if (deferredPrompt) {
						yield* installService.showPrompt(deferredPrompt);
						deferredPrompt = null;
						yield* SubscriptionRef.update(stateRef, (s) => ({ ...s, isInstallPromptVisible: false }));
					} else {
						yield* SubscriptionRef.update(stateRef, (s) => ({
							...s,
							isInstallPromptVisible: false,
							globalAlert:
								"To install: Tap the browser menu (usually three dots or share icon) and select 'Install app' or 'Add to Home Screen'.",
						}));
					}
					break;
				case "SetInstallPromptVisible":
					yield* SubscriptionRef.update(stateRef, (s) => ({ ...s, isInstallPromptVisible: intent.visible }));
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

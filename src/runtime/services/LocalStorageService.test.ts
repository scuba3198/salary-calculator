import { Effect, Layer, Option } from "effect";
import { describe, expect, it, beforeEach } from "vitest";
import type { AppState } from "../AppState";
import { initialAppState } from "../AppState";
import { LocalStorageService } from "./LocalStorageService";

const TestLive = LocalStorageService.Default;
const run = <A>(eff: Effect.Effect<A, unknown, never>) =>
	Effect.runSync(Effect.provide(eff, TestLive as Layer.Layer<never>));

describe("LocalStorageService", () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	it("saves and loads theme with a sane default", () => {
		const svc = run(LocalStorageService);

		// default when nothing stored
		const theme0 = run(svc.loadTheme);
		expect(theme0).toBe("dark");

		// roundtrip
		run(svc.saveTheme("light"));
		const theme1 = run(svc.loadTheme);
		expect(theme1).toBe("light");
	});

	it("saves and loads current organization id", () => {
		const svc = run(LocalStorageService);

		const initial = run(svc.loadCurrentOrgId);
		expect(Option.isNone(initial)).toBe(true);

		const orgId = "org-123" as Parameters<typeof svc.saveLastOrgId>[0];
		run(svc.saveCurrentOrgId(Option.some(orgId)));
		const loaded = run(svc.loadCurrentOrgId);

		expect(Option.isSome(loaded)).toBe(true);
		expect(loaded).toEqual(Option.some(orgId));
	});

	it("persists guest state from AppState", () => {
		const svc = run(LocalStorageService);
		const state: AppState = {
			...initialAppState,
			user: Option.none(),
			organizations: initialAppState.organizations,
			markedDates: { "2081-1-1": 8 },
		};

		run(svc.persistFromState(state));

		const orgs = run(svc.loadOrganizations);
		const marked = run(svc.loadMarkedDates);

		expect(orgs.length).toBeGreaterThan(0);
		expect(marked["2081-1-1"]).toBe(8);
	});

	it("handles invalid JSON by returning decode error", () => {
		const svc = run(LocalStorageService);
		window.localStorage.setItem("markedDates", "{not-json");

		const result = Effect.runSyncExit(svc.loadMarkedDates);
		expect(result._tag).toBe("Failure");
	});
});


import { Effect, Option } from "effect";
import { beforeEach, describe, expect, it } from "vitest";
import type { AppState } from "../AppState";
import { initialAppState } from "../AppState";
import { LocalStorageService, type LocalStorageServiceApi } from "./LocalStorageService";

const TestLive = LocalStorageService.Default;
const run = <A>(eff: Effect.Effect<A, unknown, LocalStorageServiceApi>) =>
	Effect.runSync(Effect.provide(eff, TestLive));

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

	it("reads the latest saved organization id each time", () => {
		const svc = run(LocalStorageService);
		expect(run(svc.loadLastOrgId)).toEqual(Option.none());
		const orgId = "org-123" as Parameters<typeof svc.saveLastOrgId>[0];
		run(svc.saveLastOrgId(orgId));
		expect(run(svc.loadLastOrgId)).toEqual(Option.some(orgId));
		window.localStorage.removeItem("last_org_id");
		expect(run(svc.loadLastOrgId)).toEqual(Option.none());
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

		const error = run(Effect.flip(svc.loadMarkedDates));
		expect(error).toMatchObject({ _tag: "LocalStorageDecodeError", key: "markedDates" });
	});

	it("returns a decode error for stored JSON that violates the schema", () => {
		const svc = run(LocalStorageService);
		window.localStorage.setItem("markedDates", '{"2081-1-1":"invalid"}');
		const error = run(Effect.flip(svc.loadMarkedDates));
		expect(error).toMatchObject({ _tag: "LocalStorageDecodeError", key: "markedDates" });
	});
});

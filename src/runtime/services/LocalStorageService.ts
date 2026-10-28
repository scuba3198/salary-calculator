import { Effect, Option, Schema } from "effect";
import type { MarkedDatesMap, Organization, OrganizationId, Theme } from "../../types/app.types";
import type { AppState } from "../AppState";
import {
	LocalStorageDecodeError,
	type LocalStorageError,
	LocalStorageUnavailableError,
} from "../storageErrors";
import { BrowserStoragePort, type StoragePort } from "../storagePort";

const THEME_KEY = "theme";
const CURRENT_ORG_ID_KEY = "currentOrgId";
const ORGANIZATIONS_KEY = "organizations";
const MARKED_DATES_KEY = "markedDates";
const LAST_ORG_ID_KEY = "last_org_id";

const ThemeSchema = Schema.Union(Schema.Literal("dark"), Schema.Literal("light"));

const MarkedDatesSchema = Schema.Record({ key: Schema.String, value: Schema.Number });

const OrganizationsSchema = Schema.Array(
	Schema.Struct({
		id: Schema.String,
		name: Schema.String,
		hourly_rate: Schema.Number,
		daily_hours: Schema.Number,
	}),
);

export interface LocalStorageServiceApi {
	readonly loadTheme: Effect.Effect<Theme, LocalStorageError>;
	readonly saveTheme: (theme: Theme) => Effect.Effect<void, LocalStorageError>;

	readonly loadCurrentOrgId: Effect.Effect<Option.Option<OrganizationId>, LocalStorageError>;
	readonly saveCurrentOrgId: (
		id: Option.Option<OrganizationId>,
	) => Effect.Effect<void, LocalStorageError>;

	readonly loadMarkedDates: Effect.Effect<MarkedDatesMap, LocalStorageError>;
	readonly saveMarkedDates: (marked: MarkedDatesMap) => Effect.Effect<void, LocalStorageError>;

	readonly loadOrganizations: Effect.Effect<ReadonlyArray<Organization>, LocalStorageError>;
	readonly saveOrganizations: (
		orgs: ReadonlyArray<Organization>,
	) => Effect.Effect<void, LocalStorageError>;

	readonly loadLastOrgId: Effect.Effect<Option.Option<OrganizationId>, LocalStorageError>;
	readonly saveLastOrgId: (id: OrganizationId) => Effect.Effect<void, LocalStorageError>;

	readonly persistFromState: (state: AppState) => Effect.Effect<void, LocalStorageError>;
}

const makeStoragePort = (): StoragePort => {
	if (typeof window === "undefined" || !window.localStorage) {
		throw new LocalStorageUnavailableError({
			message: "localStorage is not available in this environment",
		});
	}
	return new BrowserStoragePort(window.localStorage);
};

const parseJson = <A>(
	key: string,
	raw: string | null,
	schema: Schema.Schema<A>,
): Effect.Effect<A, LocalStorageError> =>
	Effect.try({
		try: (): unknown => (raw === null || raw === "" ? {} : JSON.parse(raw)),
		catch: (error) =>
			new LocalStorageDecodeError({
				key,
				message:
					error instanceof Error
						? error.message
						: `Failed to parse JSON from localStorage for key ${key}`,
			}),
	}).pipe(
		Effect.flatMap((parsed) => Schema.decodeUnknown(schema)(parsed)),
		Effect.catchTag("ParseError", (error) =>
			Effect.fail(
				new LocalStorageDecodeError({
					key,
					message: error.message,
				}),
			),
		),
	);

const encodeJson = <A>(
	key: string,
	value: A,
	schema: Schema.Schema<A>,
): Effect.Effect<string, LocalStorageError> =>
	Schema.encode(schema)(value).pipe(
		Effect.catchTag("ParseError", (err) =>
			Effect.fail(
				new LocalStorageDecodeError({
					key,
					message: String(err.message),
				}),
			),
		),
		Effect.map((encoded) => JSON.stringify(encoded)),
	);

export const LocalStorageService = Effect.Service<LocalStorageServiceApi>()("LocalStorageService", {
	accessors: true,
	effect: Effect.gen(function* () {
		const storage = makeStoragePort();

		const loadTheme: LocalStorageServiceApi["loadTheme"] = Effect.gen(function* () {
			const raw = storage.getItem(THEME_KEY);
			if (!raw) return "dark" as Theme;

			const parsed: unknown = yield* Effect.sync(() => {
				try {
					return JSON.parse(raw);
				} catch {
					return raw;
				}
			});

			const decoded = yield* Schema.decodeUnknown(ThemeSchema)(parsed).pipe(
				Effect.catchTag("ParseError", (err) =>
					Effect.fail(
						new LocalStorageDecodeError({
							key: THEME_KEY,
							message: String(err.message),
						}),
					),
				),
			);
			return decoded as Theme;
		});

		const saveTheme: LocalStorageServiceApi["saveTheme"] = (theme) =>
			Effect.sync(() => {
				storage.setItem(THEME_KEY, JSON.stringify(theme));
			});

		const loadCurrentOrgId: LocalStorageServiceApi["loadCurrentOrgId"] = Effect.sync(() => {
			const raw = storage.getItem(CURRENT_ORG_ID_KEY);
			if (!raw) return Option.none<OrganizationId>();
			return Option.some(raw as OrganizationId);
		});

		const saveCurrentOrgId: LocalStorageServiceApi["saveCurrentOrgId"] = (idOption) =>
			Effect.sync(() => {
				if (Option.isNone(idOption)) {
					storage.removeItem(CURRENT_ORG_ID_KEY);
				} else {
					storage.setItem(CURRENT_ORG_ID_KEY, idOption.value as unknown as string);
				}
			});

		const loadMarkedDates: LocalStorageServiceApi["loadMarkedDates"] = Effect.gen(function* () {
			const raw = storage.getItem(MARKED_DATES_KEY);
			if (!raw) return {};
			const decoded = yield* parseJson(MARKED_DATES_KEY, raw, MarkedDatesSchema);
			return decoded as MarkedDatesMap;
		});

		const saveMarkedDates: LocalStorageServiceApi["saveMarkedDates"] = (marked) =>
			encodeJson(MARKED_DATES_KEY, marked, MarkedDatesSchema).pipe(
				Effect.tap((json) =>
					Effect.sync(() => {
						storage.setItem(MARKED_DATES_KEY, json);
					}),
				),
				Effect.asVoid,
			);

		const loadOrganizations: LocalStorageServiceApi["loadOrganizations"] = Effect.gen(function* () {
			const raw = storage.getItem(ORGANIZATIONS_KEY);
			if (!raw) return [];
			yield* parseJson(ORGANIZATIONS_KEY, raw, OrganizationsSchema);
			// For now, we trust existing manual mapping code in AppState/AuthHandlers
			// to coerce raw rows into Organization domain objects.
			return JSON.parse(raw) as ReadonlyArray<Organization>;
		});

		const saveOrganizations: LocalStorageServiceApi["saveOrganizations"] = (orgs) =>
			Effect.sync(() => {
				storage.setItem(ORGANIZATIONS_KEY, JSON.stringify(orgs));
			});

		const loadLastOrgId: LocalStorageServiceApi["loadLastOrgId"] = Effect.sync(() => {
			const raw = storage.getItem(LAST_ORG_ID_KEY);
			if (!raw) return Option.none<OrganizationId>();
			return Option.some(raw as OrganizationId);
		});

		const saveLastOrgId: LocalStorageServiceApi["saveLastOrgId"] = (id) =>
			Effect.sync(() => {
				storage.setItem(LAST_ORG_ID_KEY, id as unknown as string);
			});

		const persistFromState: LocalStorageServiceApi["persistFromState"] = (state) =>
			Effect.gen(function* () {
				yield* saveTheme(state.theme);
				if (Option.isSome(state.currentOrgId)) {
					yield* saveCurrentOrgId(state.currentOrgId);
				}
				if (Option.isNone(state.user)) {
					yield* saveMarkedDates(state.markedDates);
					yield* saveOrganizations(state.organizations);
				}
			});

		return {
			loadTheme,
			saveTheme,
			loadCurrentOrgId,
			saveCurrentOrgId,
			loadMarkedDates,
			saveMarkedDates,
			loadOrganizations,
			saveOrganizations,
			loadLastOrgId,
			saveLastOrgId,
			persistFromState,
		};
	}),
});

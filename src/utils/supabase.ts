import { createClient } from "@supabase/supabase-js";
import { Effect } from "effect";
import { EnvConfigError, SupabaseError } from "../errors";
import type { Database } from "../types/database.types";

const getEnvVar = (name: string): Effect.Effect<string, EnvConfigError> =>
	Effect.fromNullable(import.meta.env[name]).pipe(
		Effect.mapError(() => new EnvConfigError({ variable: name })),
	);

// Eagerly resolve config at start or throw if missing (as we are in a browser/Vite context)
// We use runSync because these MUST be present for the app to function at all.
const config = Effect.runSync(
	Effect.all({
		url: getEnvVar("VITE_SUPABASE_URL"),
		anonKey: getEnvVar("VITE_SUPABASE_ANON_KEY"),
	}),
);

export const supabase = createClient<Database>(config.url, config.anonKey, {
	auth: {
		persistSession: true,
		autoRefreshToken: true,
	},
});

/**
 * A wrapper for Supabase queries to eliminate try/catch and provide typed Effect errors.
 */
export const supabaseQuery = <T>(
	operation: string,
	query: PromiseLike<{
		data: T | null;
		error: { message: string; code?: string; details?: string; hint?: string } | null;
	}>,
): Effect.Effect<T, SupabaseError> =>
	Effect.tryPromise({
		try: () =>
			query as Promise<{
				data: T | null;
				error: { message: string; code?: string } | null;
			}>,
		catch: (e) =>
			new SupabaseError({
				operation,
				message: e instanceof Error ? e.message : "Network error or unexpected failure",
				code: "NETWORK",
			}),
	}).pipe(
		Effect.flatMap(({ data, error }) => {
			if (error) {
				return Effect.fail(
					new SupabaseError({
						operation,
						message: error.message || "Unknown error",
						code: error.code || "UNKNOWN",
					}),
				);
			}
			return Effect.succeed(data as T);
		}),
	);

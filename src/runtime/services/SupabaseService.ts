import { createClient } from "@supabase/supabase-js";
import { type Effect, Effect as EffectMod } from "effect";
import { SupabaseNetworkError, SupabaseQueryError } from "../../errors";
import type { Database } from "../../types/database.types";
import { AppConfigService } from "./AppConfigService";

export interface SupabaseServiceApi {
	readonly query: <T>(
		operation: string,
		q: PromiseLike<{
			data: T | null;
			error: { message: string; code?: string; details?: string; hint?: string } | null;
		}>,
	) => Effect.Effect<T, SupabaseNetworkError | SupabaseQueryError>;
	readonly client: ReturnType<typeof createClient<Database>>;
}

export class SupabaseService extends EffectMod.Service<SupabaseServiceApi>()("SupabaseService", {
	accessors: true,
	dependencies: [AppConfigService.Default],
	effect: EffectMod.gen(function* () {
		const config = yield* AppConfigService;

		const client = createClient<Database>(config.supabaseUrl, config.supabaseAnonKey, {
			auth: {
				persistSession: true,
				autoRefreshToken: true,
			},
		});

		const query = EffectMod.fn("SupabaseService.query")(
			<T>(
				operation: string,
				q: PromiseLike<{
					data: T | null;
					error: { message: string; code?: string; details?: string; hint?: string } | null;
				}>,
			): Effect.Effect<T, SupabaseNetworkError | SupabaseQueryError> =>
				EffectMod.tryPromise({
					try: () =>
						q as Promise<{ data: T | null; error: { message: string; code?: string } | null }>,
					catch: (e) =>
						new SupabaseNetworkError({
							operation,
							message: e instanceof Error ? e.message : "Network error or unexpected failure",
						}),
				}).pipe(
					EffectMod.flatMap(({ data, error }) => {
						if (error) {
							return EffectMod.fail(
								new SupabaseQueryError({
									operation,
									message: error.message || "Unknown error",
									code: error.code || "UNKNOWN",
								}),
							);
						}
						return EffectMod.succeed(data as T);
					}),
				),
		);

		return { client, query };
	}),
}) {}

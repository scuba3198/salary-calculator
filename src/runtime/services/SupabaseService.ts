import { Context, type Effect, Layer } from "effect";
import type { SupabaseError } from "../../errors";
import { supabase, supabaseQuery } from "../../utils/supabase";

export interface SupabaseService {
	readonly query: <T>(
		operation: string,
		q: PromiseLike<{
			data: T | null;
			error: { message: string; code?: string; details?: string; hint?: string } | null;
		}>,
	) => Effect.Effect<T, SupabaseError>;
	readonly client: typeof supabase;
}

export const SupabaseService = Context.GenericTag<SupabaseService>("SupabaseService");

export const SupabaseServiceLive = Layer.succeed(SupabaseService, {
	query: supabaseQuery,
	client: supabase,
});

import type { User } from "@supabase/supabase-js";
import { Chunk, Context, Effect, Layer, Stream } from "effect";
import { AuthError } from "../../errors";
import { supabase } from "../../utils/supabase";

export interface AuthService {
	readonly authChanges: Stream.Stream<{ event: string; user: User | null }, never, never>;
	readonly signIn: (email: string, password: string) => Effect.Effect<void, AuthError, never>;
	readonly signUp: (
		email: string,
		password: string,
		fullName: string,
	) => Effect.Effect<void, AuthError, never>;
	readonly signOut: Effect.Effect<void, AuthError, never>;
}

export const AuthService = Context.GenericTag<AuthService>("AuthService");

export const AuthServiceLive = Layer.succeed(AuthService, {
	authChanges: Stream.async<{ event: string; user: User | null }, never, never>((emit) => {
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((event, session) => {
			emit(Effect.succeed(Chunk.make({ event, user: session?.user ?? null })));
		});

		return Effect.sync(() => {
			subscription.unsubscribe();
		});
	}),
	signIn: (email: string, password: string) =>
		Effect.tryPromise({
			try: () => supabase.auth.signInWithPassword({ email, password }),
			catch: (err) =>
				new AuthError({ message: err instanceof Error ? err.message : "Login failed" }),
		}).pipe(
			Effect.flatMap(({ error }) =>
				error ? Effect.fail(new AuthError({ message: error.message })) : Effect.void,
			),
		),
	signUp: (email: string, password: string, fullName: string) =>
		Effect.tryPromise({
			try: () =>
				supabase.auth.signUp({
					email,
					password,
					options: {
						data: {
							full_name: fullName,
						},
					},
				}),
			catch: (err) =>
				new AuthError({ message: err instanceof Error ? err.message : "SignUp failed" }),
		}).pipe(
			Effect.flatMap(({ error }) =>
				error ? Effect.fail(new AuthError({ message: error.message })) : Effect.void,
			),
		),
	signOut: Effect.tryPromise({
		try: () => supabase.auth.signOut(),
		catch: (err) =>
			new AuthError({ message: err instanceof Error ? err.message : "Logout failed" }),
	}).pipe(
		Effect.flatMap(({ error }) =>
			error ? Effect.fail(new AuthError({ message: error.message })) : Effect.void,
		),
	),
});

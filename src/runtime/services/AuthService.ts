import type { User } from "@supabase/supabase-js";
import { Chunk, Effect, Stream } from "effect";
import { AuthSignInError, AuthSignOutError, AuthSignUpError } from "../../errors";
import { SupabaseService } from "./SupabaseService";

export interface AuthServiceApi {
	readonly authChanges: Stream.Stream<{ event: string; user: User | null }, never, never>;
	readonly signIn: (
		email: string,
		password: string,
	) => Effect.Effect<undefined, AuthSignInError, never>;
	readonly signUp: (
		email: string,
		password: string,
		fullName: string,
	) => Effect.Effect<undefined, AuthSignUpError, never>;
	readonly signOut: () => Effect.Effect<undefined, AuthSignOutError, never>;
}

export class AuthService extends Effect.Service<AuthServiceApi>()("AuthService", {
	accessors: true,
	dependencies: [SupabaseService.Default],
	effect: Effect.gen(function* () {
		const { client } = yield* SupabaseService;

		const authChanges = Stream.async<{ event: string; user: User | null }, never, never>((emit) => {
			const {
				data: { subscription },
			} = client.auth.onAuthStateChange((event, session) => {
				emit(Effect.succeed(Chunk.make({ event, user: session?.user ?? null })));
			});

			// Emit initial session immediately
			client.auth.getSession().then(({ data: { session } }) => {
				emit(
					Effect.succeed(
						Chunk.make({
							event: "INITIAL_SESSION",
							user: session?.user ?? null,
						}),
					),
				);
			});

			return Effect.sync(() => subscription.unsubscribe());
		});

		const signIn = Effect.fn("AuthService.signIn")(function* (email: string, password: string) {
			const { error } = yield* Effect.tryPromise({
				try: () => client.auth.signInWithPassword({ email, password }),
				catch: (err) =>
					new AuthSignInError({
						message: "Login failed",
						cause: err instanceof Error ? err.message : undefined,
					}),
			});
			if (error) return yield* Effect.fail(new AuthSignInError({ message: error.message }));
		});

		const signUp = Effect.fn("AuthService.signUp")(function* (
			email: string,
			password: string,
			fullName: string,
		) {
			const { error } = yield* Effect.tryPromise({
				try: () =>
					client.auth.signUp({
						email,
						password,
						options: { data: { full_name: fullName } },
					}),
				catch: (err) =>
					new AuthSignUpError({
						message: "Sign up failed",
						cause: err instanceof Error ? err.message : undefined,
					}),
			});
			if (error) return yield* Effect.fail(new AuthSignUpError({ message: error.message }));
		});

		const signOut = Effect.fn("AuthService.signOut")(function* () {
			const { error } = yield* Effect.tryPromise({
				try: () => client.auth.signOut(),
				catch: (err) =>
					new AuthSignOutError({
						message: "Logout failed",
						cause: err instanceof Error ? err.message : undefined,
					}),
			});
			if (error) return yield* Effect.fail(new AuthSignOutError({ message: error.message }));
		});

		return { authChanges, signIn, signUp, signOut };
	}),
}) {}

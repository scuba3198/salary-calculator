import { Cause, Effect } from "effect";

export interface AppLoggerApi {
	readonly bootFailure: (cause: unknown) => Effect.Effect<void>;
	readonly boundaryError: (payload: {
		readonly error: string;
		readonly stack?: string;
		readonly componentStack: string;
		readonly timestamp: string;
	}) => Effect.Effect<void>;
}

export class AppLogger extends Effect.Service<AppLoggerApi>()("AppLogger", {
	accessors: true,
	effect: Effect.succeed({
		bootFailure: Effect.fn("AppLogger.bootFailure")(function* (cause: unknown) {
			// Normalize unknown into something loggable; avoid throwing.
			const rendered =
				typeof cause === "object" && cause !== null && "_tag" in cause
					? cause
					: Cause.isCause(cause)
						? Cause.pretty(cause)
						: cause instanceof Error
							? { name: cause.name, message: cause.message, stack: cause.stack }
							: { cause };

			yield* Effect.logError({ _tag: "BootFailure", rendered });
		}),
		boundaryError: Effect.fn("AppLogger.boundaryError")(function* (payload) {
			yield* Effect.logError({ _tag: "ReactErrorBoundary", ...payload });
		}),
	}),
}) {}

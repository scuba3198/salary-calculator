import { Data } from "effect";

export class SupabaseError extends Data.TaggedError("SupabaseError")<{
	readonly operation: string;
	readonly message: string;
	readonly code: string;
}> { }

export class AuthError extends Data.TaggedError("AuthError")<{
	readonly message: string;
}> { }

export class EnvConfigError extends Data.TaggedError("EnvConfigError")<{
	readonly variable: string;
}> { }

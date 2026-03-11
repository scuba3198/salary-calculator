import { Schema } from "effect";

export class SupabaseNetworkError extends Schema.TaggedError<SupabaseNetworkError>()(
	"SupabaseNetworkError",
	{
		operation: Schema.String,
		message: Schema.String,
	},
) {}

export class SupabaseQueryError extends Schema.TaggedError<SupabaseQueryError>()(
	"SupabaseQueryError",
	{
		operation: Schema.String,
		message: Schema.String,
		code: Schema.String,
	},
) {}

export class AuthSignInError extends Schema.TaggedError<AuthSignInError>()("AuthSignInError", {
	message: Schema.String,
	cause: Schema.optional(Schema.String),
}) {}

export class AuthSignUpError extends Schema.TaggedError<AuthSignUpError>()("AuthSignUpError", {
	message: Schema.String,
	cause: Schema.optional(Schema.String),
}) {}

export class AuthSignOutError extends Schema.TaggedError<AuthSignOutError>()("AuthSignOutError", {
	message: Schema.String,
	cause: Schema.optional(Schema.String),
}) {}

export class MissingEnvVarError extends Schema.TaggedError<MissingEnvVarError>()(
	"MissingEnvVarError",
	{
		variable: Schema.String,
		message: Schema.String,
	},
) {}

export class InvalidEnvVarError extends Schema.TaggedError<InvalidEnvVarError>()(
	"InvalidEnvVarError",
	{
		message: Schema.String,
	},
) {}

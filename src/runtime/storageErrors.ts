import { Schema } from "effect";

export class LocalStorageUnavailableError extends Schema.TaggedError<LocalStorageUnavailableError>()(
	"LocalStorageUnavailableError",
	{
		message: Schema.String,
	},
) {}

export class LocalStorageDecodeError extends Schema.TaggedError<LocalStorageDecodeError>()(
	"LocalStorageDecodeError",
	{
		key: Schema.String,
		message: Schema.String,
	},
) {}

export type LocalStorageError = LocalStorageUnavailableError | LocalStorageDecodeError;


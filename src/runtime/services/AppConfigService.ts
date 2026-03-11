import { Config, ConfigProvider, Effect } from "effect";
import { InvalidEnvVarError, MissingEnvVarError } from "../../errors";

const ViteEnvConfigProvider = () => {
	const entries = Object.entries(import.meta.env).filter(([k]) => k.startsWith("VITE_"));
	return ConfigProvider.fromMap(new Map(entries));
};

const AppConfigSchema = Config.all({
	supabaseUrl: Config.string("VITE_SUPABASE_URL"),
	supabaseAnonKey: Config.string("VITE_SUPABASE_ANON_KEY"),
});

export interface AppConfig {
	readonly supabaseUrl: string;
	readonly supabaseAnonKey: string;
}

type AppConfigError = MissingEnvVarError | InvalidEnvVarError;

export class AppConfigService extends Effect.Service<AppConfigService>()("AppConfigService", {
	accessors: true,
	effect: Effect.gen(function* () {
		const provider = ViteEnvConfigProvider();

		const config = yield* Effect.matchEffect(provider.load(AppConfigSchema), {
			onFailure: (err): Effect.Effect<never, AppConfigError> => {
				const message =
					typeof err === "object" && err !== null && "message" in err
						? String((err as { readonly message: unknown }).message)
						: String(err);
				const missingMatch = message.match(/Missing data at path: (.*)$/m);
				if (missingMatch?.[1]) {
					return Effect.fail(new MissingEnvVarError({ variable: missingMatch[1], message }));
				}
				return Effect.fail(new InvalidEnvVarError({ message }));
			},
			onSuccess: (cfg) => Effect.succeed(cfg),
		});

		return config as AppConfig;
	}),
}) {}

import { Chunk, Effect, Stream } from "effect";

export interface BeforeInstallPromptEvent extends Event {
	prompt(): Promise<void>;
	readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export interface InstallServiceApi {
	readonly installEvents: Stream.Stream<BeforeInstallPromptEvent, never, never>;
	readonly showPrompt: (event: BeforeInstallPromptEvent) => Effect.Effect<void, never, never>;
}

export class InstallService extends Effect.Service<InstallServiceApi>()("InstallService", {
	accessors: true,
	effect: Effect.succeed({
		installEvents: Stream.async<BeforeInstallPromptEvent, never, never>((emit) => {
			const handler = (e: Event) => {
				const event = e as BeforeInstallPromptEvent;
				event.preventDefault();
				emit(Effect.succeed(Chunk.make(event)));
			};
			window.addEventListener("beforeinstallprompt", handler);
			return Effect.sync(() => window.removeEventListener("beforeinstallprompt", handler));
		}),
		showPrompt: Effect.fn("InstallService.showPrompt")((event: BeforeInstallPromptEvent) =>
			Effect.promise(async () => {
				try {
					await event.prompt();
				} catch {
					// Browser might block prompt
				}
			}),
		),
	}),
}) {}

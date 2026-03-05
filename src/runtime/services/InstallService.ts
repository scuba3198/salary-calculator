import { Chunk, Context, Effect, Layer, Stream } from "effect";

export interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export interface InstallService {
    readonly installEvents: Stream.Stream<BeforeInstallPromptEvent, never, never>;
    readonly showPrompt: (event: BeforeInstallPromptEvent) => Effect.Effect<void, never, never>;
}

export const InstallService = Context.GenericTag<InstallService>("InstallService");

export const InstallServiceLive = Layer.succeed(InstallService, {
    installEvents: Stream.async<BeforeInstallPromptEvent, never, never>((emit) => {
        const handler = (e: Event) => {
            const event = e as BeforeInstallPromptEvent;
            event.preventDefault();
            emit(Effect.succeed(Chunk.make(event)));
        };
        window.addEventListener("beforeinstallprompt", handler);
        return Effect.sync(() => window.removeEventListener("beforeinstallprompt", handler));
    }),
    showPrompt: (event: BeforeInstallPromptEvent) =>
        Effect.promise(async () => {
            try {
                await event.prompt();
            } catch (e) {
                // Browser might block prompt
            }
        }),
});

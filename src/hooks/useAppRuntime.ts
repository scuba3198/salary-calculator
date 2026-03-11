import { Effect, Queue, Stream } from "effect";
import { useCallback, useSyncExternalStore } from "react";
import type { AppIntent } from "../runtime/AppIntent";
import { type AppState, initialAppState } from "../runtime/AppState";
import { runFork } from "../runtime/runtime";

// Module-level state for external store
let snapshot: AppState = initialAppState;
const listeners = new Set<() => void>();
let intentQueue: Queue.Queue<AppIntent> | null = null;

/**
 * Initializes the React bridge by subscribing to the state stream
 * and storing the intent queue.
 */
export function __bridgeInit(
	stateStream: Stream.Stream<AppState, never, never>,
	queue: Queue.Queue<AppIntent>,
) {
	intentQueue = queue;
	// Drain the state stream
	runFork(
		stateStream.pipe(
			Stream.tap((s) =>
				Effect.sync(() => {
					snapshot = s;
					for (const listener of listeners) {
						listener();
					}
				}),
			),
			Stream.runDrain,
			Effect.forkDaemon, // Ensure it lives outside the boot scope
		),
	);
}

/**
 * Hook to access the current application state.
 * Uses useSyncExternalStore for efficient re-renders.
 */
export function useAppState(): AppState {
	return useSyncExternalStore(
		useCallback((callback: () => void) => {
			listeners.add(callback);
			return () => {
				listeners.delete(callback);
			};
		}, []),
		() => snapshot,
	);
}

/**
 * Dispatches an intent to the Effect runtime.
 */
export function dispatch(intent: AppIntent): void {
	if (intentQueue) {
		runFork(Queue.offer(intentQueue, intent));
	}
}

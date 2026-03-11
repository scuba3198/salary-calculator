import type { Effect, Layer, ManagedRuntime } from "effect";
import { ManagedRuntime as ManagedRuntimeMod } from "effect";

let runtime: ManagedRuntime.ManagedRuntime<unknown, unknown> | null = null;

export const initRuntime = <R, E>(layer: Layer.Layer<R, E, never>) => {
	const r = ManagedRuntimeMod.make(layer);
	runtime = r as unknown as ManagedRuntime.ManagedRuntime<unknown, unknown>;
	return r;
};

export const getRuntime = () => {
	if (!runtime) throw new Error("Effect runtime not initialized");
	return runtime;
};

export const runFork = <A, E>(effect: Effect.Effect<A, E, unknown>) => getRuntime().runFork(effect);
export const runPromise = <A, E>(effect: Effect.Effect<A, E, unknown>) =>
	getRuntime().runPromise(effect);
export const runPromiseExit = <A, E>(effect: Effect.Effect<A, E, unknown>) =>
	getRuntime().runPromiseExit(effect);

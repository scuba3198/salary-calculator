import { DefaultServices, Effect, Layer } from "effect";
import React from "react";
import type { Root } from "react-dom/client";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { __bridgeInit } from "./hooks/useAppRuntime.ts";
import { appProgram } from "./runtime/AppRuntime.ts";
import { initRuntime } from "./runtime/runtime.ts";
import { AppConfigService } from "./runtime/services/AppConfigService.ts";
import { AppLogger } from "./runtime/services/AppLogger.ts";
import { AttendanceService } from "./runtime/services/AttendanceService.ts";
import { AuthService } from "./runtime/services/AuthService.ts";
import { InstallService } from "./runtime/services/InstallService.ts";
import { LocalStorageService } from "./runtime/services/LocalStorageService.ts";
import { OrgService } from "./runtime/services/OrgService.ts";
import { SettingsService } from "./runtime/services/SettingsService.ts";
import { SupabaseService } from "./runtime/services/SupabaseService.ts";

/**
 * Bootstraps the application by running the Effect program,
 * initializing the React bridge, and mounting the root component.
 */
const MainLive = Layer.mergeAll(
	Layer.succeedContext(DefaultServices.liveServices),
	AppConfigService.Default,
	AppLogger.Default,
	SupabaseService.Default,
	LocalStorageService.Default,
	AuthService.Default,
	AttendanceService.Default,
	InstallService.Default,
	OrgService.Default,
	SettingsService.Default,
);
const runtime = initRuntime(MainLive);

runtime
	.runPromise(appProgram)
	.then(({ stateStream, intentQueue }) => {
		// 1. Initialize the React/Effect bridge
		__bridgeInit(stateStream, intentQueue);

		// 2. Mount the React application
		const rootElement = document.getElementById("root");
		if (rootElement) {
			const win = window as Window & { __reactRoot?: Root };
			if (!win.__reactRoot) {
				win.__reactRoot = ReactDOM.createRoot(rootElement);
			} else {
			}

			win.__reactRoot.render(
				<React.StrictMode>
					<App />
				</React.StrictMode>,
			);
		}
	})
	.catch((err) => {
		// Edge: boot failures can only be logged via the runtime.
		runtime.runFork(
			AppLogger.bootFailure(err).pipe(Effect.catchAllCause((cause) => Effect.logError(cause))),
		);
	});

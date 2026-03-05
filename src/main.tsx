import { Layer, ManagedRuntime } from "effect";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { __bridgeInit } from "./hooks/useAppRuntime.ts";
import { appProgram } from "./runtime/AppRuntime.ts";
import { AuthServiceLive } from "./runtime/services/AuthService.ts";
import { InstallServiceLive } from "./runtime/services/InstallService.ts";
import { SupabaseServiceLive } from "./runtime/services/SupabaseService.ts";

/**
 * Bootstraps the application by running the Effect program,
 * initializing the React bridge, and mounting the root component.
 */
const MainLive = Layer.mergeAll(SupabaseServiceLive, AuthServiceLive, InstallServiceLive);
const runtime = ManagedRuntime.make(MainLive);

runtime.runPromise(appProgram).then(({ stateStream, intentQueue }) => {
	// 1. Initialize the React/Effect bridge
	__bridgeInit(stateStream, intentQueue);

	// 2. Mount the React application
	const rootElement = document.getElementById("root");
	if (rootElement) {
		const win = window as any;
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
}).catch(err => {
	console.error("[Main] Critical initialization failure:", err);
});

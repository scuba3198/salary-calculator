/// <reference types="vitest" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		react(),
		VitePWA({
			registerType: "autoUpdate",
			includeAssets: ["favicon.png"],
			manifest: {
				name: "Salary Calculator",
				short_name: "SalaryCalc",
				description: "A professional salary calculator for Nepal",
				theme_color: "#ffffff",
				icons: [
					{
						src: "favicon.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "any maskable",
					},
				],
			},
			devOptions: {
				enabled: true,
			},
		}),
	],
	base: "/salary-calculator/",
	server: {
		port: 5173,
		strictPort: true,
	},
	preview: {
		port: 4173,
		strictPort: true,
	},
	test: {
		globals: true,
		environment: "jsdom",
		setupFiles: "./src/setupTests.ts",
		exclude: ["**/e2e/**", "**/node_modules/**", "**/dist/**"],
		env: {
			VITE_SUPABASE_URL: "https://dummy.supabase.co",
			VITE_SUPABASE_ANON_KEY: "dummy-key",
		},
	},
});

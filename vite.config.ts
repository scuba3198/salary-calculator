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
		}),
	],
	base: "/salary-calculator/",
});

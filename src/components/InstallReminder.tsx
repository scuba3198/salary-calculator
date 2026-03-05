import { Smartphone, X } from "lucide-react";
import { dispatch, useAppState } from "../hooks/useAppRuntime";

export default function InstallReminder() {
	const { isInstallPromptVisible } = useAppState();

	if (!isInstallPromptVisible) return null;

	return (
		<div
			style={{
				background: "var(--text-main)",
				color: "var(--canvas)",
				padding: "0.75rem 1rem",
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				gap: "1rem",
				fontSize: "0.875rem",
				fontWeight: "500",
				boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
				zIndex: 999,
				position: "sticky",
				top: 0,
			}}
		>
			<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
				<Smartphone size={20} />
				<span>Use this app for a better experience on mobile!</span>
			</div>
			<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
				<button
					type="button"
					onClick={() => dispatch({ _tag: "PromptInstall" })}
					style={{
						background: "var(--accent)",
						border: "none",
						color: "#ffffff",
						padding: "0.5rem 1rem",
						borderRadius: "0.375rem",
						cursor: "pointer",
						fontSize: "0.875rem",
						fontWeight: "bold",
					}}
				>
					Install App
				</button>
				<button
					type="button"
					onClick={() => dispatch({ _tag: "DismissInstallPrompt" })}
					style={{
						background: "none",
						border: "none",
						color: "inherit",
						cursor: "pointer",
						padding: "0.25rem",
						display: "flex",
					}}
				>
					<X size={18} />
				</button>
			</div>
		</div>
	);
}

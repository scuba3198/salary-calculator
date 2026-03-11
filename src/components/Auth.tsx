import { Option } from "effect";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import { useState } from "react";
import { dispatch, useAppState } from "../hooks/useAppRuntime";

export default function Auth() {
	const state = useAppState();
	const { loadingAuth, globalAlert } = state;
	const globalAlertMessage = Option.getOrUndefined(globalAlert);

	const [isSignUp, setIsSignUp] = useState<boolean>(false);
	const [email, setEmail] = useState<string>("");
	const [fullName, setFullName] = useState<string>("");
	const [password, setPassword] = useState<string>("");
	const [confirmPassword, setConfirmPassword] = useState<string>("");
	const [localError, setLocalError] = useState<string | null>(null);

	const handleAuth = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setLocalError(null);

		if (isSignUp) {
			if (password !== confirmPassword) {
				setLocalError("Passwords do not match");
				return;
			}
			dispatch({ _tag: "SubmitSignUp", email, password, fullName });
		} else {
			dispatch({ _tag: "SubmitLogin", email, password });
		}
	};

	return (
		<div
			className="auth-container"
			style={{
				padding: "2rem",
				maxWidth: "400px",
				margin: "0 auto",
				background: "var(--surface)",
				borderRadius: "1rem",
				border: "1px solid var(--border)",
			}}
		>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					marginBottom: "1.5rem",
				}}
			>
				<div
					style={{
						padding: "1rem",
						borderRadius: "50%",
						background: "var(--primary-light)",
						color: "var(--primary)",
						marginBottom: "1rem",
					}}
				>
					{isSignUp ? <UserPlus size={24} /> : <LogIn size={24} />}
				</div>
				<h2 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
					{isSignUp ? "Create Account" : "Welcome Back"}
				</h2>
				<p style={{ color: "var(--text-secondary)" }}>
					{isSignUp
						? "Sign up to sync your data across devices"
						: "Login to access your saved data"}
				</p>
			</div>

			<form onSubmit={handleAuth} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
				{isSignUp && (
					<div>
						<label
							htmlFor="fullName"
							style={{
								display: "block",
								marginBottom: "0.5rem",
								fontWeight: "500",
							}}
						>
							Full Name
						</label>
						<input
							id="fullName"
							type="text"
							value={fullName}
							onChange={(e) => setFullName(e.target.value)}
							className="minimal-input"
							style={{
								width: "100%",
								padding: "0.75rem",
								background: "transparent",
								border: "none",
								borderBottom: "1px solid var(--border-light)",
								color: "var(--text-main)",
							}}
							placeholder="John Doe"
							required
						/>
					</div>
				)}
				<div>
					<label
						htmlFor="email"
						style={{
							display: "block",
							marginBottom: "0.5rem",
							fontWeight: "500",
						}}
					>
						Email
					</label>
					<input
						id="email"
						type="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						className="minimal-input"
						style={{
							width: "100%",
							padding: "0.75rem",
							background: "transparent",
							border: "none",
							borderBottom: "1px solid var(--border-light)",
							color: "var(--text-main)",
						}}
						placeholder="you@example.com"
						required
					/>
				</div>
				<div>
					<label
						htmlFor="password"
						style={{
							display: "block",
							marginBottom: "0.5rem",
							fontWeight: "500",
						}}
					>
						Password
					</label>
					<input
						id="password"
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						className="minimal-input"
						style={{
							width: "100%",
							padding: "0.75rem",
							background: "transparent",
							border: "none",
							borderBottom: "1px solid var(--border-light)",
							color: "var(--text-main)",
						}}
						placeholder="••••••••"
						required
						minLength={6}
					/>
				</div>

				{isSignUp && (
					<div>
						<label
							htmlFor="confirmPassword"
							style={{
								display: "block",
								marginBottom: "0.5rem",
								fontWeight: "500",
							}}
						>
							Confirm Password
						</label>
						<input
							id="confirmPassword"
							type="password"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							className="minimal-input"
							style={{
								width: "100%",
								padding: "0.75rem",
								background: "transparent",
								border: "none",
								borderBottom: "1px solid var(--border-light)",
								color: "var(--text-main)",
							}}
							placeholder="••••••••"
							required
							minLength={6}
						/>
					</div>
				)}

				{(localError || globalAlertMessage) && (
					<div
						style={{
							padding: "0.75rem",
							borderRadius: "0.5rem",
							background: "#fee2e2",
							color: "#dc2626",
							fontSize: "0.875rem",
						}}
					>
						{localError || globalAlertMessage}
					</div>
				)}

				<button
					type="submit"
					disabled={loadingAuth}
					className="primary-btn"
					style={{
						width: "100%",
						padding: "1rem",
						fontWeight: "600",
						cursor: loadingAuth ? "not-allowed" : "pointer",
						opacity: loadingAuth ? 0.7 : 1,
					}}
				>
					{loadingAuth && <Loader2 className="animate-spin" size={20} />}
					{isSignUp ? "Sign Up" : "Login"}
				</button>
			</form>

			<div
				style={{
					marginTop: "1.5rem",
					textAlign: "center",
					fontSize: "0.875rem",
				}}
			>
				<button
					type="button"
					onClick={() => {
						setIsSignUp(!isSignUp);
						setLocalError(null);
						dispatch({ _tag: "DismissAlert" });
					}}
					style={{
						background: "none",
						border: "none",
						color: "var(--primary)",
						cursor: "pointer",
						textDecoration: "underline",
					}}
				>
					{isSignUp ? "Already have an account? Login" : "Don't have an account? Sign Up"}
				</button>
			</div>
		</div>
	);
}

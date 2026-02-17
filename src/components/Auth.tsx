import { Loader2, LogIn, UserPlus } from "lucide-react";
import { useState } from "react";
import { supabase } from "../utils/supabase";

export default function Auth() {
	const [loading, setLoading] = useState<boolean>(false);
	const [email, setEmail] = useState<string>("");
	const [fullName, setFullName] = useState<string>("");
	const [password, setPassword] = useState<string>("");
	const [confirmPassword, setConfirmPassword] = useState<string>("");
	const [isSignUp, setIsSignUp] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [message, setMessage] = useState<string | null>(null);

	const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setLoading(true);
		setError(null);
		setMessage(null);

		// Validation
		if (isSignUp && password !== confirmPassword) {
			setError("Passwords do not match");
			setLoading(false);
			return;
		}

		try {
			if (isSignUp) {
				// Try to sign up
				const { error, data } = await supabase.auth.signUp({
					email,
					password,
					options: {
						data: {
							full_name: fullName,
						},
					},
				});
				if (error) throw error;

				if (data?.user && !data.session) {
					setMessage(
						"Account created! Please check your email for the confirmation link.",
					);
				} else {
					setMessage("Account created! You are logged in.");
				}
			} else {
				const { error } = await supabase.auth.signInWithPassword({
					email,
					password,
				});
				if (error) throw error;
			}
		} catch (err: any) {
			setError(err.message);
		} finally {
			setLoading(false);
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

			<form
				onSubmit={handleAuth}
				style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
			>
				{isSignUp && (
					<div>
						<label
							style={{
								display: "block",
								marginBottom: "0.5rem",
								fontWeight: "500",
							}}
						>
							Full Name
						</label>
						<input
							type="text"
							value={fullName}
							onChange={(e) => setFullName(e.target.value)}
							style={{
								width: "100%",
								padding: "0.75rem",
								borderRadius: "0.5rem",
								border: "1px solid var(--border)",
								background: "var(--background)",
								color: "var(--text)",
							}}
							placeholder="John Doe"
							required
						/>
					</div>
				)}
				<div>
					<label
						style={{
							display: "block",
							marginBottom: "0.5rem",
							fontWeight: "500",
						}}
					>
						Email
					</label>
					<input
						type="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						style={{
							width: "100%",
							padding: "0.75rem",
							borderRadius: "0.5rem",
							border: "1px solid var(--border)",
							background: "var(--background)",
							color: "var(--text)",
						}}
						placeholder="you@example.com"
						required
					/>
				</div>
				<div>
					<label
						style={{
							display: "block",
							marginBottom: "0.5rem",
							fontWeight: "500",
						}}
					>
						Password
					</label>
					<input
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						style={{
							width: "100%",
							padding: "0.75rem",
							borderRadius: "0.5rem",
							border: "1px solid var(--border)",
							background: "var(--background)",
							color: "var(--text)",
						}}
						placeholder="••••••••"
						required
						minLength={6}
					/>
				</div>

				{isSignUp && (
					<div>
						<label
							style={{
								display: "block",
								marginBottom: "0.5rem",
								fontWeight: "500",
							}}
						>
							Confirm Password
						</label>
						<input
							type="password"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							style={{
								width: "100%",
								padding: "0.75rem",
								borderRadius: "0.5rem",
								border: "1px solid var(--border)",
								background: "var(--background)",
								color: "var(--text)",
							}}
							placeholder="••••••••"
							required
							minLength={6}
						/>
					</div>
				)}

				{error && (
					<div
						style={{
							padding: "0.75rem",
							borderRadius: "0.5rem",
							background: "#fee2e2",
							color: "#dc2626",
							fontSize: "0.875rem",
						}}
					>
						{error}
					</div>
				)}

				{message && (
					<div
						style={{
							padding: "0.75rem",
							borderRadius: "0.5rem",
							background: "#dcfce7",
							color: "#16a34a",
							fontSize: "0.875rem",
						}}
					>
						{message}
					</div>
				)}

				<button
					type="submit"
					disabled={loading}
					style={{
						width: "100%",
						padding: "0.75rem",
						borderRadius: "0.5rem",
						border: "none",
						background: "var(--primary)",
						color: "white",
						fontWeight: "600",
						cursor: loading ? "not-allowed" : "pointer",
						display: "flex",
						justifyContent: "center",
						alignItems: "center",
						gap: "0.5rem",
						opacity: loading ? 0.7 : 1,
					}}
				>
					{loading && <Loader2 className="animate-spin" size={20} />}
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
					onClick={() => {
						setIsSignUp(!isSignUp);
						setError(null);
						setMessage(null);
					}}
					style={{
						background: "none",
						border: "none",
						color: "var(--primary)",
						cursor: "pointer",
						textDecoration: "underline",
					}}
				>
					{isSignUp
						? "Already have an account? Login"
						: "Don't have an account? Sign Up"}
				</button>
			</div>
		</div>
	);
}

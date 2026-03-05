import { Effect } from "effect";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
	children: ReactNode;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
	public override state: State = {
		hasError: false,
		error: null,
	};

	public static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		const logPayload = {
			error: error.message,
			stack: error.stack,
			componentStack: errorInfo.componentStack,
			timestamp: new Date().toISOString(),
		};

		// Use Effect for structured logging even in the boundary
		// We use runSync because we are in a synchronous React lifecycle
		Effect.runSync(Effect.logError(logPayload));
	}

	private handleReset = () => {
		window.location.reload();
	};

	public override render() {
		if (this.state.hasError) {
			return (
				<div
					style={{
						minHeight: "100vh",
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
						padding: "2rem",
						textAlign: "center",
						background: "var(--canvas)",
						color: "var(--text-main)",
					}}
				>
					<div
						style={{
							maxWidth: "500px",
							display: "flex",
							flexDirection: "column",
							gap: "1.5rem",
						}}
					>
						<div
							style={{
								display: "flex",
								justifyContent: "center",
								color: "var(--accent)",
							}}
						>
							<AlertTriangle size={64} strokeWidth={1.5} />
						</div>

						<h1 style={{ fontSize: "2rem", margin: 0 }}>Something went wrong</h1>

						<p style={{ opacity: 0.8, lineHeight: 1.6 }}>
							An unexpected error occurred. We've logged the details and you can try refreshing the
							application.
						</p>

						{this.state.error && (
							<pre
								style={{
									padding: "1rem",
									background: "var(--surface)",
									border: "1px solid var(--border-light)",
									borderRadius: "0.5rem",
									fontSize: "0.8rem",
									textAlign: "left",
									overflowX: "auto",
									maxHeight: "200px",
									opacity: 0.7,
								}}
							>
								{this.state.error.message}
							</pre>
						)}

						<button
							type="button"
							onClick={this.handleReset}
							className="primary-btn"
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								gap: "0.75rem",
								padding: "1rem 2rem",
								fontSize: "1rem",
								fontWeight: "600",
							}}
						>
							<RefreshCcw size={20} />
							Refresh Application
						</button>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}

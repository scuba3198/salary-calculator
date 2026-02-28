import React from "react";

interface Props {
	children: React.ReactNode;
}

interface State {
	hasError: boolean;
	error: Error | null;
	errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends React.Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false, error: null, errorInfo: null };
	}

	static getDerivedStateFromError(error: Error): Partial<State> {
		return { hasError: true, error };
	}

	override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		console.error("Uncaught error:", error, errorInfo);
		this.setState({ errorInfo });
	}

	override render() {
		if (this.state.hasError) {
			return (
				<div
					style={{
						padding: "2rem",
						color: "white",
						background: "#333",
						minHeight: "100vh",
					}}
				>
					<h1>Something went wrong.</h1>
					<details style={{ whiteSpace: "pre-wrap", marginTop: "1rem" }}>
						{this.state.error?.toString()}
						<br />
						{this.state.errorInfo?.componentStack}
					</details>
					<button
						type="button"
						onClick={() => {
							localStorage.clear();
							window.location.reload();
						}}
						style={{
							marginTop: "1rem",
							padding: "0.5rem 1rem",
							background: "red",
							color: "white",
							border: "none",
						}}
					>
						Clear Data & Reload
					</button>
				</div>
			);
		}

		return this.props.children;
	}
}

export default ErrorBoundary;

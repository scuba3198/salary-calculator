import { AlertTriangle, Briefcase, LogIn, LogOut, Moon, Sun, X } from "lucide-react";
import { useState } from "react";
import Auth from "./components/Auth";
import Calendar from "./components/Calendar";
import InstallReminder from "./components/InstallReminder";
import OrganizationManager from "./components/OrganizationManager";
import SalaryStats from "./components/SalaryStats";
import { dispatch, useAppState } from "./hooks/useAppRuntime";

function App() {
	const state = useAppState();
	const { user, loadingAuth, theme, organizations, currentOrgId, globalAlert, globalConfirm } = state;

	const currentOrg = organizations.find((o) => o.id === currentOrgId) ?? null;

	const [showAuth, setShowAuth] = useState(false);
	const [showOrgManager, setShowOrgManager] = useState(false);

	return (
		<>
			{loadingAuth ? (
				<div className="loading-screen" style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
					<div className="loading-spinner">Initializing Workspace...</div>
				</div>
			) : (
				<>
					{!user && (
						<div
							style={{
								background: "var(--text-main)",
								color: "var(--canvas)",
								padding: "0.5rem 1rem",
								textAlign: "center",
								fontSize: "0.75rem",
								fontWeight: "600",
								textTransform: "uppercase",
								letterSpacing: "0.05em",
								width: "100%",
								position: "relative",
								zIndex: 50,
							}}
						>
							Guest Mode: Data is unsaved. Login to save your progress.
						</div>
					)}
					<div className="minimal-container" style={{ position: "relative" }}>
						<div className="grain-overlay" />
						<InstallReminder />
						<header className="app-header">
							<div className="app-title-area">
								<h1>
									Nepali Salary
									<br />
									Calculator
								</h1>
								<p>Track your work days and calculate your monthly earnings.</p>
							</div>
							<div className="header-actions">
								<button
									type="button"
									onClick={() => dispatch({ _tag: "ToggleTheme" })}
									className="icon-btn"
									title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
								>
									{theme === "dark" ? <Sun size={24} /> : <Moon size={24} />}
								</button>

								<div className="user-controls">
									<div className="user-info">
										<span
											style={{
												display: "block",
												fontSize: "0.9rem",
												fontWeight: "500",
												letterSpacing: "0.02em",
											}}
										>
											{(user?.user_metadata as { full_name?: string })?.full_name ||
												(user ? "User" : "Guest")}
										</span>
										{currentOrg && (
											<button
												type="button"
												onClick={() => setShowOrgManager(true)}
												style={{
													display: "flex",
													alignItems: "center",
													justifyContent: "flex-end",
													gap: "0.5rem",
													fontSize: "0.75rem",
													color: "var(--accent)",
													background: "none",
													border: "none",
													cursor: "pointer",
													padding: "0.25rem 0",
													textTransform: "uppercase",
													letterSpacing: "0.05em",
												}}
											>
												<Briefcase size={14} /> {currentOrg.name}
												{!user && <span style={{ opacity: 1, fontWeight: "bold" }}>(Draft)</span>}
											</button>
										)}
									</div>

									{user ? (
										<button
											type="button"
											onClick={() => dispatch({ _tag: "ForceLogout" })}
											className="icon-btn"
											title="Logout"
										>
											<LogOut size={24} />
										</button>
									) : (
										<button
											type="button"
											onClick={() => setShowAuth(true)}
											className="primary-btn"
											style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
										>
											<LogIn size={18} /> Login
										</button>
									)}
								</div>
							</div>
						</header>

						<main style={{ display: "flex", flexDirection: "column", gap: "4rem" }}>
							<div className="calendar-wrapper editorial-panel">
								<Calendar />
							</div>
							<div className="editorial-panel">
								<SalaryStats />
							</div>
						</main>

						<footer
							style={{
								marginTop: "4rem",
								paddingTop: "2rem",
								borderTop: "1px solid var(--border-light)",
								textAlign: "left",
								fontSize: "0.8rem",
								textTransform: "uppercase",
								letterSpacing: "0.05em",
								color: "var(--text-main)",
								opacity: 0.8,
							}}
						>
							Design / Mumukshu D.C
						</footer>

						{showAuth && !user && (
							<div
								onClick={() => setShowAuth(false)}
								style={{
									position: "fixed",
									top: 0,
									left: 0,
									right: 0,
									bottom: 0,
									background: "rgba(0,0,0,0.8)",
									backdropFilter: "blur(4px)",
									zIndex: 1000,
									display: "flex",
									justifyContent: "center",
									alignItems: "center",
									padding: "1rem",
								}}
							>
								<div
									onClick={(e) => e.stopPropagation()}
									style={{
										position: "relative",
										width: "100%",
										maxWidth: "400px",
										background: "var(--canvas)",
										padding: "2rem",
										border: "1px solid var(--border-light)",
										maxHeight: "90vh",
										overflowY: "auto",
									}}
								>
									<button
										type="button"
										onClick={() => setShowAuth(false)}
										className="icon-btn"
										style={{
											position: "absolute",
											top: "1rem",
											right: "1rem",
										}}
									>
										<X size={24} />
									</button>
									<Auth />
								</div>
							</div>
						)}

						{showOrgManager && (
							<div
								onClick={() => setShowOrgManager(false)}
								style={{
									position: "fixed",
									top: 0,
									left: 0,
									right: 0,
									bottom: 0,
									background: "rgba(0,0,0,0.8)",
									backdropFilter: "blur(4px)",
									zIndex: 1000,
									display: "flex",
									justifyContent: "center",
									alignItems: "center",
									padding: "1rem",
								}}
							>
								<div
									onClick={(e) => e.stopPropagation()}
									style={{
										position: "relative",
										width: "100%",
										maxWidth: "500px",
										background: "var(--canvas)",
										padding: "2rem",
										border: "1px solid var(--border-light)",
										maxHeight: "90vh",
										overflowY: "auto",
									}}
								>
									<OrganizationManager onClose={() => setShowOrgManager(false)} />
								</div>
							</div>
						)}

						{/* Global Alert Modal */}
						{globalAlert && (
							<div
								onClick={() => dispatch({ _tag: "DismissAlert" })}
								style={{
									position: "fixed",
									top: 0,
									left: 0,
									right: 0,
									bottom: 0,
									background: "rgba(0,0,0,0.8)",
									backdropFilter: "blur(4px)",
									zIndex: 9999,
									display: "flex",
									justifyContent: "center",
									alignItems: "center",
									padding: "1rem",
								}}
							>
								<div
									onClick={(e) => e.stopPropagation()}
									style={{
										position: "relative",
										width: "100%",
										maxWidth: "400px",
										background: "var(--canvas)",
										padding: "2rem",
										border: "1px solid var(--border-light)",
										display: "flex",
										flexDirection: "column",
										gap: "1.5rem",
										textAlign: "center",
									}}
								>
									<div style={{ display: "flex", justifyContent: "center", color: "var(--accent)" }}>
										<AlertTriangle size={48} strokeWidth={1.5} />
									</div>
									<p style={{ fontSize: "1.1rem", lineHeight: 1.5, margin: 0 }}>{globalAlert}</p>
									<button
										type="button"
										onClick={() => dispatch({ _tag: "DismissAlert" })}
										className="primary-btn"
										style={{ width: "100%" }}
									>
										Got It
									</button>
								</div>
							</div>
						)}

						{/* Global Confirm Modal */}
						{globalConfirm && (
							<div
								onClick={() => dispatch({ _tag: "DismissConfirm" })}
								style={{
									position: "fixed",
									top: 0,
									left: 0,
									right: 0,
									bottom: 0,
									background: "rgba(0,0,0,0.8)",
									backdropFilter: "blur(4px)",
									zIndex: 9999,
									display: "flex",
									justifyContent: "center",
									alignItems: "center",
									padding: "1rem",
								}}
							>
								<div
									onClick={(e) => e.stopPropagation()}
									style={{
										position: "relative",
										width: "100%",
										maxWidth: "400px",
										background: "var(--canvas)",
										padding: "2rem",
										border: "1px solid var(--border-light)",
										display: "flex",
										flexDirection: "column",
										gap: "1.5rem",
										textAlign: "center",
									}}
								>
									<h3 style={{ fontSize: "1.5rem", margin: 0 }}>Are you sure?</h3>
									<p style={{ fontSize: "1.1rem", lineHeight: 1.5, margin: 0, opacity: 0.8 }}>
										{globalConfirm.message}
									</p>
									<div style={{ display: "flex", gap: "1rem" }}>
										<button
											type="button"
											onClick={() => dispatch({ _tag: "DismissConfirm" })}
											className="icon-btn"
											style={{ flex: 1, border: "1px solid var(--border-light)", borderRadius: 0 }}
										>
											Cancel
										</button>
										<button
											type="button"
											onClick={() => dispatch(globalConfirm.intentOnConfirm)}
											className="primary-btn"
											style={{ flex: 1 }}
										>
											Confirm
										</button>
									</div>
								</div>
							</div>
						)}
					</div>
				</>
			)}
		</>
	);
}

export default App;

import { Banknote, Clock } from "lucide-react";
import { useAppStore } from "../store";

const SalaryStats = () => {
	const {
		hourlyRate,
		setHourlyRate,
		dailyHours,
		setDailyHours,
		tdsPercentage,
		setTdsPercentage,
		getMonthlyStats,
	} = useAppStore();

	const stats = getMonthlyStats();

	return (
		<div className="stats-container">
			<div className="stat-box">
				<div className="mb-4" style={{ opacity: 0.8 }}>
					<Banknote size={24} strokeWidth={1.5} />
				</div>
				<h2 style={{ fontSize: "2rem", marginBottom: "2rem" }}>Earnings.</h2>

				<div style={{ display: "flex", flexDirection: "column", gap: "2rem", width: "100%" }}>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "flex-end",
							borderBottom: "1px solid var(--border-light)",
							paddingBottom: "0.5rem",
						}}
					>
						<span className="label" style={{ margin: 0 }}>
							Total Days
						</span>
						<span className="value" style={{ fontSize: "2rem" }}>
							{stats.daysWorked}
						</span>
					</div>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "flex-end",
							borderBottom: "1px solid var(--border-light)",
							paddingBottom: "0.5rem",
						}}
					>
						<span className="label" style={{ margin: 0 }}>
							Total Hours
						</span>
						<span className="value" style={{ fontSize: "2rem" }}>
							{stats.totalHours}
						</span>
					</div>

					<div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
						<div style={{ display: "flex", justifyContent: "space-between", opacity: 0.6 }}>
							<span
								style={{
									fontFamily: "var(--font-body)",
									textTransform: "uppercase",
									fontSize: "0.8rem",
									letterSpacing: "0.05em",
								}}
							>
								Gross
							</span>
							<span style={{ fontFamily: "var(--font-body)" }}>
								Rs. {stats.grossSalary.toLocaleString()}
							</span>
						</div>
						<div
							style={{ display: "flex", justifyContent: "space-between", color: "var(--accent)" }}
						>
							<span
								style={{
									fontFamily: "var(--font-body)",
									textTransform: "uppercase",
									fontSize: "0.8rem",
									letterSpacing: "0.05em",
								}}
							>
								TDS ({tdsPercentage}%)
							</span>
							<span style={{ fontFamily: "var(--font-body)" }}>
								- Rs. {stats.tdsAmount.toLocaleString()}
							</span>
						</div>
					</div>

					<div
						style={{
							marginTop: "2rem",
							paddingTop: "2rem",
							borderTop: "2px solid var(--text-main)",
						}}
					>
						<span className="label">Net Salary</span>
						<div className="value" style={{ color: "var(--accent)", marginTop: "0.5rem" }}>
							Rs. {stats.netSalary.toLocaleString()}
						</div>
					</div>
				</div>
			</div>

			<div className="stat-box">
				<div className="mb-4" style={{ opacity: 0.8 }}>
					<Clock size={24} strokeWidth={1.5} />
				</div>
				<h2 style={{ fontSize: "2rem", marginBottom: "2rem" }}>Settings.</h2>
				<div
					style={{
						textAlign: "left",
						display: "flex",
						flexDirection: "column",
						gap: "2.5rem",
						width: "100%",
					}}
				>
					<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
						<label htmlFor="hourlyRate" className="label" style={{ opacity: 1 }}>
							Hourly Rate (Rs)
						</label>
						<input
							id="hourlyRate"
							type="number"
							min="0"
							value={hourlyRate || ""}
							placeholder="0"
							onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
								["-", "e", "E"].includes(e.key) && e.preventDefault()
							}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								setHourlyRate(e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))
							}
						/>
					</div>
					<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
						<label htmlFor="dailyHours" className="label" style={{ opacity: 1 }}>
							Daily Hours
						</label>
						<input
							id="dailyHours"
							type="number"
							min="0"
							max="24"
							value={dailyHours || ""}
							placeholder="0"
							onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
								["-", "e", "E"].includes(e.key) && e.preventDefault()
							}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								setDailyHours(
									e.target.value === "" ? 0 : Math.max(0, Math.min(24, Number(e.target.value))),
								)
							}
						/>
					</div>
					<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
						<label htmlFor="tdsPercentage" className="label" style={{ opacity: 1 }}>
							TDS (%)
						</label>
						<input
							id="tdsPercentage"
							type="number"
							min="0"
							max="100"
							value={tdsPercentage ?? ""}
							placeholder="0"
							onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
								["-", "e", "E"].includes(e.key) && e.preventDefault()
							}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								setTdsPercentage(
									e.target.value === "" ? "" : Math.max(0, Math.min(100, Number(e.target.value))),
								)
							}
						/>
					</div>
				</div>
			</div>
		</div>
	);
};

export default SalaryStats;

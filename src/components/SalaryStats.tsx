import { dispatch, useAppState } from "../hooks/useAppRuntime";
import { calculateMonthlyStats } from "../utils/calculations";

const SalaryStats = () => {
	const state = useAppState();
	const { markedDates, viewYear, viewMonth, organizations, currentOrgId, isSyncing } = state;

	const currentOrg = organizations.find((o) => o.id === currentOrgId) ?? null;
	const hourlyRate = currentOrg?.hourly_rate ?? 0;
	const dailyHours = currentOrg?.daily_hours ?? 8;
	const tdsPercentage = currentOrg?.tds_percentage ?? null;

	const stats = calculateMonthlyStats(
		markedDates,
		viewYear,
		viewMonth,
		hourlyRate,
		tdsPercentage ?? 0,
	);

	return (
		<div className="stats-card">
			<div className="card-header">
				<div className="main-stat">
					<span className="label">Monthly Net Salary</span>
					<div className="value">
						Rs. {Math.round(stats.netSalary).toLocaleString()}
					</div>
				</div>
				<div className="stats-meta">
					<div className="meta-item">
						<span className="label">Days Worked</span>
						<span className="value">{stats.daysWorked}</span>
					</div>
					<div className="meta-item">
						<span className="label">Total Hours</span>
						<span className="value">{stats.totalHours}</span>
					</div>
				</div>
			</div>

			<div className="stats-grid">
				<div className="input-group">
					<label htmlFor="hourlyRate">Hourly Rate (Rs)</label>
					<input
						id="hourlyRate"
						type="number"
						value={hourlyRate || ""}
						onChange={(e) =>
							dispatch({
								_tag: "SetHourlyRate",
								value: e.target.value === "" ? "" : Number(e.target.value),
							})
						}
						disabled={isSyncing}
						placeholder="0"
					/>
				</div>

				<div className="input-group">
					<label htmlFor="dailyHours">Default Daily Hours</label>
					<select
						id="dailyHours"
						value={dailyHours}
						onChange={(e) => dispatch({ _tag: "SetDailyHours", value: Number(e.target.value) })}
						disabled={isSyncing}
					>
						{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 16, 24].map((h) => (
							<option key={h} value={h}>
								{h} hours
							</option>
						))}
					</select>
				</div>

				<div className="input-group">
					<label htmlFor="tdsPercentage">TDS (%)</label>
					<input
						id="tdsPercentage"
						type="number"
						step="0.1"
						value={tdsPercentage ?? ""}
						onChange={(e) =>
							dispatch({
								_tag: "SetTdsPercentage",
								value: e.target.value === "" ? "" : Number(e.target.value),
							})
						}
						disabled={isSyncing}
						placeholder="None"
					/>
				</div>
			</div>

			<div className="stats-footer">
				<div className="footer-item">
					<span className="label">Gross Salary</span>
					<span className="value">Rs. {stats.grossSalary.toLocaleString()}</span>
				</div>
				<div className="footer-item">
					<span className="label">TDS Amount</span>
					<span className="value">Rs. {stats.tdsAmount.toLocaleString()}</span>
				</div>
				<button
					type="button"
					onClick={() => dispatch({ _tag: "RequestReset" })}
					disabled={isSyncing || stats.daysWorked === 0}
					className="reset-btn"
				>
					Reset Month
				</button>
			</div>
		</div>
	);
};

export default SalaryStats;

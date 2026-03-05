import { Schema } from "effect";
import { dispatch, useAppState } from "../hooks/useAppRuntime";
import { calculateMonthlyStats } from "../utils/calculations";

const DailyHoursSchema = Schema.Number.pipe(Schema.between(0, 24));
const HourlyRateSchema = Schema.Number.pipe(Schema.greaterThanOrEqualTo(0));
const TdsSchema = Schema.Number.pipe(Schema.between(0, 100));

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
						onChange={(e) => {
							if (e.target.value === "") {
								dispatch({ _tag: "SetHourlyRate", value: "" });
							} else {
								const decoded = Schema.decodeUnknownOption(HourlyRateSchema)(Number(e.target.value));
								if (decoded._tag === "Some") {
									dispatch({ _tag: "SetHourlyRate", value: decoded.value });
								} else {
									e.target.value = hourlyRate ? hourlyRate.toString() : "";
								}
							}
						}}
						disabled={isSyncing}
						placeholder="0"
						min="0"
						onKeyDown={(e) => {
							if (["-", "e", "E", "+"].includes(e.key)) {
								e.preventDefault();
							}
						}}
					/>
				</div>

				<div className="input-group">
					<label htmlFor="dailyHours">Daily Hours</label>
					<input
						id="dailyHours"
						type="number"
						value={dailyHours || ""}
						onChange={(e) => {
							if (e.target.value === "") {
								dispatch({ _tag: "SetDailyHours", value: "" });
							} else {
								const decoded = Schema.decodeUnknownOption(DailyHoursSchema)(Number(e.target.value));
								if (decoded._tag === "Some") {
									dispatch({ _tag: "SetDailyHours", value: decoded.value });
								} else {
									e.target.value = dailyHours ? dailyHours.toString() : "";
								}
							}
						}}
						disabled={isSyncing}
						placeholder=""
						step="0.5"
						min="0"
						max="24"
						onKeyDown={(e) => {
							if (["-", "e", "E", "+"].includes(e.key)) {
								e.preventDefault();
							}
						}}
					/>
				</div>

				<div className="input-group">
					<label htmlFor="tdsPercentage">TDS (%)</label>
					<input
						id="tdsPercentage"
						type="number"
						step="0.1"
						value={tdsPercentage ?? ""}
						onChange={(e) => {
							if (e.target.value === "") {
								dispatch({ _tag: "SetTdsPercentage", value: "" });
							} else {
								const decoded = Schema.decodeUnknownOption(TdsSchema)(Number(e.target.value));
								if (decoded._tag === "Some") {
									dispatch({ _tag: "SetTdsPercentage", value: decoded.value });
								} else {
									e.target.value = tdsPercentage !== null ? tdsPercentage.toString() : "";
								}
							}
						}}
						disabled={isSyncing}
						placeholder="None"
						min="0"
						max="100"
						onKeyDown={(e) => {
							if (["-", "e", "E", "+"].includes(e.key)) {
								e.preventDefault();
							}
						}}
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

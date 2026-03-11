export interface MonthlyStats {
	daysWorked: number;
	totalHours: number;
	totalSalary: number;
	grossSalary: number;
	tdsAmount: number;
	netSalary: number;
}

/**
 * Calculates monthly statistics using pure immutable operations.
 * Eliminates 'let', 'for' loops, and '.forEach' mutations.
 */
export const calculateMonthlyStats = (
	markedDates: Readonly<Record<string, number | string>>,
	viewYear: number,
	viewMonth: number, // 0-indexed month
	hourlyRate: number,
	tdsPercentage: number,
): MonthlyStats => {
	const { count, totalHours } = Object.entries(markedDates).reduce(
		(acc, [dateStr, dayHours]) => {
			const [y, m] = dateStr.split("-").map(Number);
			const isCurrentMonth = y === viewYear && m === viewMonth + 1;

			return isCurrentMonth
				? {
						count: acc.count + 1,
						totalHours: acc.totalHours + (Number(dayHours) || 0),
					}
				: acc;
		},
		{ count: 0, totalHours: 0 },
	);

	const rate = Number(hourlyRate || 0);
	const tds = Number(tdsPercentage || 0);

	const grossSalary = totalHours * rate;
	const tdsAmount = (grossSalary * tds) / 100;
	const netSalary = grossSalary - tdsAmount;

	return {
		daysWorked: count,
		totalHours,
		totalSalary: grossSalary, // For backwards compatibility
		grossSalary,
		tdsAmount,
		netSalary,
	};
};

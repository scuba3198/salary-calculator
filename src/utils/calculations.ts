export interface MonthlyStats {
    daysWorked: number;
    totalHours: number;
    totalSalary: number;
    grossSalary: number;
    tdsAmount: number;
    netSalary: number;
}

export function calculateMonthlyStats(
    markedDates: Record<string, number | string>,
    viewYear: number,
    viewMonth: number, // 0-indexed month
    hourlyRate: number,
    tdsPercentage: number,
): MonthlyStats {
    let count = 0;
    let totalHours = 0;

    Object.entries(markedDates).forEach(([dateStr, dayHours]) => {
        const [y, m] = dateStr.split("-").map(Number);
        if (y === viewYear && m === viewMonth + 1) {
            count++;
            totalHours += Number(dayHours) || 0;
        }
    });

    const rate = Number(hourlyRate || 0);
    const tds = Number(tdsPercentage || 0);

    const grossSalary = totalHours * rate;
    const tdsAmount = (grossSalary * tds) / 100;
    const netSalary = grossSalary - tdsAmount;

    return {
        daysWorked: count,
        totalHours,
        totalSalary: grossSalary, // For backwards compatibility if used
        grossSalary,
        tdsAmount,
        netSalary,
    };
}

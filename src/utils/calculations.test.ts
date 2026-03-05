import { describe, expect, it } from "vitest";
import { calculateMonthlyStats } from "./calculations";

describe("calculateMonthlyStats", () => {
	it("should return zero for empty markedDates", () => {
		const stats = calculateMonthlyStats({}, 2081, 1, 100, 1);
		expect(stats.daysWorked).toBe(0);
		expect(stats.totalHours).toBe(0);
		expect(stats.grossSalary).toBe(0);
		expect(stats.tdsAmount).toBe(0);
		expect(stats.netSalary).toBe(0);
	});

	it("should only count dates that match the specific viewYear and viewMonth", () => {
		const markedDates = {
			"2081-02-01": 8, // viewMonth is 1
			"2081-02-02": 8,
			"2081-03-01": 8, // Wrong month
			"2080-02-01": 8, // Wrong year
		};
		// viewMonth is 0-indexed, so 1 means the 2nd month (e.g. Jestha) => split gets "02"
		const stats = calculateMonthlyStats(markedDates, 2081, 1, 100, 10);

		expect(stats.daysWorked).toBe(2);
		expect(stats.totalHours).toBe(16);
		// 16 hours * 100 rate = 1600 gross
		expect(stats.grossSalary).toBe(1600);
		// 10% TDS of 1600 = 160
		expect(stats.tdsAmount).toBe(160);
		// Net = 1600 - 160 = 1440
		expect(stats.netSalary).toBe(1440);
	});

	it("should handle mixed numeric and string hour values safely", () => {
		const markedDates = {
			"2081-02-01": "8",
			"2081-02-02": 4,
		};
		const stats = calculateMonthlyStats(markedDates, 2081, 1, 200, 0);
		expect(stats.daysWorked).toBe(2);
		expect(stats.totalHours).toBe(12);
		expect(stats.grossSalary).toBe(2400);
	});
});

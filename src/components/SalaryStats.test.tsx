import { render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { expect, test, vi } from "vitest";
import SalaryStats from "./SalaryStats";

expect.extend(toHaveNoViolations);

// Mock the app runtime hook
vi.mock("../hooks/useAppRuntime", () => ({
	useAppState: () => ({
		markedDates: {},
		viewYear: 2082,
		viewMonth: 0,
		organizations: [
			{
				id: "guest",
				name: "Draft Workspace",
				hourly_rate: 0,
				daily_hours: 8,
				tds_percentage: null,
			},
		],
		currentOrgId: "guest",
		isSyncing: false,
	}),
	dispatch: vi.fn(),
}));

test("SalaryStats should have no accessibility violations", async () => {
	const { container } = render(<SalaryStats />);

	const results = await axe(container);
	expect(results).toHaveNoViolations();
});

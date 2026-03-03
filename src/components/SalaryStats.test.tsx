import { act, render } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { AppProvider } from "../store";
import SalaryStats from "./SalaryStats";

describe("SalaryStats Component", () => {
    it("should have no accessibility violations", async () => {
        let container: HTMLElement | undefined;
        await act(async () => {
            const result = render(
                <AppProvider>
                    <SalaryStats />
                </AppProvider>
            );
            container = result.container;
        });

        if (!container) throw new Error("Container not found");
        const results = await axe(container);
        expect(results).toHaveNoViolations();
    });
});

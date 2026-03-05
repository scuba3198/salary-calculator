import { test, expect } from '@playwright/test';

test.describe('PWA Stress & Resilience Testing', () => {

    test.beforeEach(async ({ page }) => {
        // Log browser events for audit
        page.on('console', msg => {
            if (msg.text().includes('[Store]')) console.log(`[BROWSER]: ${msg.text()}`);
        });

        await page.goto('./');
        // Wait for hydration and guest mode setup
        await expect(page.getByText('Guest Mode: Data is unsaved.')).toBeVisible({ timeout: 20000 });

        await page.evaluate(async () => {
            if ('serviceWorker' in navigator) {
                await navigator.serviceWorker.ready;
                if (!navigator.serviceWorker.controller) {
                    await new Promise(resolve => {
                        navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true });
                    });
                }
            }
        });
        // Settle time
        await page.waitForTimeout(1000);
    });

    test('1.1. Lie-Fi: Offline core logic stability', async ({ context, page }) => {
        const activeDays = page.locator('.calendar-day:not(.disabled)');
        await expect(activeDays.first()).toBeVisible();

        // Simulate going offline - testing if core logic is blocked by sync state
        await context.setOffline(true);
        await page.waitForTimeout(1000);

        // Toggle a date (Guest mode uses localStorage/InMemory state)
        await activeDays.first().click({ force: true });

        // Verify state change
        const netSalaryValue = page.locator('div:has-text("Net Salary") > .value');
        await expect(netSalaryValue).not.toHaveText('Rs. 0', { timeout: 15000 });

        await context.setOffline(false);
    });

    test('2.1. Storage: State recovery after localStorage clear', async ({ page }) => {
        // Fill settings with small delays to ensure state sync
        await page.locator('#hourlyRate').fill('500');
        await page.locator('#hourlyRate').blur();
        await page.locator('#tdsPercentage').fill('10');
        await page.locator('#tdsPercentage').blur();

        await page.waitForTimeout(500);

        const activeDays = page.locator('.calendar-day:not(.disabled)');
        await activeDays.first().click();

        // Net Salary should be Rs. 3,600 (500 * 8 * 1 - 10% TDS)
        const netSalaryValue = page.locator('div:has-text("Net Salary") > .value');
        await expect(netSalaryValue).toContainText('Rs. 3,600', { timeout: 15000 });

        // Stress: Force wipe storage
        await page.evaluate(() => localStorage.clear());

        // Reload starts fresh
        await page.reload();
        await expect(page.getByText('Guest Mode: Data is unsaved.')).toBeVisible();
        await expect(netSalaryValue).toContainText('Rs. 0');
    });

    test('3.1. Hardware: Rapid Orientation/Resize Stability', async ({ page }) => {
        const viewports = [
            { width: 375, height: 667 },
            { width: 1280, height: 720 },
            { width: 320, height: 480 },
        ];

        for (const viewport of viewports) {
            await page.setViewportSize(viewport);
            await expect(page.locator('.calendar-grid').first()).toBeVisible();
            await page.waitForTimeout(300);
        }
    });

    test('5.1. Deep Linking: Offline route resolution', async ({ context, page }) => {
        await page.goto('./');
        await expect(page.locator('.calendar-grid').first()).toBeVisible();

        await context.setOffline(true);
        await page.waitForTimeout(1000);

        // Re-navigate. Service Worker must handle this.
        // Webkit often has "internal error" on reload while offline, we retry once.
        try {
            await page.reload({ timeout: 15000 });
        } catch (e) {
            console.log("Webkit reload failed, retrying once...");
            await page.reload({ timeout: 15000 });
        }

        await expect(page.locator('.calendar-grid').first()).toBeVisible({ timeout: 15000 });
        await expect(page.getByText('Guest Mode: Data is unsaved.')).toBeVisible();
    });
});

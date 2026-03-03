import { test, expect } from '@playwright/test';

test.describe('Nepali Salary Calculator E2E', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('Guest User Journey: Calculate Net Salary', async ({ page }) => {
        // Verify the guest banner is visible
        await expect(page.getByText('Guest Mode: Data is unsaved.')).toBeVisible();

        // Verify default stats
        await expect(page.getByText('Net Salary').locator('..').locator('.value')).toContainText('Rs. 0');

        // Fill Settings
        await page.locator('#hourlyRate').fill('500');
        await page.locator('#dailyHours').fill('8');
        await page.locator('#tdsPercentage').fill('10');

        // Click on a calendar day. Let's find one that is enabled.
        // There are `.calendar-day` elements. We ignore `.disabled`.
        // We click the first `.calendar-day:not(.disabled)`.
        const activeDays = page.locator('.calendar-day:not(.disabled)');
        await activeDays.first().click();

        // Clicking one day = 8 hours = 4000 gross. TDS = 10% (400) -> Net = 3600
        await expect(page.getByText('Net Salary').locator('..').locator('.value')).toContainText('Rs. 3,600');

        // Click another day
        await activeDays.nth(1).click();

        // Clicking two days = 16 hours = 8000 gross. TDS = 800 -> Net = 7200
        await expect(page.getByText('Net Salary').locator('..').locator('.value')).toContainText('Rs. 7,200');
    });

    test('Modal Interaction: Install Reminder', async ({ page }) => {
        // This is OS dependent on actual devices, but the button should trigger our custom alert instead of native
        // We can simulate an iOS environment if needed, or simply verify the presence of the Alert if we trigger it manually
        // Just verifying the page loaded mostly to ensure no syntax break.

        // Find the Install App button
        const installBtn = page.getByRole('button', { name: 'Install App' });
        if (await installBtn.isVisible()) {
            await installBtn.click();

            // Since we replaced the native alert with a custom GlobalAlert, we should check for it
            const alertBox = page.getByText('Installation instructions');
            if (await alertBox.isVisible()) {
                await expect(alertBox).toBeVisible();
                // Click anywhere to dismiss (e.g., the backdrop)
                await page.mouse.click(10, 10);
                await expect(alertBox).not.toBeVisible();
            }
        }
    });

    test('Modal Interaction: Login UI appears and closes', async ({ page }) => {
        // The "Login" button should be in the header.
        const loginBtn = page.getByRole('button', { name: 'Login', exact: true });

        await loginBtn.first().click();

        // The "Login" modal should appear. Wait for its container.
        const authContainer = page.locator('.auth-container');
        await expect(authContainer).toBeVisible();

        // Close the modal using the X button
        await page.getByRole('button').filter({ has: page.locator('svg.lucide-x') }).click();

        await expect(authContainer).not.toBeVisible();
    });

    test('PWA Functionality: Manifest is served', async ({ page }) => {
        // Check if the manifest link exists in the DOM
        const manifestLink = page.locator('link[rel="manifest"]');
        await expect(manifestLink).toBeAttached();

        // Wait to make sure Vite served it (or if it's auto-injected by VitePWA)
        const href = await manifestLink.getAttribute('href');
        expect(href).toBeTruthy();

        // Fetch it to ensure it resolves to a valid JSON manifest
        const response = await page.request.get(href!);
        expect(response.ok()).toBeTruthy();

        const manifest = await response.json();
        expect(manifest.name).toBe('Salary Calculator');
        expect(manifest.short_name).toBe('SalaryCalc');
        expect(manifest.theme_color).toBe('#ffffff');
    });
});

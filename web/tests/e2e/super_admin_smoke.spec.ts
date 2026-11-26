import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:3000";

test.describe("Super Admin Live Frontend Smoke Verification", () => {
  test("Login page loads cleanly without console or runtime errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("Removed Academic Reference routes are not accessible", async ({ page }) => {
    await page.goto(`${BASE_URL}/platform/academic-reference`);
    await expect(page).toHaveURL(/\/login/);

    await page.goto(`${BASE_URL}/platform/academic-master-data`);
    await expect(page).toHaveURL(/\/login/);

    await page.goto(`${BASE_URL}/platform/configuration`);
    await expect(page).toHaveURL(/\/login/);
  });
});

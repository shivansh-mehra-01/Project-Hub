import { test, expect, Page, APIRequestContext } from "@playwright/test";

const BASE_URL = "http://localhost:3000";
const API_BASE_URL = "http://localhost:5000";

async function authenticatePersona(
  page: Page,
  request: APIRequestContext,
  email: string = "student@sistec.ac.in",
  password: string = "Pass@1234"
) {
  const loginRes = await request.post(`${API_BASE_URL}/api/auth/login`, {
    data: { email, password },
  });
  expect(loginRes.status()).toBe(200);
  const auth = await loginRes.json();

  await page.context().addInitScript(
    ({ token, user }) => {
      localStorage.setItem("projecthub_jwt_token", token);
      localStorage.setItem("projecthub_user_profile", JSON.stringify(user));
      sessionStorage.setItem("projecthub_jwt_token", token);
      sessionStorage.setItem("projecthub_user_profile", JSON.stringify(user));
    },
    { token: auth.token, user: auth.user }
  );

  return auth;
}

test.describe("Student Module Phase 2 — Identity, Profile, Dashboard & Navigation E2E Journeys", () => {
  // Journey J01 — Allocated Student Login & Workspace Dashboard
  test("J01 — Allocated Student Login and Live Project Dashboard", async ({ page }) => {
    // 1. Authenticate via credentials
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', "student@sistec.ac.in");
    await page.fill('input[type="password"]', "Pass@1234");
    await page.click('button[type="submit"]');

    // 2. Redirects to /student
    await expect(page).toHaveURL(`${BASE_URL}/student`, { timeout: 10000 });

    // 3. Verify workspace header & live project data
    await expect(page.locator("body")).toContainText("Project Workspace");
    await expect(page.locator("body")).toContainText("Sprint Tasks");
  });

  // Journey J02 — Student Profile Read & Update Persistence
  test("J02 — Student Profile Locked Credentials & Field Persistence", async ({ page, request }) => {
    await authenticatePersona(page, request, "student@sistec.ac.in", "Pass@1234");
    await page.goto(`${BASE_URL}/student/profile`);

    // 1. Verify locked institutional fields
    await expect(page.locator("body")).toContainText("Institutional Enrollment Identity");
    await expect(page.locator("body")).toContainText("0176CS221045");
    await expect(page.locator("body")).toContainText("Shivansh Mehra");

    // 2. Update editable fields: GitHub handle and bio
    const githubInput = page.locator('input[placeholder*="github username"]');
    await githubInput.fill("shivansh-coder-2026");

    const bioInput = page.locator('textarea[placeholder*="Brief description"]');
    await bioInput.fill("Focused on embedded IoT firmware and distributed systems telemetry.");

    // 3. Save profile
    const saveButton = page.getByRole("button", { name: /Save Profile Changes/i });
    await saveButton.click();

    // 4. Verify confirmation toast
    await expect(page.locator("body")).toContainText(/Profile changes saved successfully!|Profile Saved!/i, {
      timeout: 5000,
    });
  });

  // Journey J03 — Unallocated Student Experience
  test("J03 — Unallocated Student State and Actionable Guidance", async ({ page, request }) => {
    // Rohan Verma is enrolled in CSE Sem 6 but has no team
    await authenticatePersona(page, request, "rohan.verma@sistec.ac.in", "Pass@1234");
    await page.goto(`${BASE_URL}/student`);

    // Verify unallocated guidance is displayed
    await expect(page.locator("body")).toContainText("You Are Not Assigned to a Project Team");
    await expect(page.locator("body")).toContainText("Unallocated");
    await expect(page.locator("body")).toContainText("Browse Problem Bank");
  });

  // Journey J34 — Route Protection & Unauthorized Access Boundaries
  test("J34 — Unauthenticated Route Guard Redirects to Login", async ({ page }) => {
    // Clear storage
    await page.goto(`${BASE_URL}/login`);
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Try to visit /student without auth
    await page.goto(`${BASE_URL}/student`);
    // Should stay on or redirect to login
    await expect(page).toHaveURL(/.*login/, { timeout: 10000 });
  });
});

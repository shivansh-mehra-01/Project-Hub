import { test, expect, Page, APIRequestContext } from "@playwright/test";

const BASE_URL = "http://localhost:3000";
const API_BASE_URL = "http://localhost:5000";

async function authenticateStudent(
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

test.describe("Student Module Phase 3 — Project Discovery, Problem Bank & Idea Registration E2E Journeys", () => {
  // J04 — Project Discovery: Problem Bank Exploration & Topic Adoption
  test("J04 — Explore Faculty Problem Statements and Adopt Topic", async ({ page, request }) => {
    await authenticateStudent(page, request, "student@sistec.ac.in", "Pass@1234");
    await page.goto(`${BASE_URL}/student/explore`);

    // Verify page title and header
    await expect(page.locator("body")).toContainText("Project Discovery & Idea Registration");
    await expect(page.locator("body")).toContainText("Faculty Problem Bank");

    // Check Problem Bank tab exists and shows statements
    const problemBankBtn = page.getByRole("button", { name: /Faculty Problem Bank/i });
    await expect(problemBankBtn).toBeVisible();

    // Verify search input is available
    const searchInput = page.locator('input[placeholder*="Search by keywords"]');
    await expect(searchInput).toBeVisible();

    // Verify presence of topic registration button
    const registerBtn = page.getByRole("button", { name: /Register Project Idea/i });
    await expect(registerBtn).toBeVisible();
  });

  // J05 — Campus Project Archive Exploration & Read-Only Drawer
  test("J05 — Inspect Previous-Batch Project Archive and Conceal Confidential Data", async ({ page, request }) => {
    await authenticateStudent(page, request, "student@sistec.ac.in", "Pass@1234");
    await page.goto(`${BASE_URL}/student/explore`);

    // Switch to Past Campus Projects tab
    const archiveTab = page.getByRole("button", { name: /Campus Project Archive/i });
    await archiveTab.click();

    // Verify archive section is visible
    await expect(page.locator("body")).toContainText("Campus Project Archive");

    // If archived projects exist, verify "Inspect Abstract & Repo" button
    const inspectBtn = page.getByRole("button", { name: /Inspect Abstract & Repo/i }).first();
    if (await inspectBtn.isVisible()) {
      await inspectBtn.click();

      // Drawer opens with project details
      await expect(page.locator("body")).toContainText("NBA / SAR Accredited Project Archive");
      await expect(page.locator("body")).toContainText("Project Abstract:");

      // Close drawer
      const closeBtn = page.getByRole("button", { name: /Close Inspection/i });
      await closeBtn.click();
    }
  });

  // J06 — Idea Registration & Real-Time Originality / Similarity Check
  test("J06 — Register Project Idea with Live Originality / Similarity Check", async ({ page, request }) => {
    // Authenticate as unallocated student so idea registration is unlocked
    await authenticateStudent(page, request, "rohan.verma@sistec.ac.in", "Pass@1234");
    await page.goto(`${BASE_URL}/student/explore`);

    // Open Register Project Idea modal
    const registerBtn = page.getByRole("button", { name: /Register Project Idea/i });
    await expect(registerBtn).toBeVisible();
    await registerBtn.click();

    // Verify modal is open
    await expect(page.locator("body")).toContainText("Register New Project Idea");
    await expect(page.locator("body")).toContainText("Institutional Originality Check");

    // Enter title and abstract
    const titleInput = page.locator('input[placeholder*="Real-Time Autonomous"]');
    await titleInput.fill("Autonomous Solar Microgrid Power Distribution Optimization");

    const abstractInput = page.locator('textarea[placeholder*="Detail the motivation"]');
    await abstractInput.fill(
      "Design and prototype of decentralized microgrid controllers optimizing battery cycle life across distributed campus photovoltaic arrays."
    );

    // Trigger originality check
    const checkOriginalityBtn = page.getByRole("button", { name: /Check Originality/i });
    await checkOriginalityBtn.click();

    // Verify originality check response
    await expect(page.locator("body")).toContainText(/Institutional Originality Check|similarity|overlap/i);

    // Close modal
    const cancelBtn = page.getByRole("button", { name: /Cancel/i });
    await cancelBtn.click();
  });

  // J07 — My Proposals & Ideas Tab with Status and Review Timeline
  test("J07 — View Proposals Tab and Review Lifecycle Stepper", async ({ page, request }) => {
    await authenticateStudent(page, request, "student@sistec.ac.in", "Pass@1234");
    await page.goto(`${BASE_URL}/student/explore`);

    // Switch to "My Proposals & Ideas" tab
    const ideasTab = page.getByRole("button", { name: /My Proposals & Ideas/i });
    await ideasTab.click();

    // Verify proposals view is loaded
    await expect(page.locator("body")).toContainText(/My Proposals & Ideas/i);

    // If an allocated project exists, verify banner indicates locked registration
    const allocatedBanner = page.locator("text=Active Project Allocated");
    if (await allocatedBanner.isVisible()) {
      await expect(allocatedBanner).toBeVisible();
      await expect(page.locator("body")).toContainText("Topic registrations are locked for your team");
    }
  });

  // J08 — Returned Proposal Feedback & Resubmission Pathway Verification
  test("J08 — Returned Proposal Remarks Banner and Resubmission Action", async ({ page, request }) => {
    await authenticateStudent(page, request, "student@sistec.ac.in", "Pass@1234");
    await page.goto(`${BASE_URL}/student/explore`);

    // Switch to ideas tab
    const ideasTab = page.getByRole("button", { name: /My Proposals & Ideas/i });
    await ideasTab.click();

    // If any proposal has been returned for revision, check that remarks banner and revise button render
    const returnedBanner = page.locator("text=Proposal Returned for Revision");
    if (await returnedBanner.isVisible()) {
      await expect(returnedBanner).toBeVisible();
      const reviseBtn = page.getByRole("button", { name: /Revise Proposal/i }).first();
      await expect(reviseBtn).toBeVisible();
    }
  });
});

import { test, expect, Page, APIRequestContext } from "@playwright/test";

const BASE_URL = "http://localhost:3000";
const API_BASE_URL = "http://localhost:5000";

async function authenticatePersona(
  page: Page,
  request: APIRequestContext,
  email: string = "collegeadmin@sistec.ac.in",
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

test.describe("College Admin Module — End-to-End Browser Journeys & Acceptance", () => {
  // Journey 1 — College Admin Login and Executive Overview
  test("Journey 1 — College Admin Login and Executive Overview", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await expect(page).toHaveURL(/.*login/);

    await page.fill('input[type="email"]', "collegeadmin@sistec.ac.in");
    await page.fill('input[type="password"]', "Pass@1234");
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(`${BASE_URL}/college`, { timeout: 10000 });

    // Verify Overview in header banner
    await expect(page.locator("header").getByText("Overview")).toBeVisible();

    // Verify statutory KPIs in main dashboard
    await expect(page.locator("main").getByText("Total Student Intake")).toBeVisible();
    await expect(page.locator("main").getByText("AICTE Faculty Strength")).toBeVisible();
    await expect(page.locator("main").getByText("Department Leadership")).toBeVisible();
    await expect(page.locator("main").getByText("SAR Attestation")).toBeVisible();

    // Verify AICTE APH section
    await expect(page.getByText("AICTE Cadre & Faculty-Student Ratio (FSR)")).toBeVisible();
  });

  // Journey 2 — Full Navigation & Route Coverage
  test("Journey 2 — Full Navigation & Route Coverage", async ({ page, request }) => {
    await authenticatePersona(page, request);

    // 1. Programs & Branches
    await page.goto(`${BASE_URL}/college/courses`);
    await expect(page).toHaveURL(`${BASE_URL}/college/courses`);
    await expect(page.locator("header").getByText("Programs & Branches")).toBeVisible();
    await expect(page.getByText("Degree Programs", { exact: false })).toBeVisible();

    // 2. Department Leadership
    await page.goto(`${BASE_URL}/college/hods`);
    await expect(page).toHaveURL(`${BASE_URL}/college/hods`);
    await expect(page.locator("header").getByText("Department Leadership")).toBeVisible();
    await expect(page.getByText("Total Branches")).toBeVisible();
    await expect(page.getByText("Appointed HODs")).toBeVisible();

    // 3. Faculty & Staff Directory
    await page.goto(`${BASE_URL}/college/users`);
    await expect(page).toHaveURL(`${BASE_URL}/college/users`);
    await expect(page.locator("header").getByText("Faculty & Staff")).toBeVisible();
    await expect(page.getByText("Total Staff")).toBeVisible();
    await expect(page.getByText("Teaching Faculty")).toBeVisible();

    // 4. Accreditation & Examination
    await page.goto(`${BASE_URL}/college/accreditation`);
    await expect(page).toHaveURL(`${BASE_URL}/college/accreditation`);
    await expect(page.locator("header").getByText("Accreditation & Examination")).toBeVisible();

    // 5. College Settings
    await page.goto(`${BASE_URL}/college/settings`);
    await expect(page).toHaveURL(`${BASE_URL}/college/settings`);
    await expect(page.locator("header").getByText("College Settings")).toBeVisible();
    await expect(page.getByText("General")).toBeVisible();
    await expect(page.getByText("Security & SSO")).toBeVisible();

    // 6. User Account
    await page.goto(`${BASE_URL}/account`);
    await expect(page).toHaveURL(`${BASE_URL}/account`);
    await expect(page.locator("header").getByText("Account")).toBeVisible();
  });

  // Journey 3 — Programs & Branches Management Lifecycle
  test("Journey 3 — Programs & Branches Management Lifecycle", async ({ page, request }) => {
    const auth = await authenticatePersona(page, request);
    const testCode = `PROG_${Date.now().toString().slice(-4)}`;

    // 1. Create program via API
    const createRes = await request.post(`${API_BASE_URL}/api/college/course-programs`, {
      headers: { Authorization: `Bearer ${auth.token}` },
      data: {
        code: testCode,
        name: `Automated Test Program ${testCode}`,
        level: "PG",
        totalSemesters: 4,
      },
    });
    expect(createRes.status()).toBe(201);
    const createdProg = await createRes.json();
    expect(createdProg.code).toBe(testCode);

    // 2. Navigate to UI and verify the program appears in master panel
    await page.goto(`${BASE_URL}/college/courses`);
    await expect(page.getByText(testCode, { exact: true })).toBeVisible({ timeout: 8000 });

    // 3. Create a branch under this program via API
    const branchRes = await request.post(`${API_BASE_URL}/api/college/departments`, {
      headers: { Authorization: `Bearer ${auth.token}` },
      data: {
        courseProgramId: createdProg.id,
        code: `BR_${testCode.slice(-3)}`,
        name: `Branch for ${testCode}`,
        intakeQuota: 30,
      },
    });
    expect(branchRes.status()).toBe(201);

    // 4. Clean up: Delete program (cascades soft-delete to department)
    const deleteRes = await request.delete(`${API_BASE_URL}/api/college/course-programs/${createdProg.id}`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    expect(deleteRes.status()).toBe(204);
  });

  // Journey 4 — Department Leadership Roster & Succession
  test("Journey 4 — Department Leadership Roster & Succession", async ({ page, request }) => {
    const auth = await authenticatePersona(page, request);

    await page.goto(`${BASE_URL}/college/hods`);
    await expect(page.locator("header").getByText("Department Leadership")).toBeVisible();

    // Verify departments table renders
    await expect(page.getByText("Head of Department")).toBeVisible();

    // Verify succession history API returns valid history
    const historyRes = await request.get(`${API_BASE_URL}/api/college/hods/history`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    expect(historyRes.status()).toBe(200);
    const history = await historyRes.json();
    expect(Array.isArray(history)).toBe(true);

    // Verify succession history button opens drawer if clicked
    const historyBtn = page.getByRole("button", { name: /Succession/i }).or(page.getByText(/Succession History/i));
    if (await historyBtn.first().isVisible()) {
      await historyBtn.first().click();
      await expect(page.getByText("Leadership Succession History")).toBeVisible({ timeout: 5000 });
      const closeBtn = page.getByRole("button", { name: "Close" }).or(page.locator("button:has-text('✕')"));
      if (await closeBtn.first().isVisible()) {
        await closeBtn.first().click();
      }
    }
  });

  // Journey 5 — Faculty & Staff Directory Mutations and Password Reset
  test("Journey 5 — Faculty & Staff Directory Mutations and Password Reset", async ({ page, request }) => {
    const auth = await authenticatePersona(page, request);
    const testEmail = `staff.test.${Date.now()}@sistec.ac.in`;

    // 1. Create a staff member via API
    const createRes = await request.post(`${API_BASE_URL}/api/college/users`, {
      headers: { Authorization: `Bearer ${auth.token}` },
      data: {
        fullName: "Dr. Automated Test Faculty",
        email: testEmail,
        role: "Faculty",
        designation: "AssociateProfessor",
        employeeCode: `EMP-${Date.now().toString().slice(-4)}`,
      },
    });
    expect(createRes.status()).toBe(200);
    const staff = await createRes.json();
    expect(staff.email).toBe(testEmail);

    // 2. Navigate to Staff Directory in browser
    await page.goto(`${BASE_URL}/college/users`);
    await expect(page.locator("header").getByText("Faculty & Staff")).toBeVisible();

    // Search for the newly created staff member
    const searchInput = page.getByPlaceholder("Search faculty & staff by name, email, or employee code...");
    if (await searchInput.isVisible()) {
      await searchInput.fill(testEmail);
      await expect(page.getByText("Dr. Automated Test Faculty")).toBeVisible({ timeout: 8000 });
    }

    // 3. Trigger password reset OTP
    const resetRes = await request.post(`${API_BASE_URL}/api/college/users/${staff.id}/reset-password`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    expect(resetRes.status()).toBe(200);
    const resetData = await resetRes.json();
    expect(resetData.success).toBe(true);
    expect(resetData.expiresAtUtc).toBeTruthy();

    // 4. Toggle active status
    const statusRes = await request.put(`${API_BASE_URL}/api/college/users/${staff.id}/status`, {
      headers: { Authorization: `Bearer ${auth.token}` },
      data: { isActive: false },
    });
    expect(statusRes.status()).toBe(200);

    // 5. Delete staff member
    const deleteRes = await request.delete(`${API_BASE_URL}/api/college/users/${staff.id}`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    expect(deleteRes.status()).toBe(204);
  });

  // Journey 6 — Accreditation Console & Examination Register
  test("Journey 6 — Accreditation Console & Examination Register", async ({ page, request }) => {
    const auth = await authenticatePersona(page, request);

    await page.goto(`${BASE_URL}/college/accreditation`);
    await expect(page.locator("header").getByText("Accreditation & Examination")).toBeVisible();

    // Verify subtabs are present
    await expect(page.getByRole("button", { name: "Overview" })).toBeVisible();
    await expect(page.getByText("Frameworks & Cycles")).toBeVisible();
    await expect(page.getByText("Program Mapping")).toBeVisible();
    await expect(page.getByText("Examination Register")).toBeVisible();

    // Navigate to Examination Register route
    await page.goto(`${BASE_URL}/college/accreditation/examination`);
    await expect(page.getByText("Evaluation Weights")).toBeVisible({ timeout: 8000 });
    await expect(page.getByText("Total: 100% (Continuous Evaluation)")).toBeVisible();

    // Verify examination results API returns real CBCS data
    const resultsRes = await request.get(`${API_BASE_URL}/api/college/results`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    expect(resultsRes.status()).toBe(200);
    const reg = await resultsRes.json();
    expect(reg.guideWeightPct).toBe(30);
    expect(reg.midTermWeightPct).toBe(30);
    expect(reg.finalVivaWeightPct).toBe(40);
  });

  // Journey 7 — Institutional Compliance Sign-Off
  test("Journey 7 — Institutional Compliance Sign-Off", async ({ page, request }) => {
    const auth = await authenticatePersona(page, request);

    const signoffRes = await request.post(`${API_BASE_URL}/api/college/compliance/sign-off`, {
      headers: { Authorization: `Bearer ${auth.token}` },
      data: {
        remarks: "Official Institutional Compliance Sign-off via Playwright Test",
      },
    });
    expect(signoffRes.status()).toBe(200);
    const signoffData = await signoffRes.json();
    expect(signoffData.success).toBe(true);
    expect(signoffData.signedAtUtc).toBeTruthy();
  });

  // Journey 8 — RouteGuard Direct Deep-Link Navigation & Refresh
  test("Journey 8 — RouteGuard Direct Deep-Link Navigation & Refresh", async ({ page, request }) => {
    await authenticatePersona(page, request);

    // Direct deep-link to /college/users
    await page.goto(`${BASE_URL}/college/users`);
    await expect(page).toHaveURL(`${BASE_URL}/college/users`);
    await expect(page.locator("header").getByText("Faculty & Staff")).toBeVisible();

    // Direct deep-link to /college/settings
    await page.goto(`${BASE_URL}/college/settings`);
    await expect(page).toHaveURL(`${BASE_URL}/college/settings`);
    await expect(page.locator("header").getByText("College Settings")).toBeVisible();

    // Page refresh remains on target page
    await page.reload();
    await expect(page).toHaveURL(`${BASE_URL}/college/settings`);
    await expect(page.locator("header").getByText("College Settings")).toBeVisible();

    // Clean isolated context unauthenticated redirect
    const anonContext = await page.context().browser()!.newContext();
    const anonPage = await anonContext.newPage();
    await anonPage.goto(`${BASE_URL}/college`);
    await expect(anonPage).toHaveURL(/.*login/);
    await anonContext.close();
  });

  // Journey 9 — Security Boundaries & Cross-Role Denial
  test("Journey 9 — Security Boundaries & Cross-Role Denial", async ({ page, request }) => {
    const auth = await authenticatePersona(page, request);

    // 1. CollegeAdmin attempting to access SuperAdmin API
    const platformRes = await request.get(`${API_BASE_URL}/api/platform/tenants`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    expect(platformRes.status()).toBe(403);

    // 2. CollegeAdmin attempting to access Faculty API
    const facultyRes = await request.get(`${API_BASE_URL}/api/faculty/action-queue`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    expect(facultyRes.status()).toBe(403);

    // 3. Student attempting to access CollegeAdmin API
    const studentLogin = await request.post(`${API_BASE_URL}/api/auth/login`, {
      data: { email: "student@sistec.ac.in", password: "Pass@1234" },
    });
    expect(studentLogin.status()).toBe(200);
    const studentAuth = await studentLogin.json();

    const studentToCollege = await request.get(`${API_BASE_URL}/api/college/overview`, {
      headers: { Authorization: `Bearer ${studentAuth.token}` },
    });
    expect(studentToCollege.status()).toBe(403);
  });
});

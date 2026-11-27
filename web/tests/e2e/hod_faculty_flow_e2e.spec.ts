import { test, expect, Page, APIRequestContext } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3055";
const API_BASE_URL = process.env.E2E_API_URL || "http://127.0.0.1:5055";

const SUPER_ADMIN_EMAIL = "superadmin@colabex.test";
const SUPER_ADMIN_PASS = "SuperAdminPassword123!";
const USER_PASS = "E2eTestPass!2026";

async function loginViaUi(page: Page, email: string, password: string, expectedUrlPattern: RegExp) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(expectedUrlPattern, { timeout: 15000 });
  await page.waitForLoadState("networkidle");
}

async function activateViaDevOtp(request: APIRequestContext, email: string, newPassword: string) {
  let otpRes = await request.post(`${API_BASE_URL}/api/auth/request-password-otp`, {
    data: { email },
  });
  if (otpRes.status() === 429) {
    await new Promise((r) => setTimeout(r, 62000));
    otpRes = await request.post(`${API_BASE_URL}/api/auth/request-password-otp`, {
      data: { email },
    });
  }
  expect(otpRes.status()).toBe(200);
  const otpData = await otpRes.json();
  expect(otpData.devOtp).toBeTruthy();

  const resetRes = await request.post(`${API_BASE_URL}/api/auth/reset-password`, {
    data: {
      email,
      otp: otpData.devOtp,
      newPassword,
    },
  });
  expect(resetRes.status()).toBe(200);
}

test.describe("HOD Faculty & Staff End-to-End Flow", () => {
  test("CollegeAdmin CSV import -> HOD appointment -> HOD login -> /hod/faculty loads roster, toggles Coordinator, and distinguishes API error from empty state", async ({
    page,
    request,
  }) => {
    test.setTimeout(120000);
    const ts = Date.now();
    const suffix = String(ts).slice(-5);
    const collegeName = `HODFlow${suffix} Institute`;
    const adminEmail = `principal.${ts}@hod${suffix}.edu`;
    const hodEmail = `hod.${ts}@hod${suffix}.edu`;
    const cseFacEmail = `csefac.${ts}@hod${suffix}.edu`;

    // 1. SuperAdmin creates college tenant
    const saLogin = await request.post(`${API_BASE_URL}/api/auth/login`, {
      data: { email: SUPER_ADMIN_EMAIL, password: SUPER_ADMIN_PASS },
    });
    expect(saLogin.status()).toBe(200);
    const { token: saToken } = await saLogin.json();

    const tenantRes = await request.post(`${API_BASE_URL}/api/platform/tenants`, {
      headers: { Authorization: `Bearer ${saToken}` },
      data: {
        name: collegeName,
        principalName: "Dr. HODFlow Principal",
        principalEmail: adminEmail,
        city: "Bhopal",
        state: "Madhya Pradesh",
        subscriptionPlan: "Enterprise",
      },
    });
    expect([200, 201]).toContain(tenantRes.status());

    // 2. Activate CollegeAdmin and set up CSE department
    await activateViaDevOtp(request, adminEmail, USER_PASS);
    const adminLogin = await request.post(`${API_BASE_URL}/api/auth/login`, {
      data: { email: adminEmail, password: USER_PASS },
    });
    expect(adminLogin.status()).toBe(200);
    const { token: adminToken } = await adminLogin.json();
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };

    const progsRes = await request.get(`${API_BASE_URL}/api/college/course-programs`, { headers: adminHeaders });
    const progs = await progsRes.json();
    let prog = progs.find((p: { code: string }) => p.code === "BTECH");
    if (!prog) {
      const pRes = await request.post(`${API_BASE_URL}/api/college/course-programs`, {
        headers: adminHeaders,
        data: { name: "Bachelor of Technology", code: "BTECH", level: "UG", totalSemesters: 8 },
      });
      prog = await pRes.json();
    }

    const deptsRes = await request.get(`${API_BASE_URL}/api/college/departments`, { headers: adminHeaders });
    const depts = await deptsRes.json();
    let cse = depts.find((d: { code: string }) => d.code === "CSE");
    if (!cse) {
      const dRes = await request.post(`${API_BASE_URL}/api/college/departments`, {
        headers: adminHeaders,
        data: { name: "Computer Science & Engineering", code: "CSE", courseProgramId: prog.id },
      });
      cse = await dRes.json();
    }

    // 3. CollegeAdmin imports faculty via CSV bulk upload
    const bulkRes = await request.post(`${API_BASE_URL}/api/college/users/bulk`, {
      headers: adminHeaders,
      data: {
        csvHeaders: ["FullName", "Email", "DepartmentCode", "Designation"],
        staffRows: [
          { fullName: "Dr. Appointed HOD", email: hodEmail, departmentCode: "CSE", designation: "Professor" },
          { fullName: "Prof. CSE Roster Member", email: cseFacEmail, departmentCode: "CSE", designation: "AssociateProfessor" },
        ],
      },
    });
    expect(bulkRes.status()).toBe(200);
    const bulkJson = await bulkRes.json();
    expect(bulkJson.successfullyCreated).toBe(2);

    // Find HOD candidate ID & appoint as HOD of CSE
    const staffRes = await request.get(`${API_BASE_URL}/api/college/users`, { headers: adminHeaders });
    const staff = await staffRes.json();
    const hodCandidate = staff.find((u: { email: string }) => u.email === hodEmail);
    expect(hodCandidate).toBeTruthy();

    const appointRes = await request.put(`${API_BASE_URL}/api/college/departments/${cse.id}/hod`, {
      headers: adminHeaders,
      data: { hodUserId: hodCandidate.id, confirmReplacement: true },
    });
    expect(appointRes.status()).toBe(200);

    // Activate HOD and log in via UI (HttpOnly BFF cookies)
    await activateViaDevOtp(request, hodEmail, USER_PASS);
    await loginViaUi(page, hodEmail, USER_PASS, /\/hod/);

    // 4. Navigate to /hod/faculty -> must load imported faculty (NOT "No Faculty Members in Department")
    await page.goto(`${BASE_URL}/hod/faculty`, { waitUntil: "networkidle" });
    await expect(page.getByText("Prof. CSE Roster Member")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("No Faculty Members in Department")).toHaveCount(0);

    // 5. Appoint Prof. CSE Roster Member as Project Coordinator in UI
    const row = page.locator("tr", { hasText: "Prof. CSE Roster Member" });
    await row.locator('button[role="switch"]').click();
    await page.getByRole("button", { name: /Confirm Appointment/i }).click();
    await expect(row.getByText("Project Coordinator")).toBeVisible({ timeout: 10000 });

    // Reload preserves persisted coordinator appointment
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.locator("tr", { hasText: "Prof. CSE Roster Member" }).getByText("Project Coordinator")).toBeVisible({
      timeout: 10000,
    });

    // 6. Simulated 500 API error must show error alert, NOT "No Faculty Members in Department"
    await page.route("**/api/hod/faculty", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: "Simulated server failure" }),
      })
    );
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByText(/Unable to Load Department Faculty Directory/i)).toBeVisible();
    await expect(page.getByText(/Simulated server failure/i)).toBeVisible();
    await expect(page.getByText("No Faculty Members in Department")).toHaveCount(0);
  });
});

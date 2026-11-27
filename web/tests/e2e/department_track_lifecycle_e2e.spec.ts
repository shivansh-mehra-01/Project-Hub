import { test, expect, Page, APIRequestContext } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3055";
const API_BASE_URL = process.env.E2E_API_URL || "http://127.0.0.1:5055";

const SUPER_ADMIN_EMAIL = "superadmin@collabex.in";
const SUPER_ADMIN_PASS = "E2eAdmin@Collabex1";
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
    data: { email, otp: otpData.devOtp, newPassword },
  });
  expect(resetRes.status()).toBe(200);
}

test.describe("Department Track Ownership & Lifecycle E2E", () => {
  test("CollegeAdmin blocked from track creation -> HOD initializes & launches track -> Student discovers track & starts project", async ({
    page,
    request,
  }) => {
    test.setTimeout(180000);
    const ts = Date.now();
    const suffix = String(ts).slice(-5);
    const collegeName = `TrackE2E${suffix} College`;
    const domain = `trke2e${suffix}.edu`;
    const adminEmail = `principal.${ts}@${domain}`;
    const hodEmail = `hod.${ts}@${domain}`;
    const stuEmail = `student.${ts}@${domain}`;

    // 1. SuperAdmin logs in and creates college tenant via /api/platform/tenants
    const saLogin = await request.post(`${API_BASE_URL}/api/auth/login`, {
      data: { email: SUPER_ADMIN_EMAIL, password: SUPER_ADMIN_PASS },
    });
    expect(saLogin.status()).toBe(200);
    const saToken = (await saLogin.json()).token;

    const createCollege = await request.post(`${API_BASE_URL}/api/platform/tenants`, {
      headers: { Authorization: `Bearer ${saToken}` },
      data: {
        name: collegeName,
        tenantCode: `TRK${suffix}`,
        ssoDomain: domain,
        licenseTier: "Standard",
        maxStudentSeats: 500,
        principalName: "Principal Admin",
        principalEmail: adminEmail,
      },
    });
    expect(createCollege.status()).toBe(201);
    const collegeTenantData = await createCollege.json();
    const tenantId = collegeTenantData.tenant?.id;
    expect(tenantId).toBeTruthy();

    // 2. Activate College Admin & log in
    await activateViaDevOtp(request, adminEmail, USER_PASS);
    const adminLogin = await request.post(`${API_BASE_URL}/api/auth/login`, {
      data: { email: adminEmail, password: USER_PASS },
    });
    expect(adminLogin.status()).toBe(200);
    const adminToken = (await adminLogin.json()).token;

    // 3. Verify College Admin is blocked from creating department project tracks (403)
    const blockedTrackRes = await request.post(`${API_BASE_URL}/api/college/tracks`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { name: "Blocked College Track", academicYear: "2025-26" },
    });
    expect(blockedTrackRes.status()).toBe(403);

    // 4. College Admin gets the BTECH program (auto-created by CreateTenant)
    const programsRes = await request.get(`${API_BASE_URL}/api/college/course-programs`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(programsRes.status()).toBe(200);
    const programs = await programsRes.json();
    const btechProgram = programs.find((p: any) => p.code === "BTECH");
    expect(btechProgram).toBeTruthy();
    const programId = btechProgram.id;

    // 5. College Admin creates CSE department under BTECH program
    const deptRes = await request.post(`${API_BASE_URL}/api/college/departments`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { code: "CSE", name: "Computer Science", courseProgramId: programId, intakeQuota: 60 },
    });
    expect(deptRes.status()).toBe(201);
    const deptId = (await deptRes.json()).id;

    // 5b. Create Semester 6 term for CSE in active academic session so student enrollment resolves
    const activeSessionRes = await request.get(`${API_BASE_URL}/api/college/sessions/active`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(activeSessionRes.status()).toBe(200);
    const activeSession = await activeSessionRes.json();

    const semRes = await request.post(`${API_BASE_URL}/api/college/semester-terms`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        departmentId: deptId,
        academicSessionId: activeSession.id,
        semesterNumber: 6,
        semesterName: "Semester 6",
        parity: "Even",
      },
    });
    expect(semRes.status()).toBe(201);

    // 6. Import HOD faculty via JSON bulk upload
    const hodImport = await request.post(`${API_BASE_URL}/api/college/users/bulk`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        staffRows: [
          {
            fullName: "Dr. HOD CSE",
            email: hodEmail,
            departmentCode: "CSE",
            designation: "Professor",
          },
        ],
      },
    });
    expect(hodImport.status()).toBe(200);

    // 7. Get the faculty user ID
    const usersRes = await request.get(`${API_BASE_URL}/api/college/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(usersRes.status()).toBe(200);
    const usersList = await usersRes.json();
    const hodUser = usersList.find((f: any) => f.email === hodEmail);
    expect(hodUser).toBeTruthy();

    // 8. Assign HOD to CSE department
    const assignHodRes = await request.put(`${API_BASE_URL}/api/college/departments/${deptId}/hod`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { hodUserId: hodUser.id },
    });
    expect(assignHodRes.status()).toBe(200);

    // 9. Import student via JSON bulk upload
    const stuImport = await request.post(`${API_BASE_URL}/api/college/students/bulk`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        studentRows: [
          {
            studentName: "Student One",
            email: stuEmail,
            studentNumber: `STU-${suffix}`,
            departmentCode: "CSE",
            program: "BTECH",
            currentSemester: 6,
            admissionYear: "2023",
          },
        ],
      },
    });
    expect(stuImport.status()).toBe(200);

    // 10. Activate HOD and student accounts
    await activateViaDevOtp(request, hodEmail, USER_PASS);
    await activateViaDevOtp(request, stuEmail, USER_PASS);

    // 11. HOD logs in via UI, sees Start Project Window CTA, navigates to /hod/projects/start-window, starts window
    await loginViaUi(page, hodEmail, USER_PASS, /\/hod/);
    await expect(page.getByRole("button", { name: /Start Project Window/i })).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: /Start Project Window/i }).click();
    await expect(page).toHaveURL(/\/hod\/projects\/start-window/);

    const today = new Date().toISOString().slice(0, 10);
    const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

    await page.getByLabel("Project Type *").selectOption("Minor 1");
    await page.getByLabel("Semester *").selectOption("6");
    await page.getByLabel("Registration Opens *").fill(today);
    await page.getByLabel("Registration Deadline *").fill(nextMonth);
    await page.getByRole("button", { name: /^Start Window$/i }).click();

    await expect(page).toHaveURL(/\/hod\/projects\/tracks/, { timeout: 15000 });
    await expect(page.getByText("Minor 1 — 6th Semester")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Open", { exact: true })).toBeVisible();

    // Reload and confirm persistence
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByText("Minor 1 — 6th Semester")).toBeVisible({ timeout: 10000 });

    // 12. Student logs in via UI, discovers open track, and starts project
    await page.context().clearCookies();
    await loginViaUi(page, stuEmail, USER_PASS, /\/student/);
    await expect(page.getByText("Open Department Project Tracks")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Minor 1 — 6th Semester")).toBeVisible();

    await page.getByRole("button", { name: "Start Project" }).first().click();
    await page.getByPlaceholder("e.g., Smart Campus Energy Optimizer").fill("Autonomous Lab Monitor");
    await page.getByPlaceholder("Describe the problem statement and proposed solution...").fill("IoT telemetry and anomaly alerts for college labs.");
    await page.getByRole("button", { name: "Create Project" }).click();

    await page.waitForLoadState("networkidle");
    await expect(page.getByLabel("Project Title")).toHaveValue("Autonomous Lab Monitor", { timeout: 15000 });
  });
});

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

async function logoutViaBff(page: Page) {
  await page.evaluate(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
  });
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
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

test.describe.serial("College Admin Students & Enrollment + Coordinator Auth Verification", () => {
  const ts = Date.now();
  const suffix = String(ts).slice(-5);
  const collegeName = `E2E${suffix} Institute of Engineering`;
  const adminEmail = `principal.${ts}@e2e${suffix}.edu`;
  const facultyEmail = `faculty.${ts}@e2e${suffix}.edu`;
  const coordEmail = `coord.${ts}@e2e${suffix}.edu`;
  const hodEmail = `hod.${ts}@e2e${suffix}.edu`;
  const csvStudent1Email = `stu1.${ts}@e2e${suffix}.edu`;
  const csvStudent2Email = `stu2.${ts}@e2e${suffix}.edu`;
  const csvStudent1Usn = `USN${suffix}01`;
  const csvStudent2Usn = `USN${suffix}02`;

  let departmentId = "";
  let facultyId = "";
  let coordId = "";

  test("1. Unauthenticated access to /college/students redirects to /login", async ({ page }) => {
    await page.goto(`${BASE_URL}/college/students`);
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test("2. Setup College, Academic Structure, Faculty, Coordinator & Verify Coordinator AuthZ on PostgreSQL", async ({
    request,
  }) => {
    test.setTimeout(120000);

    // SuperAdmin login via API
    const saLogin = await request.post(`${API_BASE_URL}/api/auth/login`, {
      data: { email: SUPER_ADMIN_EMAIL, password: SUPER_ADMIN_PASS },
    });
    expect(saLogin.status()).toBe(200);
    const { token: saToken } = await saLogin.json();
    const saHeaders = { Authorization: `Bearer ${saToken}` };

    // Create real College Tenant
    const tenantRes = await request.post(`${API_BASE_URL}/api/platform/tenants`, {
      headers: saHeaders,
      data: {
        name: collegeName,
        principalName: "Dr. E2E Principal",
        principalEmail: adminEmail,
        city: "Bhopal",
        state: "Madhya Pradesh",
        subscriptionPlan: "Enterprise",
      },
    });
    expect([200, 201]).toContain(tenantRes.status());

    // Activate CollegeAdmin
    await activateViaDevOtp(request, adminEmail, USER_PASS);

    // Login as CollegeAdmin
    const adminLogin = await request.post(`${API_BASE_URL}/api/auth/login`, {
      data: { email: adminEmail, password: USER_PASS },
    });
    expect(adminLogin.status()).toBe(200);
    const { token: adminToken } = await adminLogin.json();
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };

    // Fetch or create CourseProgram
    const progsListRes = await request.get(`${API_BASE_URL}/api/college/course-programs`, { headers: adminHeaders });
    expect(progsListRes.status()).toBe(200);
    const progs = await progsListRes.json();
    let prog = progs.find((p: { code: string }) => p.code === "BTECH");
    if (!prog) {
      const progRes = await request.post(`${API_BASE_URL}/api/college/course-programs`, {
        headers: adminHeaders,
        data: { name: "Bachelor of Technology", code: "BTECH", level: "UG", totalSemesters: 8 },
      });
      expect([200, 201]).toContain(progRes.status());
      prog = await progRes.json();
    }

    // Fetch or create Department
    const deptsListRes = await request.get(`${API_BASE_URL}/api/college/departments`, { headers: adminHeaders });
    expect(deptsListRes.status()).toBe(200);
    const depts = await deptsListRes.json();
    let dept = depts.find((d: { code: string }) => d.code === "CSE");
    if (!dept) {
      const deptRes = await request.post(`${API_BASE_URL}/api/college/departments`, {
        headers: adminHeaders,
        data: { name: "Computer Science & Engineering", code: "CSE", courseProgramId: prog.id },
      });
      expect([200, 201]).toContain(deptRes.status());
      dept = await deptRes.json();
    }
    departmentId = dept.id;

    // Fetch or create Active AcademicSession & Current SemesterTerm 6
    const sessListRes = await request.get(`${API_BASE_URL}/api/college/academic-sessions`, { headers: adminHeaders });
    expect(sessListRes.status()).toBe(200);
    const sessions = await sessListRes.json();
    let sess = sessions.find((s: { isActive: boolean }) => s.isActive);
    if (!sess) {
      const sessRes = await request.post(`${API_BASE_URL}/api/college/academic-sessions`, {
        headers: adminHeaders,
        data: { name: "2026-27", startYear: 2026, endYear: 2027, isActive: true },
      });
      expect([200, 201]).toContain(sessRes.status());
      sess = await sessRes.json();
    }

    const termsListRes = await request.get(`${API_BASE_URL}/api/college/semester-terms`, { headers: adminHeaders });
    expect(termsListRes.status()).toBe(200);
    const terms = await termsListRes.json();
    const existingTerm = terms.find(
      (t: { semesterNumber: number; academicSessionId: string; departmentId: string }) =>
        t.semesterNumber === 6 && t.academicSessionId === sess.id && t.departmentId === departmentId
    );
    if (!existingTerm) {
      const termRes = await request.post(`${API_BASE_URL}/api/college/semester-terms`, {
        headers: adminHeaders,
        data: {
          semesterName: "Semester 6",
          semesterNumber: 6,
          academicSessionId: sess.id,
          departmentId,
          parity: "Even",
        },
      });
      expect([200, 201]).toContain(termRes.status());
    }

    // Create regular Faculty, Coordinator Faculty, and HOD
    const facRes = await request.post(`${API_BASE_URL}/api/college/users`, {
      headers: adminHeaders,
      data: {
        fullName: "Prof. Regular Faculty",
        email: facultyEmail,
        enrollmentOrEmployeeCode: `EMP-F-${suffix}`,
        role: "Faculty",
        departmentId,
        designation: "AssociateProfessor",
      },
    });
    expect([200, 201]).toContain(facRes.status());
    facultyId = (await facRes.json()).id;

    const coordRes = await request.post(`${API_BASE_URL}/api/college/users`, {
      headers: adminHeaders,
      data: {
        fullName: "Prof. Project Coordinator",
        email: coordEmail,
        enrollmentOrEmployeeCode: `EMP-C-${suffix}`,
        role: "Faculty",
        departmentId,
        designation: "AssociateProfessor",
      },
    });
    expect([200, 201]).toContain(coordRes.status());
    coordId = (await coordRes.json()).id;

    const hodRes = await request.post(`${API_BASE_URL}/api/college/users`, {
      headers: adminHeaders,
      data: {
        fullName: "Dr. E2E HOD",
        email: hodEmail,
        enrollmentOrEmployeeCode: `EMP-H-${suffix}`,
        role: "HOD",
        departmentId,
        designation: "Professor",
      },
    });
    expect([200, 201]).toContain(hodRes.status());

    // Activate HOD, regular Faculty, and Coordinator Faculty
    await activateViaDevOtp(request, hodEmail, USER_PASS);
    await activateViaDevOtp(request, facultyEmail, USER_PASS);
    await activateViaDevOtp(request, coordEmail, USER_PASS);

    // HOD appoints coordId as Project Coordinator
    const hodLogin = await request.post(`${API_BASE_URL}/api/auth/login`, {
      data: { email: hodEmail, password: USER_PASS },
    });
    expect(hodLogin.status()).toBe(200);
    const { token: hodToken } = await hodLogin.json();

    const toggleRes = await request.put(`${API_BASE_URL}/api/hod/faculty/${coordId}/coordinator`, {
      headers: { Authorization: `Bearer ${hodToken}` },
      data: { isProjectCoordinator: true },
    });
    expect([200, 204]).toContain(toggleRes.status());

    // Verify Coordinator authorization against real PostgreSQL:
    // Non-coordinator Faculty -> 403 Forbidden
    const facLogin = await request.post(`${API_BASE_URL}/api/auth/login`, {
      data: { email: facultyEmail, password: USER_PASS },
    });
    expect(facLogin.status()).toBe(200);
    const { token: facToken } = await facLogin.json();
    const facCoordCheck = await request.get(`${API_BASE_URL}/api/coordinator/teams`, {
      headers: { Authorization: `Bearer ${facToken}` },
    });
    expect(facCoordCheck.status()).toBe(403);

    // Appointed Coordinator -> 200 OK
    const coordLogin = await request.post(`${API_BASE_URL}/api/auth/login`, {
      data: { email: coordEmail, password: USER_PASS },
    });
    expect(coordLogin.status()).toBe(200);
    const { token: coordToken } = await coordLogin.json();
    const coordCheck = await request.get(`${API_BASE_URL}/api/coordinator/teams`, {
      headers: { Authorization: `Bearer ${coordToken}` },
    });
    expect(coordCheck.status()).toBe(200);
  });

  test("3. CollegeAdmin Sidebar Navigation, CSV Import Workflow, Persistence, Direct Nav, Refresh & Unauthorized Access", async ({
    page,
    request,
  }) => {
    test.setTimeout(120000);

    // Login as CollegeAdmin via UI
    await loginViaUi(page, adminEmail, USER_PASS, /\/college/);

    // Sidebar navigation to "Students & Enrollment"
    const sidebarLink = page.locator("nav a", { hasText: "Students & Enrollment" });
    await expect(sidebarLink).toBeVisible({ timeout: 10000 });
    await sidebarLink.click();
    await expect(page).toHaveURL(`${BASE_URL}/college/students`, { timeout: 10000 });
    await page.waitForLoadState("networkidle");

    // Open Import Students.csv modal
    await page.getByRole("button", { name: /Import Students\.csv/i }).click();

    const csvText = [
      "StudentName,Email,StudentNumber,DepartmentCode,Program,AdmissionYear,CurrentSemester",
      `Aarav E2E Student,${csvStudent1Email},${csvStudent1Usn},CSE,BTECH,2024,6`,
      `Diya E2E Student,${csvStudent2Email},${csvStudent2Usn},CSE,BTECH,2024,6`,
    ].join("\n");

    const textarea = page.locator('textarea[placeholder*="StudentName"]');
    await expect(textarea).toBeVisible({ timeout: 5000 });
    await textarea.fill(csvText);

    // Verify on Server (Preview)
    const previewPromise = page.waitForResponse(
      (res) => res.url().includes("/api/college/students/bulk/preview") && res.request().method() === "POST"
    );
    await page.getByRole("button", { name: /Verify on Server/i }).click();
    const previewRes = await previewPromise;
    expect(previewRes.status()).toBe(200);
    await expect(page.getByText(/2 Create/i)).toBeVisible({ timeout: 5000 });

    // Confirm & Import
    const importPromise = page.waitForResponse(
      (res) => res.url().includes("/api/college/students/bulk") && !res.url().includes("preview") && res.request().method() === "POST"
    );
    await page.getByRole("button", { name: /Confirm & Import/i }).click();
    const importRes = await importPromise;
    expect(importRes.status()).toBe(200);

    // Verify persisted student rows appear in the table
    const studentTable = page.locator("table", { hasText: "Student Name" });
    await expect(studentTable).toContainText("Aarav E2E Student", { timeout: 10000 });
    await expect(studentTable).toContainText(csvStudent1Usn);
    await expect(studentTable).toContainText("Diya E2E Student");
    await expect(studentTable).toContainText(csvStudent2Usn);

    // Browser refresh preserves persisted students
    await page.reload({ waitUntil: "networkidle" });
    await expect(page).toHaveURL(`${BASE_URL}/college/students`);
    await expect(studentTable).toContainText("Aarav E2E Student", { timeout: 10000 });
    await expect(studentTable).toContainText(csvStudent1Usn);

    // Direct navigation to /college/students
    await page.goto(`${BASE_URL}/college`, { waitUntil: "networkidle" });
    await page.goto(`${BASE_URL}/college/students`, { waitUntil: "networkidle" });
    await expect(studentTable).toContainText("Diya E2E Student", { timeout: 10000 });

    // Logout, activate Student 1, and verify unauthorized role cannot access /college/students
    await logoutViaBff(page);
    await activateViaDevOtp(request, csvStudent1Email, USER_PASS);
    await loginViaUi(page, csvStudent1Email, USER_PASS, /\/student/);

    await page.goto(`${BASE_URL}/college/students`, { waitUntil: "networkidle" });
    await expect(page).not.toHaveURL(/\/college\/students/);

    // Verify API also blocks Student from GET /api/college/students
    const stuLogin = await request.post(`${API_BASE_URL}/api/auth/login`, {
      data: { email: csvStudent1Email, password: USER_PASS },
    });
    expect(stuLogin.status()).toBe(200);
    const { token: stuToken } = await stuLogin.json();
    const forbiddenRes = await request.get(`${API_BASE_URL}/api/college/students`, {
      headers: { Authorization: `Bearer ${stuToken}` },
    });
    expect(forbiddenRes.status()).toBe(403);
  });
});

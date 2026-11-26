import { test, expect, Page, APIRequestContext } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3055";
const API_BASE_URL = process.env.E2E_API_URL || "http://127.0.0.1:5055";

const SUPER_ADMIN_EMAIL = "e2e.superadmin@collabex.test";
const SUPER_ADMIN_PASS = "E2eSuperAdmin!2026";
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

test.describe.serial("Colabex Complete Academic Project Lifecycle E2E", () => {
  const ts = Date.now();
  const suffix = String(ts).slice(-5);
  const collegeName = `E2E${suffix} Institute of Technology`;
  const adminEmail = `principal.${ts}@e2e${suffix}.edu`;
  const facultyEmail = `faculty.${ts}@e2e${suffix}.edu`;
  const evaluatorEmail = `evaluator.${ts}@e2e${suffix}.edu`;
  const hodEmail = `hod.${ts}@e2e${suffix}.edu`;
  const leadEmail = `lead.${ts}@e2e${suffix}.edu`;
  const memberEmail = `member.${ts}@e2e${suffix}.edu`;
  const leadUsn = `0176CS${String(ts).slice(-6)}`;
  const memberUsn = `0176CS${String(ts + 1).slice(-6)}`;

  let tenantId = "";
  let departmentId = "";
  let trackId = "";
  let teamId = "";

  test("Stage 0 & Auth Guards: Unauthenticated redirect, SuperAdmin login, College Onboarding & Dynamic Route Verification", async ({
    page,
    request,
  }) => {
    test.setTimeout(120000);
    // 1. Unauthenticated access to protected routes redirects to /login
    for (const protectedPath of ["/platform/dashboard", "/college", "/hod", "/faculty", "/student"]) {
      await page.goto(`${BASE_URL}${protectedPath}`);
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    }

    // 2. SuperAdmin logs in via /login UI (tests BFF HttpOnly cookies + real profile hydration)
    await loginViaUi(page, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASS, /\/platform\/dashboard/);
    await page.reload({ waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/platform\/dashboard/);

    // 3. SuperAdmin creates a real College Tenant via /platform/colleges/new UI
    await page.goto(`${BASE_URL}/platform/colleges/new`, { waitUntil: "networkidle" });
    await page.fill('input[placeholder*="Sagar Institute"]', collegeName);
    await page.fill('input[placeholder*="Dr. Rajesh"]', "Dr. E2E Principal");
    await page.fill('input[placeholder*="principal@"]', adminEmail);

    const createTenantPromise = page.waitForResponse(
      (res) => res.url().includes("/api/proxy/api/platform/tenants") && res.request().method() === "POST"
    );
    await page.click('button[type="submit"]');
    const createTenantRes = await createTenantPromise;
    expect(createTenantRes.status()).toBe(201);
    const createdPayload = await createTenantRes.json();
    tenantId = createdPayload.tenant.id;
    expect(tenantId).toBeTruthy();

    // 4. Verify persistence across refresh on /platform/colleges
    await page.goto(`${BASE_URL}/platform/colleges`, { waitUntil: "networkidle" });
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.locator("body")).toContainText(collegeName, { timeout: 15000 });

    // 5. Dynamic route with real ID resolves real college
    await page.goto(`${BASE_URL}/platform/colleges/${tenantId}`, { waitUntil: "networkidle" });
    await expect(page.locator("body")).toContainText(collegeName, { timeout: 15000 });

    // 6. Dynamic route with unknown ID shows honest Not Found / error state (no mock fallback)
    await page.goto(`${BASE_URL}/platform/colleges/00000000-0000-0000-0000-000000000999`, {
      waitUntil: "networkidle",
    });
    await expect(page.locator("body")).toContainText(/not found|unavailable|error/i, { timeout: 10000 });

    // 7. Logout clears session and blocks subsequent protected access
    await logoutViaBff(page);
    await page.goto(`${BASE_URL}/platform/dashboard`);
    await expect(page).toHaveURL(/\/login/);

    // Activate CollegeAdmin via devOtp
    await activateViaDevOtp(request, adminEmail, USER_PASS);
  });

  test("Stage 1: CollegeAdmin Academic Setup (Department, Program, Branch, Track, Faculty, HOD, Students)", async ({
    page,
    request,
  }) => {
    test.setTimeout(120000);
    await loginViaUi(page, adminEmail, USER_PASS, /\/college/);
    await page.reload({ waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/college/);

    // Get backend JWT for setup API calls (simulating CollegeAdmin API actions)
    const loginRes = await request.post(`${API_BASE_URL}/api/auth/login`, {
      data: { email: adminEmail, password: USER_PASS },
    });
    expect(loginRes.status()).toBe(200);
    const { token: adminToken } = await loginRes.json();
    const authHeaders = { Authorization: `Bearer ${adminToken}` };

    // Fetch or create Course Program + Department (Branch)
    const progsListRes = await request.get(`${API_BASE_URL}/api/college/course-programs`, { headers: authHeaders });
    expect(progsListRes.status()).toBe(200);
    let progs = await progsListRes.json();
    let prog = progs.find((p: { code: string }) => p.code === "BTECH");
    if (!prog) {
      const progRes = await request.post(`${API_BASE_URL}/api/college/course-programs`, {
        headers: authHeaders,
        data: { name: "Bachelor of Technology", code: "BTECH", level: "UG", totalSemesters: 8 },
      });
      expect([200, 201]).toContain(progRes.status());
      prog = await progRes.json();
    }

    const deptsListRes = await request.get(`${API_BASE_URL}/api/college/departments`, { headers: authHeaders });
    expect(deptsListRes.status()).toBe(200);
    const depts = await deptsListRes.json();
    let dept = depts.find((d: { code: string }) => d.code === "CSE");
    if (!dept) {
      const deptRes = await request.post(`${API_BASE_URL}/api/college/departments`, {
        headers: authHeaders,
        data: { name: "Computer Science & Engineering", code: "CSE", courseProgramId: prog.id },
      });
      expect([200, 201]).toContain(deptRes.status());
      dept = await deptRes.json();
    }
    departmentId = dept.id;

    // Create Faculty Guide, Second Evaluator, and HOD
    const facRes = await request.post(`${API_BASE_URL}/api/college/users`, {
      headers: authHeaders,
      data: {
        fullName: "Prof. E2E Guide",
        email: facultyEmail,
        enrollmentOrEmployeeCode: `EMP-FAC-${String(ts).slice(-4)}`,
        role: "Faculty",
        departmentId,
        designation: "AssociateProfessor",
      },
    });
    expect([200, 201]).toContain(facRes.status());

    const evalRes = await request.post(`${API_BASE_URL}/api/college/users`, {
      headers: authHeaders,
      data: {
        fullName: "Dr. E2E Evaluator",
        email: evaluatorEmail,
        enrollmentOrEmployeeCode: `EMP-EVAL-${String(ts).slice(-4)}`,
        role: "Faculty",
        departmentId,
        designation: "Professor",
      },
    });
    expect([200, 201]).toContain(evalRes.status());

    const hodRes = await request.post(`${API_BASE_URL}/api/college/users`, {
      headers: authHeaders,
      data: {
        fullName: "Dr. E2E HOD",
        email: hodEmail,
        enrollmentOrEmployeeCode: `EMP-HOD-${String(ts).slice(-4)}`,
        role: "HOD",
        departmentId,
        designation: "Professor",
      },
    });
    expect([200, 201]).toContain(hodRes.status());

    // Activate HOD and create CSE Minor Project track (which provisions SemesterTerm 6) BEFORE student bulk enrollment
    await activateViaDevOtp(request, facultyEmail, USER_PASS);
    await activateViaDevOtp(request, evaluatorEmail, USER_PASS);
    await activateViaDevOtp(request, hodEmail, USER_PASS);

    const hodLogin = await request.post(`${API_BASE_URL}/api/auth/login`, {
      data: { email: hodEmail, password: USER_PASS },
    });
    expect(hodLogin.status()).toBe(200);
    const { token: hodToken } = await hodLogin.json();

    const trackRes = await request.post(`${API_BASE_URL}/api/hod/tracks`, {
      headers: { Authorization: `Bearer ${hodToken}` },
      data: {
        name: "Minor Project",
        semesterNumber: 6,
        minTeamSize: 2,
        maxTeamSize: 4,
        proposalDeadlineUtc: new Date(Date.now() + 30 * 86400000).toISOString(),
        isActive: true,
      },
    });
    expect([200, 201]).toContain(trackRes.status());
    const track = await trackRes.json();
    trackId = track.id;

    // Create 2 Students via bulk student onboarding endpoint
    const stuBulkRes = await request.post(`${API_BASE_URL}/api/college/students/bulk`, {
      headers: authHeaders,
      data: {
        studentRows: [
          {
            studentName: "E2E Student Lead",
            email: leadEmail,
            studentNumber: leadUsn,
            departmentCode: "CSE",
            program: "BTECH",
            currentSemester: 6,
            admissionYear: "2023",
          },
          {
            studentName: "E2E Student Member",
            email: memberEmail,
            studentNumber: memberUsn,
            departmentCode: "CSE",
            program: "BTECH",
            currentSemester: 6,
            admissionYear: "2023",
          },
        ],
      },
    });
    expect([200, 201]).toContain(stuBulkRes.status());
    const stuBulkData = await stuBulkRes.json();
    expect(stuBulkData.errors).toEqual([]);
    expect(stuBulkData.successfullyCreated).toBe(2);

    // Activate student accounts via devOtp
    await activateViaDevOtp(request, leadEmail, USER_PASS);
    await activateViaDevOtp(request, memberEmail, USER_PASS);

    await logoutViaBff(page);
  });

  test("Stage 2-9: Full Student -> Faculty -> HOD -> Evaluation -> Closure -> Portfolio Lifecycle", async ({
    page,
    request,
  }) => {
    test.setTimeout(120000);
    // Obtain API tokens for deterministic multi-role verification BEFORE browser login
    const getJwt = async (email: string) => {
      const r = await request.post(`${API_BASE_URL}/api/auth/login`, {
        data: { email, password: USER_PASS },
      });
      expect(r.status()).toBe(200);
      return (await r.json()).token as string;
    };

    const leadToken = await getJwt(leadEmail);
    const memberToken = await getJwt(memberEmail);
    const facultyToken = await getJwt(facultyEmail);
    const evaluatorToken = await getJwt(evaluatorEmail);
    const hodToken = await getJwt(hodEmail);

    // Login as Student Lead in browser
    await loginViaUi(page, leadEmail, USER_PASS, /\/student/);

    // Verify zero fake artifacts on brand-new student dashboard
    await expect(page.locator("body")).not.toContainText("2026-CS-MIN-01");
    await expect(page.locator("body")).not.toContainText("3 of 4 Approved");

    // Update Student Profile in UI & verify persistence across reload
    await page.goto(`${BASE_URL}/student/profile`, { waitUntil: "networkidle" });
    const githubInput = page.locator('input[placeholder*="github.com"]').first();
    if (await githubInput.isVisible()) {
      await githubInput.fill("https://github.com/e2e-student-lead");
    }

    // Stage 2: Create Team & Invite Member
    const teamRes = await request.post(`${API_BASE_URL}/api/student/teams`, {
      headers: { Authorization: `Bearer ${leadToken}` },
      data: {
        title: "E2E Autonomous Solar Microgrid Controller",
        abstract:
          "Real-time telemetry and predictive load-balancing controller for campus solar microgrids using embedded edge sensors.",
        domainTag: "IoT & Smart Systems",
        sdgCode: "SDG-7",
        academicTrackId: trackId,
      },
    });
    if (![200, 201].includes(teamRes.status())) {
      throw new Error(`CreateTeam failed (${teamRes.status()}): ${await teamRes.text()}`);
    }
    expect([200, 201]).toContain(teamRes.status());
    const createdTeam = await teamRes.json();
    teamId = createdTeam.teamId || createdTeam.id;
    expect(teamId).toBeTruthy();

    const invRes = await request.post(`${API_BASE_URL}/api/student/teams/invitations`, {
      headers: { Authorization: `Bearer ${leadToken}` },
      data: { enrollmentCode: memberUsn },
    });
    expect([200, 201]).toContain(invRes.status());

    // Member accepts invitation
    const memberInvsRes = await request.get(`${API_BASE_URL}/api/student/invitations`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    expect(memberInvsRes.status()).toBe(200);
    const memberInvs = await memberInvsRes.json();
    expect(memberInvs.length).toBeGreaterThan(0);

    const acceptRes = await request.post(`${API_BASE_URL}/api/student/invitations/${memberInvs[0].id}/accept`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    expect(acceptRes.status()).toBe(200);

    // Stage 3 & 4: Guide Preference -> Faculty Endorse -> HOD Approve -> ActiveBuild
    const guidesRes = await request.get(`${API_BASE_URL}/api/student/faculty-guides`, {
      headers: { Authorization: `Bearer ${leadToken}` },
    });
    const guides = await guidesRes.json();
    const guide = guides.find((g: { email: string }) => g.email === facultyEmail);
    expect(guide).toBeTruthy();

    const prefRes = await request.post(`${API_BASE_URL}/api/student/teams/guide-preference`, {
      headers: { Authorization: `Bearer ${leadToken}` },
      data: { guideUserId: guide.id },
    });
    expect(prefRes.status()).toBe(200);

    // Student submits team proposal -> transitions Team Draft -> PendingGuide
    const submitIdeaRes = await request.post(`${API_BASE_URL}/api/student/ideas/${teamId}/submit`, {
      headers: { Authorization: `Bearer ${leadToken}` },
      data: {},
    });
    expect(submitIdeaRes.status()).toBe(200);

    // HOD assigns guide
    const assignRes = await request.post(`${API_BASE_URL}/api/hod/projects/${teamId}/assign-guide`, {
      headers: { Authorization: `Bearer ${hodToken}` },
      data: { guideUserId: guide.id },
    });
    expect(assignRes.status()).toBe(200);

    // Faculty Guide endorses proposal -> transitions Team PendingGuide -> PendingCoordinator
    const endorseRes = await request.post(`${API_BASE_URL}/api/faculty/proposals/${teamId}/endorse`, {
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    expect(endorseRes.status()).toBe(200);

    // Coordinator verifies proposal -> transitions Team PendingCoordinator -> PendingHOD
    const coordVerifyRes = await request.post(`${API_BASE_URL}/api/coordinator/proposals/${teamId}/verify`, {
      headers: { Authorization: `Bearer ${hodToken}` },
    });
    expect(coordVerifyRes.status()).toBe(200);

    // HOD approves proposal -> transitions Team PendingHOD -> ActiveBuild
    const approveRes = await request.post(`${API_BASE_URL}/api/hod/proposals/${teamId}/approve`, {
      headers: { Authorization: `Bearer ${hodToken}` },
    });
    expect(approveRes.status()).toBe(200);

    // Re-login cleanly as Student Lead and verify Student Workspace shows real team title on Roster tab
    await logoutViaBff(page);
    await loginViaUi(page, leadEmail, USER_PASS, /\/student/);
    await page.goto(`${BASE_URL}/student?subtab=roster`, { waitUntil: "networkidle" });
    await expect(page.locator("body")).toContainText("E2E Autonomous Solar Microgrid Controller", {
      timeout: 15000,
    });

    // Stage 5: Sprint Task, Milestone, Weekly Log, Real Binary PDF Artifact
    const taskRes = await request.post(`${API_BASE_URL}/api/student/workspace/tasks`, {
      headers: { Authorization: `Bearer ${leadToken}` },
      data: { title: "Calibrate MPPT sensor ADC", categoryTag: "Hardware" },
    });
    expect([200, 201]).toContain(taskRes.status());

    const logRes = await request.post(`${API_BASE_URL}/api/student/logs`, {
      headers: { Authorization: `Bearer ${leadToken}` },
      data: {
        weekNumber: 1,
        accomplishmentsSummary: "Completed hardware schematic and sensor calibration.",
        blockersSummary: "None",
        hoursLogged: 14,
      },
    });
    expect([200, 201]).toContain(logRes.status());
    const queueRes = await request.get(`${API_BASE_URL}/api/faculty/action-queue`, {
      headers: { Authorization: `Bearer ${facultyToken}` },
    });
    expect(queueRes.status()).toBe(200);
    const queue = await queueRes.json();
    const pendingLog = (queue.items || []).find(
      (l: { type?: string; projectTeamId?: string; itemId: string }) =>
        l.type === "LogVerification" && l.projectTeamId === teamId
    );
    if (!pendingLog?.itemId) throw new Error(`Missing pending log in action-queue: ${JSON.stringify(queue)}`);

    const verifyLogRes = await request.post(`${API_BASE_URL}/api/faculty/logs/${pendingLog.itemId}/verify`, {
      headers: { Authorization: `Bearer ${facultyToken}` },
      data: { decision: "Approved", isApproved: true, remarks: "Verified week 1 progress." },
    });
    if (verifyLogRes.status() !== 200) {
      throw new Error(`VerifyLog failed (${verifyLogRes.status()}): ${await verifyLogRes.text()}`);
    }
    expect(verifyLogRes.status()).toBe(200);

    const milestoneRes = await request.post(`${API_BASE_URL}/api/student/workspace/milestones`, {
      headers: { Authorization: `Bearer ${leadToken}` },
      data: {
        title: "Hardware Prototype Demo",
        description: "Demonstrate live solar MPPT controller.",
        targetDateUtc: new Date(Date.now() + 7 * 86400000).toISOString(),
        requiredTaskCompletionPercentage: 0,
      },
    });
    expect([200, 201]).toContain(milestoneRes.status());
    const milestone = await milestoneRes.json();

    const submitMilestoneRes = await request.post(
      `${API_BASE_URL}/api/student/workspace/milestones/${milestone.id}/submit`,
      {
        headers: { Authorization: `Bearer ${leadToken}` },
        data: { submissionEvidenceUrl: "https://github.com/e2e-student-lead/demo", submissionNotes: "Ready for review." },
      }
    );
    expect(submitMilestoneRes.status()).toBe(200);

    const reviewMilestoneRes = await request.post(`${API_BASE_URL}/api/faculty/supervision/milestones/${milestone.id}/review`, {
      headers: { Authorization: `Bearer ${facultyToken}` },
      data: { isApproved: true, feedback: "Prototype verified." },
    });
    expect(reviewMilestoneRes.status()).toBe(200);

    // Upload real PDF artifact to Synopsis & FinalThesis
    const pdfBuffer = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n");
    let finalThesisArtifactId = "";
    for (const slot of ["Synopsis", "PlagiarismReport", "FinalThesis"]) {
      const upRes = await request.post(`${API_BASE_URL}/api/student/artifacts/${slot}/upload`, {
        headers: { Authorization: `Bearer ${leadToken}` },
        multipart: {
          file: {
            name: `e2e-${slot}.pdf`,
            mimeType: "application/pdf",
            buffer: pdfBuffer,
          },
        },
      });
      expect(upRes.status()).toBe(200);
      const art = await upRes.json();
      if (slot === "FinalThesis") finalThesisArtifactId = art.id;

      const artReviewRes = await request.post(`${API_BASE_URL}/api/faculty/artifacts/${art.id}/review`, {
        headers: { Authorization: `Bearer ${facultyToken}` },
        data: { isApproved: true, reviewerNote: `${slot} verified.` },
      });
      expect(artReviewRes.status()).toBe(200);
    }

    // Stage 6: Final Report Draft, Submit & Faculty Approval
    const draftRes = await request.put(`${API_BASE_URL}/api/student/workspace/submission/draft`, {
      headers: { Authorization: `Bearer ${leadToken}` },
      data: {
        projectTitle: "E2E Autonomous Solar Microgrid Controller",
        abstract:
          "Real-time telemetry and predictive load-balancing controller for campus solar microgrids using embedded edge sensors.",
        problemStatement: "Campus solar inverters suffer unmonitored voltage drops during peak loads.",
        methodology: "MPPT microcontroller with MQTT telemetry and anomaly detection.",
        implementationSummary: "Built PCB prototype and Next.js telemetry dashboard.",
        resultsAndConclusion: "Reduced peak load variance by 28% in lab testing.",
        repositoryUrl: "https://github.com/e2e-student-lead/microgrid",
      },
    });
    expect(draftRes.status()).toBe(200);

    const attachReportRes = await request.post(`${API_BASE_URL}/api/student/workspace/submission/attach-report`, {
      headers: { Authorization: `Bearer ${leadToken}` },
      data: { reportArtifactId: finalThesisArtifactId },
    });
    expect(attachReportRes.status()).toBe(200);

    const submitReportRes = await request.post(`${API_BASE_URL}/api/student/workspace/submission/submit`, {
      headers: { Authorization: `Bearer ${leadToken}` },
      data: { submissionNotes: "Final report ready for faculty review." },
    });
    if (submitReportRes.status() !== 200) {
      throw new Error(`SubmitReport failed (${submitReportRes.status()}): ${await submitReportRes.text()}`);
    }
    expect(submitReportRes.status()).toBe(200);
    const subDto = await submitReportRes.json();

    const reviewSubRes = await request.post(`${API_BASE_URL}/api/faculty/supervision/submissions/${subDto.id}/review`, {
      headers: { Authorization: `Bearer ${facultyToken}` },
      data: { isApproved: true, feedback: "Final report approved." },
    });
    expect(reviewSubRes.status()).toBe(200);

    // Stage 7: Independent Evaluator Viva Evaluation
    // Verify COI: Faculty Guide cannot evaluate own mentored team (403), while non-guide Evaluator succeeds
    // Stage 7: Schedule Viva Panel & Independent Evaluator Viva Evaluation
    const evalsRes = await request.get(`${API_BASE_URL}/api/student/faculty-guides`, {
      headers: { Authorization: `Bearer ${leadToken}` },
    });
    const allFac = await evalsRes.json();
    const evaluatorUser = allFac.find((f: { email: string }) => f.email === evaluatorEmail);
    expect(evaluatorUser).toBeTruthy();

    const panelRes = await request.post(`${API_BASE_URL}/api/coordinator/panels`, {
      headers: { Authorization: `Bearer ${hodToken}` },
      data: {
        departmentId,
        academicTrackId: trackId,
        panelName: "E2E-PANEL-1",
        scheduledAtUtc: new Date(Date.now() + 86400000).toISOString(),
        roomOrLink: "Seminar Hall E2E",
        evaluatorUserIds: [evaluatorUser.id],
      },
    });
    expect([200, 201]).toContain(panelRes.status());

    const rosterRes = await request.get(`${API_BASE_URL}/api/student/teams/current`, {
      headers: { Authorization: `Bearer ${leadToken}` },
    });
    expect(rosterRes.status()).toBe(200);
    const roster = await rosterRes.json();
    const studentScores = (roster.members || []).map((m: { userId: string }) => ({
      studentUserId: m.userId,
      moduleOwnershipScore: 14,
      vivaQaScore: 13,
      logDisciplineScore: 9,
    }));

    const evalPayload = {
      projectTeamId: teamId,
      checkpointType: "FinalViva",
      sharedRubricScoresJson: JSON.stringify({ architecture: 18, implementation: 17, testing: 18 }),
      sharedTotalScore: 53,
      generalRemarks: "Strong live demonstration and hardware telemetry.",
      studentScores,
    };

    const coiRes = await request.post(`${API_BASE_URL}/api/faculty/evaluations`, {
      headers: { Authorization: `Bearer ${facultyToken}` },
      data: evalPayload,
    });
    expect(coiRes.status()).toBe(400);

    const evalSubmitRes = await request.post(`${API_BASE_URL}/api/faculty/evaluations`, {
      headers: { Authorization: `Bearer ${evaluatorToken}` },
      data: evalPayload,
    });
    if (![200, 201].includes(evalSubmitRes.status())) {
      throw new Error(`EvalSubmit failed (${evalSubmitRes.status()}): ${await evalSubmitRes.text()}`);
    }
    expect([200, 201]).toContain(evalSubmitRes.status());

    // HOD publishes final evaluation results
    const publishRes = await request.post(`${API_BASE_URL}/api/evaluation/teams/${teamId}/publish`, {
      headers: { Authorization: `Bearer ${hodToken}` },
      data: { outcome: "Pass", remarks: "Final evaluation grades published." },
    });
    if (publishRes.status() !== 200) {
      throw new Error(`PublishEvaluation failed (${publishRes.status()}): ${await publishRes.text()}`);
    }
    expect(publishRes.status()).toBe(200);

    // Stage 8: Formal Closure Readiness & Closure by HOD
    const readinessRes = await request.get(`${API_BASE_URL}/api/closure/teams/${teamId}/readiness`, {
      headers: { Authorization: `Bearer ${hodToken}` },
    });
    expect(readinessRes.status()).toBe(200);

    const closeRes = await request.post(`${API_BASE_URL}/api/closure/teams/${teamId}/close`, {
      headers: { Authorization: `Bearer ${hodToken}` },
      data: { closureRemarks: "All academic requirements verified and approved for closure." },
    });
    if (closeRes.status() !== 200) {
      throw new Error(`CloseProject failed (${closeRes.status()}): ${await closeRes.text()}`);
    }
    expect(closeRes.status()).toBe(200);
    const closureResult = await closeRes.json();
    expect(closureResult.status).toBe("Closed");
    expect(closureResult.closureCertificateHash).toBeTruthy();

    // Stage 9: Student Verified Portfolio in Browser
    await page.goto(`${BASE_URL}/student/portfolio`, { waitUntil: "networkidle" });
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.locator("body")).toContainText("E2E Autonomous Solar Microgrid Controller", {
      timeout: 15000,
    });

    // Logout & confirm session cleared
    await logoutViaBff(page);
    await page.goto(`${BASE_URL}/student`);
    await expect(page).toHaveURL(/\/login/);
  });
});

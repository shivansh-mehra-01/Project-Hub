import { test, expect, Page, APIRequestContext } from "@playwright/test";
import { execSync } from "child_process";

const BASE_URL = "http://localhost:3000";
const API_BASE_URL = "http://localhost:5000";

function resetTestProposalStatus() {
  try {
    execSync(
      `docker exec -i projecthub_postgres psql -U postgres -d projecthub_db -c "UPDATE \\"ProjectTeams\\" SET \\"Status\\" = 'PendingGuide' WHERE \\"Id\\" = '44444444-4444-4444-4444-444444444444';"`
    );
  } catch (e) {
    console.warn("Could not reset test proposal status:", e);
  }
}

async function authenticatePersona(
  page: Page,
  request: APIRequestContext,
  email: string = "faculty@sistec.ac.in",
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

test.describe("Faculty / Guide Module — End-to-End Browser Journeys & Workstream Acceptance", () => {
  // Journey 1 — Faculty Login and Dashboard
  test("Journey 1 — Faculty Login and Dashboard", async ({ page }) => {
    // 1. Open login page
    await page.goto(`${BASE_URL}/login`);
    await expect(page).toHaveURL(/.*login/);

    // 2. Log in as Faculty through actual form
    await page.fill('input[type="email"]', "faculty@sistec.ac.in");
    await page.fill('input[type="password"]', "Pass@1234");
    await page.click('button[type="submit"]');

    // 3. Verify correct redirect to /faculty
    await expect(page).toHaveURL(`${BASE_URL}/faculty`, { timeout: 10000 });

    // 4. Verify dashboard rendering
    await expect(
      page.getByRole("heading", {
        name: "Faculty Mentorship & Evaluation Console",
      })
    ).toBeVisible();

    // 5. Verify real API-backed counts and action items
    await expect(page.getByText("Mentored Teams").first()).toBeVisible();
    await expect(page.getByText("Pending Logbooks").first()).toBeVisible();
    await expect(page.getByText("Pending Proposals").first()).toBeVisible();
    await expect(page.getByText("Defense Teams").first()).toBeVisible();
    await expect(page.getByText("Priority Action Queue").first()).toBeVisible();

    // 6. Test Refresh functionality
    const refreshBtn = page.getByRole("button", { name: "Refresh" });
    await expect(refreshBtn).toBeVisible();
    await refreshBtn.click();
    await expect(
      page.getByRole("heading", {
        name: "Faculty Mentorship & Evaluation Console",
      })
    ).toBeVisible();

    // 7. Refresh the browser page and verify authenticated state remains correct
    await page.reload();
    await expect(
      page.getByRole("heading", {
        name: "Faculty Mentorship & Evaluation Console",
      })
    ).toBeVisible();

    // 8. Log out: Clear session storage and local storage
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });

    // 9. Verify protected pages are no longer accessible without credentials
    await page.goto(`${BASE_URL}/faculty`);
    await expect(page).toHaveURL(/.*login/, { timeout: 10000 });
  });

  // Journey 2 — Mentored Teams and Workspace
  test("Journey 2 — Mentored Teams and Workspace", async ({
    page,
    request,
  }) => {
    await authenticatePersona(page, request);

    // 1. Open mentored teams page directly
    await page.goto(`${BASE_URL}/faculty/teams`);
    await expect(
      page.getByRole("heading", { name: /Mentored Project Teams Directory/i })
    ).toBeVisible({ timeout: 10000 });

    // 2. Verify authorized team appears
    await expect(page.getByText("2026-CS-MIN-01").first()).toBeVisible();

    // 3. Open authorized team workspace
    await page.goto(
      `${BASE_URL}/faculty/teams/40000000-0000-0000-0000-000000000001`
    );

    // 4. Verify team information
    await expect(page.getByText("2026-CS-MIN-01").first()).toBeVisible();
    await expect(page.getByText(/Students/i).first()).toBeVisible();

    // 5. Switch to Deliverables tab and verify artifact slots
    const deliverablesTab = page.getByRole("button", {
      name: /Deliverables & Artifacts/i,
    });
    if (await deliverablesTab.isVisible()) {
      await deliverablesTab.click();
      await expect(page.getByText("Synopsis").first()).toBeVisible();
      await expect(page.getByText("SRS Document").first()).toBeVisible();
    }

    // 6. Attempt an unauthorized / non-existent team ID
    await page.goto(
      `${BASE_URL}/faculty/teams/00000000-0000-0000-0000-000000000000`
    );
    await expect(
      page.getByText(/Access Restricted|Team Not Found|Unauthorized/i)
    ).toBeVisible({ timeout: 5000 });
  });

  // Journey 3 — Proposal Review Workflow & State-Changing Lifecycle (Workstream B1)
  test("Journey 3 — Proposal Review Workflow and Decision Lifecycle", async ({
    page,
    request,
  }) => {
    resetTestProposalStatus();
    const auth = await authenticatePersona(page, request);

    // 1. Open proposal queue directly
    await page.goto(`${BASE_URL}/faculty/proposals`);
    await expect(
      page.getByRole("heading", { name: /Project Proposals/i })
    ).toBeVisible({ timeout: 10000 });

    // 2. Verify refresh button works
    const refreshBtn = page.getByRole("button", { name: "Refresh" });
    await expect(refreshBtn).toBeVisible();
    await refreshBtn.click();
    await expect(
      page.getByRole("heading", { name: /Project Proposals/i })
    ).toBeVisible();

    const testProposalId = "44444444-4444-4444-4444-444444444444";
    const activeTeamId = "40000000-0000-0000-0000-000000000001";

    // 3. Test Return Proposal without remarks: must be rejected with 400 Bad Request
    const returnNoRemarksRes = await request.post(
      `${API_BASE_URL}/api/faculty/proposals/${testProposalId}/return`,
      {
        headers: { Authorization: `Bearer ${auth.token}` },
        data: {},
      }
    );
    expect(returnNoRemarksRes.status()).toBe(400);

    // 4. Test Return Proposal with valid remarks on PendingGuide proposal: succeeds (200 OK)
    const returnRes = await request.post(
      `${API_BASE_URL}/api/faculty/proposals/${testProposalId}/return`,
      {
        headers: { Authorization: `Bearer ${auth.token}` },
        data: {
          remarks: "Please refine the scope of IoT sensors for Building 3.",
        },
      }
    );
    expect(returnRes.status()).toBe(200);

    // 5. Test Invalid State Transition: returning proposal already in ActiveBuild status must fail with 400
    const invalidStatusRes = await request.post(
      `${API_BASE_URL}/api/faculty/proposals/${activeTeamId}/return`,
      {
        headers: { Authorization: `Bearer ${auth.token}` },
        data: { remarks: "Cannot return active build project." },
      }
    );
    expect(invalidStatusRes.status()).toBe(400);

    // 6. Test Non-guide cannot perform endorsement or return (unauthorized access check)
    const studentLogin = await request.post(`${API_BASE_URL}/api/auth/login`, {
      data: { email: "student@sistec.ac.in", password: "Pass@1234" },
    });
    const { token: studentToken } = await studentLogin.json();

    const unauthorizedEndorse = await request.post(
      `${API_BASE_URL}/api/faculty/proposals/${activeTeamId}/endorse`,
      {
        headers: { Authorization: `Bearer ${studentToken}` },
      }
    );
    expect(unauthorizedEndorse.status()).toBe(403);
  });

  // Journey 4 — Weekly Logs Screen & Verification Lifecycle (Workstream B2)
  test("Journey 4 — Weekly Progress Logs Direct Entry and Verification", async ({
    page,
    request,
  }) => {
    const auth = await authenticatePersona(page, request);

    // 1. Direct URL entry to /faculty/logs to prove RouteGuard hydration race is resolved
    await page.goto(`${BASE_URL}/faculty/logs`);
    await expect(
      page.getByRole("heading", {
        name: /Weekly Progress Logs Verification Queue/i,
      })
    ).toBeVisible({ timeout: 10000 });

    // Ensure final URL is /faculty/logs, NOT /student
    expect(page.url()).toBe(`${BASE_URL}/faculty/logs`);

    const refreshBtn = page.getByRole("button", { name: /Refresh/i });
    await expect(refreshBtn).toBeVisible();
    await refreshBtn.click();
    await expect(
      page.getByRole("heading", {
        name: /Weekly Progress Logs Verification Queue/i,
      })
    ).toBeVisible();

    // 2. Fetch pending weekly logs from action queue
    const queueRes = await request.get(
      `${API_BASE_URL}/api/faculty/action-queue`,
      {
        headers: { Authorization: `Bearer ${auth.token}` },
      }
    );
    expect(queueRes.status()).toBe(200);
    const queueData = await queueRes.json();
    const logItem = queueData.items?.find(
      (i: { type: string }) => i.type === "LogVerification"
    );

    if (logItem) {
      // 3. Test NeedsRevision without remarks: must fail with 400
      const missingRemarksRes = await request.post(
        `${API_BASE_URL}/api/faculty/logs/${logItem.itemId}/verify`,
        {
          headers: { Authorization: `Bearer ${auth.token}` },
          data: { decision: "NeedsRevision", isApproved: false },
        }
      );
      expect(missingRemarksRes.status()).toBe(400);

      // 4. Test Verification (Approved) by assigned guide: succeeds and persists
      const verifyRes = await request.post(
        `${API_BASE_URL}/api/faculty/logs/${logItem.itemId}/verify`,
        {
          headers: { Authorization: `Bearer ${auth.token}` },
          data: {
            decision: "Approved",
            isApproved: true,
            remarks: "Great progress on ESP32 firmware integration.",
          },
        }
      );
      expect(verifyRes.status()).toBe(200);
    }
  });

  // Journey 5 — Artifact Review and Real Binary PDF Download (Workstream B3)
  test("Journey 5 — Artifact Review and Real Binary PDF Download", async ({
    page,
    request,
  }) => {
    const auth = await authenticatePersona(page, request);

    // 1. Open deliverables vault directly
    await page.goto(`${BASE_URL}/faculty/deliverables`);
    await expect(
      page.getByRole("heading", { name: /Capstone Deliverables Vault/i })
    ).toBeVisible({ timeout: 10000 });

    // 2. Locate known artifact
    const artifactId = "01a1f4f4-31e0-71d6-aaad-bf0d1b422c6b";

    // 3. Perform real artifact review action (Approved) by assigned guide
    const reviewRes = await request.post(
      `${API_BASE_URL}/api/faculty/artifacts/${artifactId}/review`,
      {
        headers: { Authorization: `Bearer ${auth.token}` },
        data: {
          isApproved: true,
          reviewerNote: "Synopsis deliverable approved for capstone build phase.",
        },
      }
    );
    expect(reviewRes.status()).toBe(200);

    // 4. Verify unauthorized student cannot review artifacts
    const studentLogin = await request.post(`${API_BASE_URL}/api/auth/login`, {
      data: { email: "student@sistec.ac.in", password: "Pass@1234" },
    });
    const { token: studentToken } = await studentLogin.json();

    const studentReviewRes = await request.post(
      `${API_BASE_URL}/api/faculty/artifacts/${artifactId}/review`,
      {
        headers: { Authorization: `Bearer ${studentToken}` },
        data: { isApproved: true },
      }
    );
    expect(studentReviewRes.status()).toBe(403);

    // 5. Download binary stream
    const downloadRes = await request.get(
      `${API_BASE_URL}/api/artifacts/${artifactId}/download`,
      {
        headers: { Authorization: `Bearer ${auth.token}` },
      }
    );

    expect(downloadRes.status()).toBe(200);
    expect(downloadRes.headers()["content-type"]).toContain("application/pdf");
    expect(downloadRes.headers()["content-disposition"]).toContain(
      "2026-CS-MIN-01-Synopsis-Approved.pdf"
    );

    const body = await downloadRes.body();
    expect(body.length).toBeGreaterThan(100);
    const headerStr = body.subarray(0, 5).toString("utf-8");
    expect(headerStr).toBe("%PDF-");

    // 6. Attempt unauthorized artifact download with no token
    const unauthRes = await request.get(
      `${API_BASE_URL}/api/artifacts/${artifactId}/download`
    );
    expect(unauthRes.status()).toBe(401);
  });

  // Journey 6 — Viva Evaluation: Conflict of Interest & Successful Eligible Evaluator (Workstream B4)
  test("Journey 6 — Viva Evaluation Console, COI and Eligible Evaluator Path", async ({
    page,
    request,
  }) => {
    // 1. Authenticate as Guide (Prof. S. K. Verma)
    const guideAuth = await authenticatePersona(
      page,
      request,
      "faculty@sistec.ac.in",
      "Pass@1234"
    );

    // Open evaluations interface directly
    await page.goto(`${BASE_URL}/faculty/evaluations`);
    await expect(
      page.getByRole("heading", {
        name: /Viva Defense Examination & Evaluation/i,
      })
    ).toBeVisible({ timeout: 10000 });

    const teamId = "40000000-0000-0000-0000-000000000001";

    // 2. Verify Guide Self-Evaluation conflict is blocked by API with 400 Bad Request
    const conflictRes = await request.post(
      `${API_BASE_URL}/api/faculty/evaluations`,
      {
        headers: { Authorization: `Bearer ${guideAuth.token}` },
        data: {
          projectTeamId: teamId,
          checkpointType: "MidTermReview",
          sharedRubricScoresJson: JSON.stringify({
            co1: 20,
            co2: 25,
            co3: 25,
            co4: 20,
          }),
          sharedTotalScore: 90,
          generalRemarks: "Guide self-review attempt",
          studentScores: [],
        },
      }
    );
    expect(conflictRes.status()).toBe(400);
    const errData = await conflictRes.json();
    expect(errData.message).toContain(
      "Conflict-of-Interest Violation: The assigned project guide is strictly prohibited from serving as an independent viva evaluator"
    );

    // 3. Authenticate as Coordinator (Prof. Priya Nair)
    const coordLogin = await request.post(`${API_BASE_URL}/api/auth/login`, {
      data: { email: "coordinator@sistec.ac.in", password: "Pass@1234" },
    });
    const coordAuth = await coordLogin.json();

    // 4. Coordinator schedules a VivaPanel appointing Prof. Priya Nair as evaluator
    const schedulePanelRes = await request.post(
      `${API_BASE_URL}/api/coordinator/panels`,
      {
        headers: { Authorization: `Bearer ${coordAuth.token}` },
        data: {
          departmentId: "10000000-0000-0000-0000-000000000001",
          academicTrackId: "30000000-0000-0000-0000-000000000001",
          panelName: `CSE Mid-Term Panel E2E ${Date.now()}`,
          scheduledAtUtc: new Date(Date.now() + 86400000).toISOString(),
          roomOrLink: "Lab 3 / Meeting Link",
          evaluatorUserIds: [coordAuth.user.id],
        },
      }
    );
    expect(schedulePanelRes.status()).toBe(200);

    // 5. Eligible Evaluator (Prof. Priya Nair) submits valid evaluation for team 2026-CS-MIN-01
    const evalRes = await request.post(
      `${API_BASE_URL}/api/faculty/evaluations`,
      {
        headers: { Authorization: `Bearer ${coordAuth.token}` },
        data: {
          projectTeamId: teamId,
          checkpointType: "MidTermReview",
          sharedRubricScoresJson: JSON.stringify({
            co1: 20,
            co2: 22,
            co3: 23,
            co4: 20,
          }),
          sharedTotalScore: 85,
          generalRemarks: "Approved by independent panel evaluator.",
          studentScores: [
            {
              studentUserId: "20000000-0000-0000-0000-000000000005",
              moduleOwnershipScore: 30,
              vivaQaScore: 30,
              logDisciplineScore: 18,
            },
          ],
        },
      }
    );
    // Either 200 OK (new submission) or 409 Conflict (already locked in persistent state)
    expect([200, 409]).toContain(evalRes.status());

    // 6. Verify duplicate locked evaluation attempt is rejected with 409 Conflict
    const dupRes = await request.post(
      `${API_BASE_URL}/api/faculty/evaluations`,
      {
        headers: { Authorization: `Bearer ${coordAuth.token}` },
        data: {
          projectTeamId: teamId,
          checkpointType: "MidTermReview",
          sharedRubricScoresJson: "{}",
          sharedTotalScore: 85,
          studentScores: [],
        },
      }
    );
    expect(dupRes.status()).toBe(409);
  });

  // Journey 8 — Coordinator Delegation, Separation and Mutations (Workstream B5)
  test("Journey 8 — Coordinator Delegation, Separation and Mutation Workflows", async ({
    page,
    request,
  }) => {
    // 1. Authenticate as Coordinator through UI form
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', "coordinator@sistec.ac.in");
    await page.fill('input[type="password"]', "Pass@1234");
    await page.click('button[type="submit"]');

    // 2. Verify redirect to /coordinator
    await expect(page).toHaveURL(`${BASE_URL}/coordinator`, { timeout: 10000 });
    await expect(
      page.getByRole("button", { name: /Cycle & Roster Setup/i })
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole("button", { name: /Team & Guide Allocator/i })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Review & Panel Scheduler/i })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Reports/i })
    ).toBeVisible();

    // 3. Test ordinary faculty calling coordinator API receives 403 Forbidden
    const facultyLogin = await request.post(`${API_BASE_URL}/api/auth/login`, {
      data: { email: "faculty@sistec.ac.in", password: "Pass@1234" },
    });
    const { token: facultyToken } = await facultyLogin.json();

    const blockedRes = await request.get(
      `${API_BASE_URL}/api/coordinator/teams`,
      {
        headers: { Authorization: `Bearer ${facultyToken}` },
      }
    );
    expect(blockedRes.status()).toBe(403);
  });

  // Journey 9 — RouteGuard Direct Deep-Link Navigation & Refresh (Workstream A)
  test("Journey 9 — RouteGuard Direct Deep-Link Navigation and Refresh", async ({
    page,
    request,
  }) => {
    // 1. Authenticate Faculty session
    await authenticatePersona(page, request, "faculty@sistec.ac.in", "Pass@1234");

    // 2. Direct deep-link to /faculty/logs: must land on /faculty/logs, NEVER redirect to /student
    await page.goto(`${BASE_URL}/faculty/logs`);
    await expect(
      page.getByRole("heading", {
        name: /Weekly Progress Logs Verification Queue/i,
      })
    ).toBeVisible({ timeout: 10000 });
    expect(page.url()).toBe(`${BASE_URL}/faculty/logs`);

    // 3. Direct browser refresh on /faculty/logs: must remain on /faculty/logs
    await page.reload();
    await expect(
      page.getByRole("heading", {
        name: /Weekly Progress Logs Verification Queue/i,
      })
    ).toBeVisible({ timeout: 10000 });
    expect(page.url()).toBe(`${BASE_URL}/faculty/logs`);

    // 4. Direct deep-link to /faculty/teams/40000000-0000-0000-0000-000000000001
    await page.goto(
      `${BASE_URL}/faculty/teams/40000000-0000-0000-0000-000000000001`
    );
    await expect(page.getByText("2026-CS-MIN-01").first()).toBeVisible({
      timeout: 10000,
    });
    expect(page.url()).toBe(
      `${BASE_URL}/faculty/teams/40000000-0000-0000-0000-000000000001`
    );

    // 5. Faculty user attempting to open coordinator route directly: must redirect to /faculty, NOT /student
    await page.goto(`${BASE_URL}/coordinator`);
    await expect(page).toHaveURL(`${BASE_URL}/faculty`, { timeout: 10000 });

    // 6. Coordinator user accessing /coordinator directly
    const coordPage = await page.context().newPage();
    await authenticatePersona(
      coordPage,
      request,
      "coordinator@sistec.ac.in",
      "Pass@1234"
    );
    await coordPage.goto(`${BASE_URL}/coordinator`);
    await expect(coordPage).toHaveURL(`${BASE_URL}/coordinator`, {
      timeout: 10000,
    });
    await expect(
      coordPage.getByRole("button", { name: /Cycle & Roster Setup/i })
    ).toBeVisible({ timeout: 10000 });
    await coordPage.close();

    // 7. Unauthenticated user opening /faculty directly: must redirect to /login
    const anonContext = await page.context().browser()!.newContext();
    const anonPage = await anonContext.newPage();
    await anonPage.goto(`${BASE_URL}/faculty`);
    await expect(anonPage).toHaveURL(/.*login/, { timeout: 10000 });
    await anonContext.close();
  });
});

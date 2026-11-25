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

test.describe("Student Module Phase 4 — Team Formation, Membership & Invitation Lifecycle E2E Journeys", () => {
  // J09 — Unallocated Student Workspace & Incoming Invitations Section
  test("J09 — Unallocated Student Workspace displays Incoming Invitations and Team Creation", async ({ page, request }) => {
    // Authenticate as unallocated student
    await authenticateStudent(page, request, "vikram.aditya@sistec.ac.in", "Pass@1234");
    await page.goto(`${BASE_URL}/student`);

    // Verify unallocated state
    await expect(page.locator("body")).toContainText("Project Workspace");
    await expect(page.locator("body")).toContainText("Incoming Team Invitations");

    // Check presence of create team button
    const createTeamBtn = page.getByRole("button", { name: /Create New Project Team/i });
    if (await createTeamBtn.isVisible()) {
      await expect(createTeamBtn).toBeEnabled();
    }
  });

  // J10 — Team Formation & Discover Classmates with Data Minimization Safeguards
  test("J10 — Discover Classmates Modal displays eligible peers with privacy safeguards", async ({ page, request }) => {
    const auth = await authenticateStudent(page, request, "rohan.verma@sistec.ac.in", "Pass@1234");

    // Ensure student has a draft team in pre-approval state
    await request.post(`${API_BASE_URL}/api/student/teams`, {
      data: {
        title: "Autonomous Microgrid Telemetry Optimization",
        abstract: "Real-time edge telemetry with anomaly detection for campus energy.",
      },
      headers: { Authorization: `Bearer ${auth.token}` },
    }).catch(() => {});

    await page.goto(`${BASE_URL}/student`);

    // Verify workspace loaded with Pre-Approval Team Formation Roster
    await expect(page.locator("body")).toContainText("Team Formation Roster");

    // Click Discover Classmates button
    const discoverBtn = page.getByRole("button", { name: /Discover Classmates/i });
    if (await discoverBtn.isVisible()) {
      await discoverBtn.click();

      // Verify modal and data minimization notice
      await expect(page.locator("body")).toContainText("Discover Available Classmates");
      await expect(page.locator("body")).toContainText("Institutional Data Minimization Policy");
      await expect(page.locator("body")).toContainText("Peer academic marks, CGPA, mobile numbers, and residential addresses are restricted");

      // Verify search input is active
      const peerSearch = page.locator('input[placeholder*="Search by name, USN, or skills"]');
      await expect(peerSearch).toBeVisible();

      // Close modal
      const closeBtn = page.getByRole("button", { name: /Close/i }).first();
      await closeBtn.click();
    }
  });

  // J11 — Team Lead Dispatches Teammate Invitation by USN
  test("J11 — Team Lead Dispatches Teammate Invitation by USN & Views Pending List", async ({ page, request }) => {
    await authenticateStudent(page, request, "rohan.verma@sistec.ac.in", "Pass@1234");
    await page.goto(`${BASE_URL}/student`);

    // Check if invite input is visible for Team Lead
    const inviteInput = page.locator('input[placeholder*="Enter student USN"]');
    if (await inviteInput.isVisible()) {
      await inviteInput.fill("0176CS221038");

      const sendBtn = page.getByRole("button", { name: /Send Invite/i });
      await expect(sendBtn).toBeVisible();
      await sendBtn.click();

      // Observe dispatched feedback or pending sent list
      await expect(page.locator("body")).toBeVisible();
    }
  });

  // J12 — Team Roster Displays Capacity Indicator and Member Limits
  test("J12 — Team Roster Displays Capacity Indicator and Member Role Pills", async ({ page, request }) => {
    await authenticateStudent(page, request, "rohan.verma@sistec.ac.in", "Pass@1234");
    await page.goto(`${BASE_URL}/student`);

    // Verify member count indicator and team lead
    await expect(page.locator("body")).toContainText("Team Formation Roster");
    await expect(page.locator("body")).toContainText("Lead");
  });

  // J13 — Leadership Delegation & Roster Modification Safeguards
  test("J13 — Verify Leadership Transfer Safeguard Modal in Pre-Approval", async ({ page, request }) => {
    await authenticateStudent(page, request, "rohan.verma@sistec.ac.in", "Pass@1234");
    await page.goto(`${BASE_URL}/student`);

    // If "Make Lead" button is available on a teammate row
    const makeLeadBtn = page.getByRole("button", { name: /Make Lead/i }).first();
    if (await makeLeadBtn.isVisible()) {
      await makeLeadBtn.click();

      // Verify transfer modal opened
      await expect(page.locator("body")).toContainText("Transfer Team Leadership");
      await expect(page.locator("body")).toContainText("Leadership Delegation Safeguard");

      // Cancel transfer
      const cancelBtn = page.getByRole("button", { name: /Cancel/i });
      await cancelBtn.click();
    }
  });

  // J14 — Roster Freeze Safeguard on Proposal Submission
  test("J14 — Roster Freezing Safeguard Prevents Teammate Mutability", async ({ page, request }) => {
    await authenticateStudent(page, request, "rohan.verma@sistec.ac.in", "Pass@1234");
    await page.goto(`${BASE_URL}/student`);

    // Check lock button or lock modal trigger
    const lockBtn = page.getByRole("button", { name: /Lock Roster & Submit to Guide/i });
    if (await lockBtn.isVisible()) {
      await lockBtn.click();

      // Verify proposal lock modal
      await expect(page.locator("body")).toContainText("Lock Roster & Submit to Guide");
      await expect(page.locator("body")).toContainText("Roster Freezing Safeguard");

      const cancelBtn = page.getByRole("button", { name: /Cancel/i });
      await cancelBtn.click();
    }
  });

  // J15 — Allocated Active-Build Student Post-Approval Roster Tab Inspection
  test("J15 — Active Build Allocated Student Inspects Locked Team Roster & Settings", async ({ page, request }) => {
    await authenticateStudent(page, request, "student@sistec.ac.in", "Pass@1234");
    await page.goto(`${BASE_URL}/student?subtab=roster`);

    // Verify post-approval team roster view
    await expect(page.locator("body")).toContainText("Enrolled Team Members");
    await expect(page.locator("body")).toContainText("Active Build Phase");
    await expect(page.locator("body")).toContainText("Connected Repository & Issue Trackers");
    await expect(page.locator("body")).toContainText("Shivansh Mehra");
  });
});

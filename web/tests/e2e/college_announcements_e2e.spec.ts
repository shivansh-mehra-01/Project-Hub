import crypto from "crypto";
import { test, expect, BrowserContext } from "@playwright/test";

const BASE_URL = "http://localhost:3000";
const JWT_SECRET = "ProjectHubSuperSecretDevKeyMinLength32CharactersRequired!";
const JWT_ISSUER = "https://api.projecthub.local";
const JWT_AUDIENCE = "https://app.projecthub.local";

function base64Url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function mintJwt(params: {
  userId: string;
  email: string;
  role: "SuperAdmin" | "CollegeAdmin";
  collegeId: string;
}): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({
      sub: params.userId,
      user_id: params.userId,
      email: params.email,
      role: params.role,
      college_id: params.collegeId,
      ...(params.role === "SuperAdmin" ? { is_super_admin: "true" } : {}),
      iss: JWT_ISSUER,
      aud: JWT_AUDIENCE,
      iat: now,
      exp: now + 3600,
    })
  );
  const sig = base64Url(
    crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${payload}`).digest()
  );
  return `${header}.${payload}.${sig}`;
}

async function setSessionCookie(
  context: BrowserContext,
  params: {
    userId: string;
    email: string;
    role: "SuperAdmin" | "CollegeAdmin";
    collegeId: string;
  }
) {
  const token = mintJwt(params);
  await context.addCookies([
    {
      name: "colabex_access_token",
      value: token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

test.describe("Super Admin to College Admin Announcements — End-to-End", () => {
  test("Super Admin publishes selected-college announcement, selected College Admin views it on /college and /college/announcements, and non-selected college does not receive it", async ({
    browser,
  }) => {
    const uniqueTag = Date.now().toString().slice(-6);
    const title = `E2E College Notice ${uniqueTag}`;
    const fullMessage = `Full E2E announcement body for SISTEC-1 ${uniqueTag}.`;

    // 1. Super Admin logs in and publishes to Selected Colleges (SISTEC-1)
    const superContext = await browser.newContext();
    await setSessionCookie(superContext, {
      userId: "73694846-d19d-4a6e-9bcc-57c17ceed1e5",
      email: "mehrashiv8889@gmail.com",
      role: "SuperAdmin",
      collegeId: "0966ded6-5868-4e15-87a6-00f783cf330c",
    });
    const superPage = await superContext.newPage();

    await superPage.goto(`${BASE_URL}/platform/announcements`);
    await expect(superPage.getByRole("heading", { name: "Announcements" })).toBeVisible({
      timeout: 15000,
    });

    await superPage.getByRole("button", { name: /Create Announcement/i }).click();
    await superPage.fill('input[placeholder*="Scheduled Infrastructure"]', title);
    await superPage.locator('input[type="radio"][value="Selected Colleges"]').check();
    await superPage.fill('input[placeholder*="Search college by name or code"]', "SISTEC-1");
    await superPage
      .locator("label", { hasText: "SISTEC-1" })
      .locator('input[type="checkbox"]')
      .check();
    await superPage.fill('textarea[placeholder*="Provide complete details"]', fullMessage);
    await superPage.getByRole("button", { name: /Publish Announcement/i }).click();

    await expect(superPage.getByText(title)).toBeVisible({ timeout: 10000 });
    await superContext.close();

    // 2. Selected College Admin (SISTEC-1) sees it on /college, opens detail modal, and sees it on /college/announcements
    const selectedContext = await browser.newContext();
    await setSessionCookie(selectedContext, {
      userId: "01a211fc-9fa8-7faf-8a01-d2565b45f5d9",
      email: "shivanshmehra1646@gmail.com",
      role: "CollegeAdmin",
      collegeId: "01a211fc-9edc-7645-8ed9-78413b0259cc",
    });
    const selectedPage = await selectedContext.newPage();

    await selectedPage.goto(`${BASE_URL}/college`);
    const section = selectedPage.locator('section[aria-label="Platform Announcements"]');
    await expect(section).toBeVisible({ timeout: 15000 });
    await expect(section.getByText(title)).toBeVisible({ timeout: 10000 });

    // Open full announcement modal from dashboard
    await section.getByText(title).click();
    const dialog = selectedPage.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(fullMessage)).toBeVisible();
    await dialog.getByRole("button", { name: "Close", exact: true }).click();

    // Navigate via View All to /college/announcements
    await section.getByRole("link", { name: /View All/i }).click();
    await expect(selectedPage).toHaveURL(`${BASE_URL}/college/announcements`);
    await expect(selectedPage.getByRole("heading", { name: title, level: 2 })).toBeVisible({
      timeout: 10000,
    });

    await selectedContext.close();

    // 3. Non-selected College Admin (SAGA-D09F) does NOT receive the announcement on /college or /college/announcements
    const nonSelectedContext = await browser.newContext();
    await setSessionCookie(nonSelectedContext, {
      userId: "01a213f4-7181-7e63-a019-922b2b1535e5",
      email: "shivanshmehra1646-2@gmail.com",
      role: "CollegeAdmin",
      collegeId: "0691a43e-a28a-4905-a305-8d88c40e3365",
    });
    const nonSelectedPage = await nonSelectedContext.newPage();

    await nonSelectedPage.goto(`${BASE_URL}/college`);
    const nonSelectedSection = nonSelectedPage.locator(
      'section[aria-label="Platform Announcements"]'
    );
    await expect(nonSelectedSection).toBeVisible({ timeout: 15000 });
    await expect(nonSelectedSection.getByText("Loading platform announcements")).toHaveCount(0);
    await expect(nonSelectedSection.getByText(title)).toHaveCount(0);

    await nonSelectedPage.goto(`${BASE_URL}/college/announcements`);
    await expect(
      nonSelectedPage.getByRole("heading", { name: "Platform Announcements" })
    ).toBeVisible({ timeout: 15000 });
    await expect(nonSelectedPage.getByRole("heading", { name: title, level: 2 })).toHaveCount(0);

    await nonSelectedContext.close();
  });
});

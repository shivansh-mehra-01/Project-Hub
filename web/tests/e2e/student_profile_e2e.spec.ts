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

function mintStudentJwt(): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({
      sub: "01a2167e-58f0-7f0e-bd37-b1acefe5e2f3",
      user_id: "01a2167e-58f0-7f0e-bd37-b1acefe5e2f3",
      email: "priya.verma26@gmail.com",
      role: "Student",
      college_id: "01a211fc-9edc-7645-8ed9-78413b0259cc",
      department_id: "01a211ff-f7c7-7b34-b0c3-b6ed49010745",
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

async function setStudentCookie(context: BrowserContext) {
  await context.addCookies([
    {
      name: "colabex_access_token",
      value: mintStudentJwt(),
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

test.describe("Student Profile — Read-Only View, Edit Mode & Dynamic Social Links", () => {
  test("renders read-only profile by default, supports Edit/Cancel, persists dynamic social links & skills across reload", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    await setStudentCookie(context);
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/student/profile`);
    await expect(page.getByRole("heading", { name: "Priya Verma" })).toBeVisible({ timeout: 15000 });

    // 1. Default mode is Read-Only (no disabled form inputs for identity, accurate academic context)
    await expect(page.locator("input[disabled]")).toHaveCount(0);
    await expect(page.getByText("2025–2026 • Minor Sem 6")).toHaveCount(0);
    await expect(page.getByText("AY 2026–2027 • Not Enrolled")).toBeVisible();
    await expect(page.getByText("SISTEC-1 • CSE")).toBeVisible();
    await expect(page.getByText("SISTEC26CSE002")).toBeVisible();
    await expect(page.getByText("Computer Science & Engineering (CSE)")).toBeVisible();
    await expect(page.getByText("No active semester enrollment")).toBeVisible();
    await expect(page.getByText("Sagar Institute 1 (SISTEC-1)")).toBeVisible();
    await expect(page.getByText("Registered Email")).toBeVisible();

    // 2. Enter Edit Mode & verify Cancel discards unsaved changes
    await page.getByRole("button", { name: "Edit Profile" }).click();
    await page.fill('textarea[placeholder*="Describe your research"]', "Temporary unsaved bio");
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByText("Temporary unsaved bio")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Edit Profile" })).toBeVisible();

    // 3. Enter Edit Mode, add 2 dynamic social links, skills, bio, phone, and Save
    await page.getByRole("button", { name: "Edit Profile" }).click();
    await page.getByRole("button", { name: "TypeScript", exact: true }).click();
    await page.getByRole("button", { name: "Add Other" }).click();
    await page.fill('input[placeholder="Type tag..."]', "GraphQL");
    await page.getByRole("button", { name: "Add", exact: true }).click();

    await page.fill('textarea[placeholder*="Describe your research"]', "Distributed systems & cloud engineering.");
    await page.fill('input[placeholder*="+91"]', "+91 98765 43210");

    const initialLinkCount = await page.locator('input[id^="link-url-"]').count();

    // Link 1: GitHub
    await page.getByRole("button", { name: "Add Link" }).click();
    await page.fill(`#link-url-${initialLinkCount}`, "https://github.com/priya-verma26");

    // Link 2: Other -> Kaggle
    await page.getByRole("button", { name: "Add Link" }).click();
    await page.selectOption(`#link-platform-${initialLinkCount + 1}`, "Other");
    await page.fill(`#link-label-${initialLinkCount + 1}`, "Kaggle");
    await page.fill(`#link-url-${initialLinkCount + 1}`, "https://kaggle.com/priyaverma26");

    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByText("Your profile changes have been saved.")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("80%")).toBeVisible();

    // 4. Reload and confirm persisted Read-Only display
    await page.reload();
    await expect(page.getByText("80%")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Distributed systems & cloud engineering.")).toBeVisible();
    await expect(page.getByText("+91 98765 43210")).toBeVisible();
    await expect(page.getByText("GraphQL")).toBeVisible();
    await expect(page.getByRole("link", { name: /priya-verma26/i })).toHaveAttribute(
      "href",
      "https://github.com/priya-verma26"
    );
    await expect(page.getByRole("link", { name: /Kaggle/i })).toHaveAttribute(
      "href",
      "https://kaggle.com/priyaverma26"
    );

    // 5. Clean up test-added fields
    await page.getByRole("button", { name: "Edit Profile" }).click();
    await page.getByRole("button", { name: "TypeScript", exact: true }).click();
    await page.getByRole("button", { name: "Remove GraphQL" }).click();
    await page.getByRole("button", { name: `Remove link ${initialLinkCount + 2}` }).click();
    await page.getByRole("button", { name: `Remove link ${initialLinkCount + 1}` }).click();
    await page.fill('textarea[placeholder*="Describe your research"]', "");
    await page.fill('input[placeholder*="+91"]', "");
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByText("Your profile changes have been saved.")).toBeVisible({ timeout: 10000 });

    await context.close();
  });
});

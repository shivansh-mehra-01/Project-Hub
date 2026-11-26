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

function mintCollegeAdminJwt(): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({
      sub: "01a211fc-9fa8-7faf-8a01-d2565b45f5d9",
      user_id: "01a211fc-9fa8-7faf-8a01-d2565b45f5d9",
      email: "shivanshmehra1646@gmail.com",
      role: "CollegeAdmin",
      college_id: "01a211fc-9edc-7645-8ed9-78413b0259cc",
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

async function setCollegeAdminCookie(context: BrowserContext) {
  await context.addCookies([
    {
      name: "colabex_access_token",
      value: mintCollegeAdminJwt(),
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

test.describe("College Admin Password Reset UI — OTP Messaging & Failure Handling", () => {
  test("displays OTP messaging (15 minutes), handles emailDispatched=false as error, and shows success only when dispatched", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    await setCollegeAdminCookie(context);
    const page = await context.newPage();

    // Stub staff directory so the test never modifies or relies on real staff credentials
    await page.route("**/api/proxy/api/college/users**", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            {
              id: "11111111-1111-1111-1111-111111111111",
              fullName: "Test Faculty Member",
              email: "test.faculty@sistec.ac.in",
              role: "Faculty",
              isActive: true,
              isActivated: true,
              designation: "Assistant Professor",
            },
          ]),
        });
        return;
      }
      await route.continue();
    });

    await page.goto(`${BASE_URL}/college/users`);
    await expect(page.getByText("Test Faculty Member")).toBeVisible({ timeout: 15000 });

    // 1. Test emailDispatched=false (503 failure)
    await page.route(
      "**/api/proxy/api/college/users/11111111-1111-1111-1111-111111111111/reset-password",
      async (route) => {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            emailDispatched: false,
            code: "EMAIL_DELIVERY_FAILED",
            message:
              "Unable to dispatch the password reset verification code email. Please check the institutional mail configuration and try again.",
          }),
        });
      }
    );

    await page.getByRole("button", { name: "Reset Password" }).first().click();

    await expect(page.getByText("User-Directed OTP Reset")).toBeVisible();
    await expect(page.getByText("15 minutes")).toBeVisible();
    await expect(page.getByText("24 hours")).toHaveCount(0);

    await page.getByRole("button", { name: "Send Verification Code" }).click();

    await expect(page.getByRole("dialog").getByRole("alert")).toContainText("Unable to dispatch");
    await expect(page.getByText("Password Reset Code Dispatched")).toHaveCount(0);

    // 2. Test emailDispatched=true (200 success)
    await page.unroute(
      "**/api/proxy/api/college/users/11111111-1111-1111-1111-111111111111/reset-password"
    );
    await page.route(
      "**/api/proxy/api/college/users/11111111-1111-1111-1111-111111111111/reset-password",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            emailDispatched: true,
            message:
              "A 6-digit password reset verification code has been dispatched to the user's official email address (valid for 15 minutes).",
            expiresAtUtc: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          }),
        });
      }
    );

    await page.getByRole("button", { name: "Send Verification Code" }).click();
    await expect(page.getByRole("heading", { name: "Password Reset Code Dispatched" })).toBeVisible();
    await expect(page.getByText(/6-digit verification code.*15 minutes/i)).toBeVisible();

    await context.close();
  });
});

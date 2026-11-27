import { test, expect } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3055";

test.describe("Production Standalone CSP & CSRF Verification", () => {
  test("Production build serves CSP without unsafe-eval, zero CSP violations on key pages, and enforces CSRF Origin/Referer", async ({
    page,
    request,
  }) => {
    const cspViolations: string[] = [];
    page.on("pageerror", (err) => cspViolations.push(`pageerror: ${err.message}`));
    page.on("console", (msg) => {
      if (msg.type() === "error" && msg.text().toLowerCase().includes("content security policy")) {
        cspViolations.push(`console: ${msg.text()}`);
      }
    });

    await page.addInitScript(() => {
      document.addEventListener("securitypolicyviolation", (e) => {
        (window as unknown as { __cspViolations?: string[] }).__cspViolations ??= [];
        (window as unknown as { __cspViolations?: string[] }).__cspViolations!.push(
          `${e.violatedDirective}: ${e.blockedURI}`
        );
      });
    });

    // 1. Check CSP header & zero violations on / and /login
    const homeRes = await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
    const cspHeader = homeRes?.headers()["content-security-policy"] || "";
    expect(cspHeader).not.toContain("unsafe-eval");
    expect(cspHeader).not.toContain("http://localhost:5000");

    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await expect(page.getByText(/First time\? Use 'Forgot password'/i)).toBeVisible();

    // 2. Verify superadmin login + refresh + logout via BFF with real Origin
    await page.fill('input[type="email"]', "superadmin@colabex.test");
    await page.fill('input[type="password"]', "SuperAdminPassword123!");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/platform\/dashboard/, { timeout: 15000 });
    await page.waitForLoadState("networkidle");

    const refreshRes = await page.evaluate(async () => {
      const r = await fetch("/api/auth/refresh", { method: "POST" });
      return r.status;
    });
    expect(refreshRes).toBe(200);

    const logoutStatus = await page.evaluate(async () => {
      const r = await fetch("/api/auth/logout", { method: "POST" });
      return r.status;
    });
    expect(logoutStatus).toBe(200);

    const recordedViolations = await page.evaluate(
      () => (window as unknown as { __cspViolations?: string[] }).__cspViolations ?? []
    );
    expect([...cspViolations, ...recordedViolations]).toEqual([]);

    // 3. CSRF: state-changing POST without Origin or Referer must be rejected with 403
    const csrfRes = await request.post(`${BASE_URL}/api/auth/login`, {
      data: { email: "superadmin@colabex.test", password: "SuperAdminPassword123!" },
      headers: {},
    });
    expect(csrfRes.status()).toBe(403);
  });
});

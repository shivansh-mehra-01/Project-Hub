import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

// Allow Node ESM to resolve extensionless TypeScript relative imports used by Next.js/tsconfig
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      specifier.startsWith(".") &&
      !path.extname(specifier) &&
      context.parentURL?.endsWith(".ts")
    ) {
      const parentDir = path.dirname(new URL(context.parentURL).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
      const tsUrl = pathToFileURL(path.resolve(parentDir, `${specifier}.ts`)).href;
      return { url: tsUrl, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

const { findRouteByPath, isRouteAuthorized, ROUTE_REGISTRY } = await import(
  "../src/navigation/routeRegistry.ts"
);
const { getBreadcrumbs, getCommandPaletteItems, getSidebarNav } = await import(
  "../src/navigation/navigationSelectors.ts"
);

test("findRouteByPath prioritizes exact routes over dynamic patterns", () => {
  const newCollege = findRouteByPath("/platform/colleges/new");
  assert.equal(newCollege?.path, "/platform/colleges/new");
  assert.equal(newCollege?.label, "Add College");

  const addCollege = findRouteByPath("/platform/colleges/add");
  assert.equal(addCollege?.path, "/platform/colleges/add");

  const detailCollege = findRouteByPath("/platform/colleges/col-123");
  assert.equal(detailCollege?.path, "/platform/colleges/[id]");
  assert.equal(detailCollege?.label, "College Details");
});

test("findRouteByPath matches dynamic routes only on exact segment count", () => {
  const teamWorkspace = findRouteByPath("/faculty/teams/team-abc-123");
  assert.equal(teamWorkspace?.path, "/faculty/teams/[teamId]");

  const appReview = findRouteByPath("/platform/colleges/applications/app-42");
  assert.equal(appReview?.path, "/platform/colleges/applications/[id]");

  assert.equal(findRouteByPath("/faculty/teams/team-abc-123/extra"), undefined);
  assert.equal(findRouteByPath("/platform/colleges/applications"), undefined);
});

test("findRouteByPath does not match unknown routes to parent routes or collide on similar names", () => {
  assert.equal(findRouteByPath("/student/nonexistent"), undefined);
  assert.equal(findRouteByPath("/hod/unknown/path"), undefined);
  assert.equal(findRouteByPath("/platform/unknown"), undefined);

  assert.equal(findRouteByPath("/platform/security")?.path, "/platform/security");
  assert.equal(findRouteByPath("/platform/security-audit")?.path, "/platform/security-audit");
  assert.equal(findRouteByPath("/platform/support")?.path, "/platform/support");
  assert.equal(findRouteByPath("/platform/support-health")?.path, "/platform/support-health");
});

test("getSidebarNav returns strictly role-scoped items with profile moved to footer", () => {
  const studentNav = getSidebarNav("Student");
  assert.deepEqual(
    studentNav.map((i) => i.href),
    ["/student", "/student/explore", "/student/portfolio"]
  );

  const facultyNav = getSidebarNav("Faculty", {}, false);
  assert.deepEqual(
    facultyNav.map((i) => i.href),
    [
      "/faculty",
      "/faculty/teams",
      "/faculty/proposals",
      "/faculty/logs",
      "/faculty/deliverables",
      "/faculty/evaluations",
    ]
  );

  const coordinatorNav = getSidebarNav("Faculty", {}, true);
  assert.equal(coordinatorNav.length, 7);
  assert.equal(coordinatorNav[6].href, "/coordinator");
  assert.equal(coordinatorNav[6].section, "COORDINATOR");

  const hodNav = getSidebarNav("HOD");
  assert.deepEqual(
    hodNav.map((i) => i.href),
    [
      "/hod",
      "/hod/projects",
      "/hod/students",
      "/hod/faculty",
      "/hod/approvals",
      "/hod/reports",
    ]
  );

  const collegeNav = getSidebarNav("CollegeAdmin");
  assert.deepEqual(
    collegeNav.map((i) => i.href),
    [
      "/college",
      "/college/courses",
      "/college/hods",
      "/college/students",
      "/college/users",
      "/college/announcements",
      "/college/settings",
    ]
  );

  const superAdminNav = getSidebarNav("SuperAdmin");
  assert.deepEqual(
    superAdminNav.map((i) => i.href),
    [
      "/platform/dashboard",
      "/platform/colleges",
      "/platform/administrators",
      "/platform/announcements",
      "/platform/support-health",
      "/platform/security-audit",
      "/platform/analytics",
    ]
  );
});

test("isRouteAuthorized enforces role boundaries and coordinatorOnly gating", () => {
  assert.equal(isRouteAuthorized("/activate", "Student"), true);
  assert.equal(isRouteAuthorized("/student", "Student"), true);
  assert.equal(isRouteAuthorized("/hod", "Student"), false);
  assert.equal(isRouteAuthorized("/coordinator", "Faculty", false), false);
  assert.equal(isRouteAuthorized("/coordinator", "Faculty", true), true);
  assert.equal(isRouteAuthorized("/faculty/teams/team-1", "Faculty"), true);
  assert.equal(isRouteAuthorized("/faculty/teams/team-1", "CollegeAdmin"), false);
  assert.equal(isRouteAuthorized("/platform/colleges/col-1", "SuperAdmin"), true);
  assert.equal(isRouteAuthorized("/platform/unknown", "SuperAdmin"), false);
});

test("getBreadcrumbs avoids duplicate titles and raw dynamic template strings", () => {
  for (const route of ROUTE_REGISTRY) {
    const samplePath = route.path
      .replace("[teamId]", "team-1")
      .replace("[id]", "item-1");
    const role = route.allowedRoles[0];
    const crumbs = getBreadcrumbs(samplePath, role);
    assert.notEqual(crumbs.pageTitle, crumbs.breadcrumb);
    assert.equal(crumbs.pageTitle.includes("["), false);
  }
});

test("getCommandPaletteItems excludes template routes and redirect aliases", () => {
  const roles = ["Student", "Faculty", "HOD", "CollegeAdmin", "SuperAdmin"];
  for (const role of roles) {
    const items = getCommandPaletteItems(role, {}, role === "Faculty");
    const navItems = items.filter((i) => i.category === "Navigation");
    for (const item of navItems) {
      assert.equal(item.path?.includes("["), false, `Template path leaked: ${item.path}`);
      assert.equal(
        item.subtitle.startsWith("Alias for ") || item.subtitle.startsWith("Redirect to "),
        false,
        `Redirect alias leaked: ${item.path}`
      );
    }
  }
});

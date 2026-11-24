import test from "node:test";
import assert from "node:assert/strict";
import { resolveCyclesState } from "../src/features/college-admin/views/accreditation/accreditationCycleResolver.ts";

const mockInitialCycles = [
  {
    id: "cycle-nba-cse-2026",
    collegeId: "col-sistec",
    frameworkId: "fw-nba",
    frameworkCode: "NBA",
    frameworkName: "National Board of Accreditation",
    versionId: "ver-nba-2025",
    versionLabel: "NBA Tier-II SAR Manual (Rev. 2025)",
    level: "Program",
    programId: "prog-btech",
    programName: "B.Tech Computer Science & Engineering",
    departmentId: "dept-cse",
    departmentCode: "CSE",
    cycleName: "B.Tech CSE - 2026 SAR Accreditation Cycle",
    academicYear: "2026–2027",
    status: "DataCollection",
    startDate: "2026-07-01",
    endDate: "2027-05-31",
    overallScore: 684,
    overallGrade: "Accredited (Provisional 3 Yrs)",
    completionPct: 68.5,
    pendingReviews: 3,
    evidenceCount: 24,
    createdAtUtc: "2026-07-10T10:00:00Z",
    updatedAtUtc: "2026-11-20T14:30:00Z",
  },
  {
    id: "cycle-naac-inst-2026",
    collegeId: "col-sistec",
    frameworkId: "fw-naac",
    frameworkCode: "NAAC",
    frameworkName: "National Assessment and Accreditation Council",
    versionId: "ver-naac-2024",
    versionLabel: "NAAC Institutional Manual (RAF 2024)",
    level: "Institution",
    cycleName: "SISTec Institutional NAAC Cycle 2",
    academicYear: "2026–2027",
    status: "Planning",
    startDate: "2026-09-01",
    endDate: "2027-11-30",
    overallScore: 3.24,
    overallGrade: "A Grade",
    completionPct: 32.0,
    pendingReviews: 1,
    evidenceCount: 12,
    createdAtUtc: "2026-09-05T09:00:00Z",
    updatedAtUtc: "2026-11-18T11:00:00Z",
  },
];

const populatedCycles = [
  {
    id: "cycle-live-1",
    collegeId: "col-live",
    frameworkId: "fw-nba",
    frameworkCode: "NBA",
    frameworkName: "National Board of Accreditation",
    versionId: "ver-nba-2025",
    versionLabel: "NBA Tier-II SAR Manual (Rev. 2025)",
    level: "Program",
    programId: "prog-me",
    programName: "B.Tech Mechanical Engineering",
    cycleName: "B.Tech ME 2026 Cycle",
    academicYear: "2026–2027",
    status: "DataCollection",
    startDate: "2026-07-01",
    completionPct: 45.0,
    pendingReviews: 1,
    evidenceCount: 10,
    createdAtUtc: "2026-08-01T00:00:00Z",
    updatedAtUtc: "2026-11-01T00:00:00Z",
  },
];

test("1. Initial mock state followed by successful API response containing [] clears all cycles", () => {
  const result = resolveCyclesState(mockInitialCycles, {
    status: "fulfilled",
    value: [],
  });

  assert.strictEqual(result.cycles.length, 0, "Cycles array must be explicitly cleared to empty");
  assert.strictEqual(result.activeCycleId, "", "Active cycle ID must be cleared to empty");
});

test("2. Successful populated response displays the returned cycles", () => {
  const result = resolveCyclesState([], {
    status: "fulfilled",
    value: populatedCycles,
  });

  assert.strictEqual(result.cycles.length, 1);
  assert.strictEqual(result.cycles[0].id, "cycle-live-1");
  assert.strictEqual(result.cycles[0].cycleName, "B.Tech ME 2026 Cycle");
  assert.strictEqual(result.activeCycleId, "cycle-live-1");
});

test("3. Failed API request does not incorrectly clear valid existing state", () => {
  const existingCycles = [...populatedCycles];
  const result = resolveCyclesState(existingCycles, {
    status: "rejected",
    reason: new Error("Network timeout or 500 Internal Server Error"),
  });

  assert.strictEqual(result.cycles.length, 1, "Existing cycles must not be cleared on request failure");
  assert.strictEqual(result.cycles[0].id, "cycle-live-1");
  assert.strictEqual(result.activeCycleId, "cycle-live-1");
});

test("4. A fresh college displays the correct NBA and NAAC empty states", () => {
  // A fresh college receives [] from API
  const { cycles } = resolveCyclesState([], {
    status: "fulfilled",
    value: [],
  });

  const nbaCycle = cycles.find((c) => c.frameworkCode === "NBA");
  const naacCycle = cycles.find((c) => c.frameworkCode === "NAAC");

  assert.strictEqual(nbaCycle, undefined, "Fresh college must have no active NBA cycle");
  assert.strictEqual(naacCycle, undefined, "Fresh college must have no active NAAC cycle");
  assert.strictEqual(cycles.length, 0, "Cycles table collection must be empty");
});

test("5. No synthetic cycle is displayed after the API returns an empty collection", () => {
  // Even if mock data was present in memory prior to network resolution
  const { cycles } = resolveCyclesState(mockInitialCycles, {
    status: "fulfilled",
    value: [],
  });

  assert.strictEqual(cycles.some((c) => c.id === "cycle-nba-cse-2026"), false, "Mock NBA cycle must not persist");
  assert.strictEqual(cycles.some((c) => c.id === "cycle-naac-inst-2026"), false, "Mock NAAC cycle must not persist");
  assert.strictEqual(cycles.length, 0);
});

import test from "node:test";
import assert from "node:assert/strict";
import {
  formatFacultyDesignation,
  getEligibleHodCandidates,
  resolveSelectedHodOnDepartmentChange,
} from "../src/features/college-admin/views/hodAppointmentHelpers.ts";

const sampleFaculty = [
  {
    id: "fac-1",
    fullName: "Dr. Asha Verma",
    email: "asha@college.edu",
    role: "Faculty",
    designation: "Professor",
    departmentId: "dept-cse",
    isActive: true,
    isActivated: true,
    createdAtUtc: "2026-01-01T00:00:00Z",
  },
  {
    id: "fac-2",
    fullName: "Prof. Vikram Rao",
    email: "vikram@college.edu",
    role: "Faculty",
    designation: "AssociateProfessor",
    departmentId: "dept-cse",
    isActive: false,
    isActivated: true,
    createdAtUtc: "2026-01-01T00:00:00Z",
  },
  {
    id: "fac-3",
    fullName: "Dr. Neha Kulkarni",
    email: "neha@college.edu",
    role: "Faculty",
    designation: "AssistantProfessor",
    departmentId: "dept-ece",
    isActive: true,
    isActivated: true,
    createdAtUtc: "2026-01-01T00:00:00Z",
  },
];

test("getEligibleHodCandidates filters by department, active status, Faculty role, and excludes current HOD", () => {
  const cseCandidates = getEligibleHodCandidates(sampleFaculty, "dept-cse", null);
  assert.deepEqual(
    cseCandidates.map((c) => c.id),
    ["fac-1"]
  );

  const cseExcludingCurrent = getEligibleHodCandidates(sampleFaculty, "dept-cse", "fac-1");
  assert.deepEqual(cseExcludingCurrent, []);

  const emptyDeptCandidates = getEligibleHodCandidates(sampleFaculty, "dept-mech", null);
  assert.deepEqual(emptyDeptCandidates, []);
});

test("resolveSelectedHodOnDepartmentChange clears incompatible HOD selection when department changes", () => {
  const nextSelection = resolveSelectedHodOnDepartmentChange(sampleFaculty, "dept-ece", "fac-1", null);
  assert.equal(nextSelection, "");

  const keptSelection = resolveSelectedHodOnDepartmentChange(sampleFaculty, "dept-ece", "fac-3", null);
  assert.equal(keptSelection, "fac-3");
});

test("formatFacultyDesignation formats enum values cleanly", () => {
  assert.equal(formatFacultyDesignation("AssociateProfessor"), "Associate Professor");
  assert.equal(formatFacultyDesignation("Professor"), "Professor");
  assert.equal(formatFacultyDesignation(undefined), "Faculty");
});

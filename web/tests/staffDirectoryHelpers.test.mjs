import test from "node:test";
import assert from "node:assert/strict";
import {
  formatStaffDepartmentDisplay,
  formatStaffDesignationDisplay,
  formatStaffRoleLabel,
  isLastActiveCollegeAdmin,
} from "../src/features/college-admin/views/staffDirectoryHelpers.ts";

test("CollegeAdmin displays formatted role, neutral designation, and Institutional Scope", () => {
  const admin = {
    id: "admin-1",
    role: "CollegeAdmin",
    designation: undefined,
    departmentName: undefined,
    departmentCode: undefined,
    isActive: true,
  };

  assert.equal(formatStaffRoleLabel(admin.role), "College Admin");
  assert.deepEqual(formatStaffDesignationDisplay(admin), { text: "—", isNeutral: true });
  assert.deepEqual(formatStaffDepartmentDisplay(admin), {
    primary: "Institutional Scope",
    isInstitutionalScope: true,
    isNeutral: false,
  });
});

test("Faculty displays actual formatted designation and department", () => {
  const faculty = {
    id: "fac-1",
    role: "Faculty",
    designation: "AssociateProfessor",
    departmentName: "Computer Science & Engineering",
    departmentCode: "CSE",
    isActive: true,
  };

  assert.equal(formatStaffRoleLabel(faculty.role), "Faculty");
  assert.deepEqual(formatStaffDesignationDisplay(faculty), {
    text: "Associate Professor",
    isNeutral: false,
  });
  assert.deepEqual(formatStaffDepartmentDisplay(faculty), {
    primary: "Computer Science & Engineering",
    secondary: "CSE",
    isInstitutionalScope: false,
    isNeutral: false,
  });
});

test("isLastActiveCollegeAdmin protects the sole active CollegeAdmin", () => {
  const onlyAdmin = { id: "admin-1", role: "CollegeAdmin", isActive: true };
  const faculty = { id: "fac-1", role: "Faculty", isActive: true };
  const secondAdmin = { id: "admin-2", role: "CollegeAdmin", isActive: true };

  assert.equal(isLastActiveCollegeAdmin(onlyAdmin, [onlyAdmin, faculty]), true);
  assert.equal(isLastActiveCollegeAdmin(faculty, [onlyAdmin, faculty]), false);
  assert.equal(isLastActiveCollegeAdmin(onlyAdmin, [onlyAdmin, secondAdmin, faculty]), false);
});

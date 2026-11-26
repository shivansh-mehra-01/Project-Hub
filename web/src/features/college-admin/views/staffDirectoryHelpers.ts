import type { CollegeStaffDto, RoleType } from "../../../lib/api/types";

const DESIGNATION_LABELS: Record<string, string> = {
  Professor: "Professor",
  AssociateProfessor: "Associate Professor",
  AssistantProfessor: "Assistant Professor",
  AdjunctFaculty: "Adjunct Faculty",
};

export function formatStaffRoleLabel(role: RoleType | string): string {
  if (role === "CollegeAdmin") return "College Admin";
  return role;
}

export function formatStaffDesignationDisplay(
  user: Pick<CollegeStaffDto, "role" | "designation">
): { text: string; isNeutral: boolean } {
  if (user.role === "CollegeAdmin") {
    return { text: "—", isNeutral: true };
  }
  if (user.designation) {
    return {
      text: DESIGNATION_LABELS[user.designation] ?? user.designation,
      isNeutral: false,
    };
  }
  return { text: "—", isNeutral: true };
}

export function formatStaffDepartmentDisplay(
  user: Pick<CollegeStaffDto, "role" | "departmentName" | "departmentCode">
): {
  primary: string;
  secondary?: string;
  isInstitutionalScope: boolean;
  isNeutral: boolean;
} {
  if (user.role === "CollegeAdmin") {
    return {
      primary: "Institutional Scope",
      isInstitutionalScope: true,
      isNeutral: false,
    };
  }
  if (user.departmentName) {
    return {
      primary: user.departmentName,
      secondary: user.departmentCode ?? undefined,
      isInstitutionalScope: false,
      isNeutral: false,
    };
  }
  return {
    primary: "—",
    isInstitutionalScope: false,
    isNeutral: true,
  };
}

export function isLastActiveCollegeAdmin(
  user: Pick<CollegeStaffDto, "id" | "role" | "isActive">,
  allUsers: Pick<CollegeStaffDto, "id" | "role" | "isActive">[]
): boolean {
  if (user.role !== "CollegeAdmin" || !user.isActive) return false;
  const activeAdmins = allUsers.filter(
    (u) => u.role === "CollegeAdmin" && u.isActive
  );
  return activeAdmins.length <= 1;
}

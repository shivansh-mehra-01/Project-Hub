import type { CollegeStaffDto } from "../../../lib/api/types";

const DESIGNATION_LABELS: Record<string, string> = {
  Professor: "Professor",
  AssociateProfessor: "Associate Professor",
  AssistantProfessor: "Assistant Professor",
  AdjunctFaculty: "Adjunct Faculty",
};

export function formatFacultyDesignation(designation?: string | null): string {
  if (!designation) return "Faculty";
  return DESIGNATION_LABELS[designation] ?? designation;
}

export function getEligibleHodCandidates(
  facultyList: CollegeStaffDto[],
  departmentId: string,
  currentHodUserId?: string | null
): CollegeStaffDto[] {
  if (!departmentId) return [];
  return facultyList.filter(
    (f) =>
      f.isActive &&
      f.role === "Faculty" &&
      f.departmentId === departmentId &&
      (!currentHodUserId || f.id !== currentHodUserId)
  );
}

export function resolveSelectedHodOnDepartmentChange(
  facultyList: CollegeStaffDto[],
  nextDepartmentId: string,
  previousFacultyId: string,
  currentHodUserId?: string | null
): string {
  if (!previousFacultyId) return "";
  const eligible = getEligibleHodCandidates(facultyList, nextDepartmentId, currentHodUserId);
  return eligible.some((f) => f.id === previousFacultyId) ? previousFacultyId : "";
}

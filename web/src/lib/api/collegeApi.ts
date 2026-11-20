import { apiClient } from "./apiClient";
import {
  AcademicHierarchyTreeDto,
  AcademicSessionDto,
  AppointHodRequest,
  CollegeOverviewDto,
  CollegeSettingsDto,
  CollegeTrackDto,
  ConfigureAcademicSessionRequest,
  CourseProgramDto,
  CreateAcademicSessionRequest,
  CreateCollegeTrackRequest,
  CreateCourseProgramRequest,
  CreateDepartmentRequest,
  CreateSemesterTermRequest,
  CreateSubjectOfferingRequest,
  DepartmentDto,
  ImportCatalogResultDto,
  ImportUniversityCatalogRequest,
  MasterCatalogOverviewDto,
  SemesterTermDto,
  SignOffComplianceRequest,
  SubjectOfferingDto,
  UpdateCollegeSettingsRequest,
} from "./types";

export const collegeApi = {
  getOverview: () => apiClient.get<CollegeOverviewDto>("/api/college/overview"),

  getDepartments: () => apiClient.get<DepartmentDto[]>("/api/college/departments"),

  createDepartment: (data: CreateDepartmentRequest) =>
    apiClient.post<DepartmentDto>("/api/college/departments", data),

  appointHod: (departmentId: string, data: AppointHodRequest) =>
    apiClient.put<{ success: boolean; departmentId: string; hodId: string; hodName: string }>(
      `/api/college/departments/${departmentId}/appoint-hod`,
      data
    ),

  getTracks: () => apiClient.get<CollegeTrackDto[]>("/api/college/tracks"),

  createTrack: (data: CreateCollegeTrackRequest) =>
    apiClient.post<CollegeTrackDto>("/api/college/tracks", data),

  getSettings: () => apiClient.get<CollegeSettingsDto>("/api/college/settings"),

  updateSettings: (data: UpdateCollegeSettingsRequest) =>
    apiClient.put<CollegeSettingsDto>("/api/college/settings", data),

  signOffCompliance: (data: SignOffComplianceRequest) =>
    apiClient.post<{ success: boolean; attestedAtUtc: string; message: string }>(
      "/api/college/compliance/sign-off",
      data
    ),

  // Master Catalog & 1-Click Import
  getMasterCatalog: () => apiClient.get<MasterCatalogOverviewDto[]>("/api/college/master-catalog"),

  importUniversityCatalog: (data: ImportUniversityCatalogRequest) =>
    apiClient.post<ImportCatalogResultDto>("/api/college/import-university-catalog", data),

  // Academic Hierarchy & Structure
  getAcademicHierarchy: () => apiClient.get<AcademicHierarchyTreeDto>("/api/college/academic-hierarchy"),

  getCoursePrograms: () => apiClient.get<CourseProgramDto[]>("/api/college/course-programs"),

  createCourseProgram: (data: CreateCourseProgramRequest) =>
    apiClient.post<CourseProgramDto>("/api/college/course-programs", data),

  getAcademicSessions: () => apiClient.get<AcademicSessionDto[]>("/api/college/academic-sessions"),

  getActiveSession: () => apiClient.get<AcademicSessionDto>("/api/college/sessions/active"),

  configureSession: (data: ConfigureAcademicSessionRequest) =>
    apiClient.post<AcademicSessionDto>("/api/college/sessions", data),

  createAcademicSession: (data: CreateAcademicSessionRequest) =>
    apiClient.post<AcademicSessionDto>("/api/college/academic-sessions", data),

  getSemesterTerms: (departmentId?: string) =>
    apiClient.get<SemesterTermDto[]>(
      `/api/college/semester-terms${departmentId ? `?departmentId=${encodeURIComponent(departmentId)}` : ""}`
    ),

  createSemesterTerm: (data: CreateSemesterTermRequest) =>
    apiClient.post<SemesterTermDto>("/api/college/semester-terms", data),

  getSubjectOfferings: (semesterTermId?: string) =>
    apiClient.get<SubjectOfferingDto[]>(
      `/api/college/subject-offerings${semesterTermId ? `?semesterTermId=${encodeURIComponent(semesterTermId)}` : ""}`
    ),

  createSubjectOffering: (data: CreateSubjectOfferingRequest) =>
    apiClient.post<SubjectOfferingDto>("/api/college/subject-offerings", data),
};

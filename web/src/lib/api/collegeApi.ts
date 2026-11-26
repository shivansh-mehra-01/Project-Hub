import { apiClient } from "./apiClient";
import {
  AcademicHierarchyTreeDto,
  AcademicSessionDto,
  AppointHodRequest,
  BulkStaffUploadRequest,
  BulkStaffUploadResultDto,
  BulkStudentUploadRequest,
  BulkStudentUploadResultDto,
  RosterImportHistoryDto,
  RosterImportPreviewDto,
  CertifyExaminationRegisterRequest,
  CollegeAnnouncementDto,
  CollegeOverviewDto,
  CollegeSettingsDto,
  CollegeStaffDto,
  CollegeTrackDto,
  ConfigureAcademicSessionRequest,
  CourseProgramDto,
  CreateAcademicSessionRequest,
  CreateCollegeStaffRequest,
  UpdateCollegeStaffRequest,
  CreateCollegeTrackRequest,
  CreateCourseProgramRequest,
  CreateDepartmentRequest,
  CreateSemesterTermRequest,
  CreateSubjectOfferingRequest,
  DepartmentDto,
  ExaminationTabulationRegisterDto,
  HodAssignmentHistoryDto,
  HodManagementDto,
  ImportCatalogResultDto,
  ImportUniversityCatalogRequest,
  MasterCatalogOverviewDto,
  SemesterTermDto,
  SubjectOfferingDto,
  UpdateCollegeSettingsRequest,
  UpdateCourseProgramRequest,
  UpdateDepartmentRequest,
  UpdateUserStatusRequest,
} from "./types";

export const collegeApi = {
  // A. Executive Overview & Platform Announcements
  getOverview: () => apiClient.get<CollegeOverviewDto>("/api/college/overview"),

  getAnnouncements: () =>
    apiClient.get<CollegeAnnouncementDto[]>("/api/college/announcements", { suppressToast: true }),

  // B. Course Program Management
  getCoursePrograms: () => apiClient.get<CourseProgramDto[]>("/api/college/course-programs"),

  createCourseProgram: (data: CreateCourseProgramRequest) =>
    apiClient.post<CourseProgramDto>("/api/college/course-programs", data),

  updateCourseProgram: (id: string, data: UpdateCourseProgramRequest) =>
    apiClient.put<CourseProgramDto>(`/api/college/course-programs/${id}`, data),

  deleteCourseProgram: (id: string, options?: { suppressToast?: boolean }) =>
    apiClient.delete<{ success: boolean; message: string }>(`/api/college/course-programs/${id}`, options),

  // C. Branch / Department Management
  getDepartments: (options?: { suppressToast?: boolean }) => apiClient.get<DepartmentDto[]>("/api/college/departments", options),

  createDepartment: (data: CreateDepartmentRequest) =>
    apiClient.post<DepartmentDto>("/api/college/departments", data),

  updateDepartment: (id: string, data: UpdateDepartmentRequest) =>
    apiClient.put<DepartmentDto>(`/api/college/departments/${id}`, data),

  deleteDepartment: (id: string, options?: { suppressToast?: boolean }) =>
    apiClient.delete<{ success: boolean; message: string }>(`/api/college/departments/${id}`, options),

  // D. HOD Leadership Management
  getHods: () => apiClient.get<HodManagementDto[]>("/api/college/hods"),

  appointHod: (departmentId: string, data: AppointHodRequest) =>
    apiClient.put<{ success: boolean; departmentId: string; hodId: string; hodName: string }>(
      `/api/college/departments/${departmentId}/appoint-hod`,
      data
    ),

  relieveHod: (departmentId: string) =>
    apiClient.post<{ success: boolean; departmentId: string; relievedUserId?: string; relievedUserName?: string }>(
      `/api/college/departments/${departmentId}/relieve-hod`
    ),

  getHodHistory: () => apiClient.get<HodAssignmentHistoryDto[]>("/api/college/hods/history"),

  updateHodStatus: (userId: string, data: UpdateUserStatusRequest) =>
    apiClient.put<{ success: boolean; message: string }>(`/api/college/hods/${userId}/status`, data),

  // E. College-level User Management
  getStaffUsers: (params?: { role?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.role) query.set("role", params.role);
    if (params?.search) query.set("search", params.search);
    const qs = query.toString();
    return apiClient.get<CollegeStaffDto[]>(`/api/college/users${qs ? `?${qs}` : ""}`);
  },

  createStaffUser: (data: CreateCollegeStaffRequest) =>
    apiClient.post<CollegeStaffDto>("/api/college/users", data),

  updateStaffUser: (id: string, data: UpdateCollegeStaffRequest) =>
    apiClient.put<CollegeStaffDto>(`/api/college/users/${id}`, data),

  deleteStaffUser: (id: string, options?: { suppressToast?: boolean }) =>
    apiClient.delete<{ success: boolean; message: string }>(`/api/college/users/${id}`, options),

  updateUserStatus: (id: string, data: UpdateUserStatusRequest) =>
    apiClient.put<{ success: boolean; message: string }>(`/api/college/users/${id}/status`, data),

  resetStaffPassword: (id: string) =>
    apiClient.post<{ success: boolean; message: string; emailDispatched?: boolean; expiresAtUtc?: string }>(`/api/college/users/${id}/reset-password`),

  previewBulkStaff: (data: BulkStaffUploadRequest) =>
    apiClient.post<RosterImportPreviewDto>("/api/college/users/bulk/preview", data),

  bulkUploadStaff: (data: BulkStaffUploadRequest) =>
    apiClient.post<BulkStaffUploadResultDto>("/api/college/users/bulk", data),

  previewBulkStudents: (data: BulkStudentUploadRequest) =>
    apiClient.post<RosterImportPreviewDto>("/api/college/students/bulk/preview", data),

  bulkUploadStudents: (data: BulkStudentUploadRequest) =>
    apiClient.post<BulkStudentUploadResultDto>("/api/college/students/bulk", data),

  getRosterImportHistory: () =>
    apiClient.get<RosterImportHistoryDto[]>("/api/college/roster-imports/history"),

  // F. Examination Tabulation Register
  getExaminationResults: (params?: { trackId?: string; departmentId?: string }) => {
    const query = new URLSearchParams();
    if (params?.trackId) query.set("trackId", params.trackId);
    if (params?.departmentId) query.set("departmentId", params.departmentId);
    const qs = query.toString();
    return apiClient.get<ExaminationTabulationRegisterDto>(`/api/college/results${qs ? `?${qs}` : ""}`);
  },

  certifyExaminationResults: (data: CertifyExaminationRegisterRequest) =>
    apiClient.post<{ success: boolean; message: string; certifiedBy: string; certifiedAtUtc: string; checksum: string }>(
      "/api/college/results/certify",
      data
    ),

  // G. Subscription & Platform Settings
  getSettings: () => apiClient.get<CollegeSettingsDto>("/api/college/settings"),

  updateSettings: (data: UpdateCollegeSettingsRequest) =>
    apiClient.put<CollegeSettingsDto>("/api/college/settings", data),

  uploadLogo: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.postFormData<CollegeSettingsDto>("/api/college/settings/logo", formData);
  },

  deleteLogo: () => apiClient.delete<CollegeSettingsDto>("/api/college/settings/logo"),

  // Master Catalog & Academic Hierarchy
  getMasterCatalog: () => apiClient.get<MasterCatalogOverviewDto[]>("/api/college/master-catalog"),

  importUniversityCatalog: (data: ImportUniversityCatalogRequest) =>
    apiClient.post<ImportCatalogResultDto>("/api/college/import-university-catalog", data),

  getAcademicHierarchy: () => apiClient.get<AcademicHierarchyTreeDto>("/api/college/academic-hierarchy"),

  // Academic Sessions & Terms
  getAcademicSessions: () => apiClient.get<AcademicSessionDto[]>("/api/college/academic-sessions"),

  getActiveSession: () =>
    apiClient.get<AcademicSessionDto>("/api/college/sessions/active", { suppressToast: true }),

  configureSession: (data: ConfigureAcademicSessionRequest) =>
    apiClient.post<AcademicSessionDto>("/api/college/sessions", data),

  createAcademicSession: (data: CreateAcademicSessionRequest) =>
    apiClient.post<AcademicSessionDto>("/api/college/academic-sessions", data),

  getTracks: () => apiClient.get<CollegeTrackDto[]>("/api/college/tracks"),

  createTrack: (data: CreateCollegeTrackRequest) =>
    apiClient.post<CollegeTrackDto>("/api/college/tracks", data),

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

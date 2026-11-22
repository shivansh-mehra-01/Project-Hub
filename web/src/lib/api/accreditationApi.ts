import { apiClient } from "./apiClient";
import {
  AccreditationOverviewDto,
  AccreditationFrameworkDto,
  FrameworkVersionDto,
  AccreditationCycleDto,
  CreateCycleRequest,
  CriterionDto,
  MetricDto,
  ProgramMappingDto,
  EvidenceDocumentDto,
  UploadEvidenceRequest,
  ReviewRecordDto,
  SubmitReviewRequest,
  AccreditationReportDto,
  AccreditationActivityDto,
} from "./accreditationTypes";

export const accreditationApi = {
  // A. Overview
  getOverview: () =>
    apiClient.get<AccreditationOverviewDto>("/api/college/accreditation/overview"),

  // B. Frameworks & Versions
  getFrameworks: () =>
    apiClient.get<AccreditationFrameworkDto[]>("/api/college/accreditation/frameworks"),

  getFrameworkVersions: (frameworkId: string) =>
    apiClient.get<FrameworkVersionDto[]>(`/api/college/accreditation/frameworks/${frameworkId}/versions`),

  // C. Cycles
  getCycles: (params?: { frameworkId?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.frameworkId) query.set("frameworkId", params.frameworkId);
    if (params?.status) query.set("status", params.status);
    const qs = query.toString();
    return apiClient.get<AccreditationCycleDto[]>(`/api/college/accreditation/cycles${qs ? `?${qs}` : ""}`);
  },

  getCycle: (cycleId: string) =>
    apiClient.get<AccreditationCycleDto>(`/api/college/accreditation/cycles/${cycleId}`),

  createCycle: (data: CreateCycleRequest) =>
    apiClient.post<AccreditationCycleDto>("/api/college/accreditation/cycles", data),

  updateCycleStatus: (cycleId: string, status: string) =>
    apiClient.put<{ success: boolean }>(`/api/college/accreditation/cycles/${cycleId}/status`, { status }),

  // D. Program Mapping
  getProgramMappings: (cycleId: string) =>
    apiClient.get<ProgramMappingDto[]>(`/api/college/accreditation/cycles/${cycleId}/programs`),

  mapProgram: (cycleId: string, programId: string) =>
    apiClient.post<ProgramMappingDto>(`/api/college/accreditation/cycles/${cycleId}/programs`, { programId }),

  // E. Criteria & Metrics
  getCriteria: (versionId: string) =>
    apiClient.get<CriterionDto[]>(`/api/college/accreditation/versions/${versionId}/criteria`),

  getMetrics: (criterionId: string) =>
    apiClient.get<MetricDto[]>(`/api/college/accreditation/criteria/${criterionId}/metrics`),

  updateMetricScore: (metricId: string, score: number) =>
    apiClient.put<{ success: boolean }>(`/api/college/accreditation/metrics/${metricId}/score`, { score }),

  // F. Evidence & Documents
  getEvidence: (cycleId: string, params?: { metricId?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.metricId) query.set("metricId", params.metricId);
    if (params?.status) query.set("status", params.status);
    const qs = query.toString();
    return apiClient.get<EvidenceDocumentDto[]>(`/api/college/accreditation/cycles/${cycleId}/evidence${qs ? `?${qs}` : ""}`);
  },

  uploadEvidence: (data: UploadEvidenceRequest) =>
    apiClient.post<EvidenceDocumentDto>("/api/college/accreditation/evidence", data),

  updateEvidenceStatus: (evidenceId: string, status: string, reviewNote?: string) =>
    apiClient.put<{ success: boolean }>(`/api/college/accreditation/evidence/${evidenceId}/status`, { status, reviewNote }),

  // G. Reviews & Approvals
  getReviews: (cycleId: string, params?: { status?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    const qs = query.toString();
    return apiClient.get<ReviewRecordDto[]>(`/api/college/accreditation/cycles/${cycleId}/reviews${qs ? `?${qs}` : ""}`);
  },

  submitReview: (reviewId: string, data: SubmitReviewRequest) =>
    apiClient.put<{ success: boolean }>(`/api/college/accreditation/reviews/${reviewId}`, data),

  // H. Reports
  getReport: (cycleId: string) =>
    apiClient.get<AccreditationReportDto>(`/api/college/accreditation/cycles/${cycleId}/report`),

  exportReport: (cycleId: string, format: "pdf" | "excel" | "json") =>
    apiClient.get<Blob>(`/api/college/accreditation/cycles/${cycleId}/export?format=${format}`),

  // I. Activity Log
  getActivityLog: (cycleId?: string, params?: { page?: number; pageSize?: number }) => {
    const query = new URLSearchParams();
    if (cycleId) query.set("cycleId", cycleId);
    if (params?.page) query.set("page", String(params.page));
    if (params?.pageSize) query.set("pageSize", String(params.pageSize));
    const qs = query.toString();
    return apiClient.get<AccreditationActivityDto[]>(`/api/college/accreditation/activity-log${qs ? `?${qs}` : ""}`);
  },
};

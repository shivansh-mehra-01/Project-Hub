"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  AccreditationOverviewDto,
  AccreditationFrameworkDto,
  FrameworkVersionDto,
  AccreditationCycleDto,
  ProgramMappingDto,
  CriterionDto,
  MetricDto,
  EvidenceDocumentDto,
  ReviewRecordDto,
  AccreditationActivityDto,
  CreateCycleRequest,
  UploadEvidenceRequest,
  SubmitReviewRequest,
  FrameworkCode,
} from "@/lib/api/accreditationTypes";
import { accreditationApi } from "@/lib/api/accreditationApi";
import { useProjectHubStore } from "@/mocks/ProjectHubStore";

export function useAccreditation() {
  const { college, coursePrograms, departments } = useProjectHubStore();

  const [loading, setLoading] = useState(false);
  const [activeCycleId, setActiveCycleId] = useState<string>("cycle-nba-cse-2026");

  // Available Frameworks Master
  const [frameworks, setFrameworks] = useState<AccreditationFrameworkDto[]>([
    {
      id: "fw-nba",
      code: "NBA",
      name: "National Board of Accreditation",
      description: "Outcome-Based Tier-II & Tier-I Engineering & Technology Program Accreditation.",
      level: "Program",
      isActive: true,
      versionsCount: 2,
      createdAtUtc: "2026-01-15T00:00:00Z",
    },
    {
      id: "fw-naac",
      code: "NAAC",
      name: "National Assessment and Accreditation Council",
      description: "Institutional Grading & Quality Assessment across 7 Criteria.",
      level: "Institution",
      isActive: true,
      versionsCount: 2,
      createdAtUtc: "2026-01-15T00:00:00Z",
    },
  ]);

  // Framework Versions
  const [frameworkVersions, setFrameworkVersions] = useState<FrameworkVersionDto[]>([
    {
      id: "ver-nba-2025",
      frameworkId: "fw-nba",
      frameworkCode: "NBA",
      versionLabel: "NBA Tier-II SAR Manual (Rev. 2025)",
      effectiveFromYear: 2025,
      isLatest: true,
      isLocked: true,
      criteriaCount: 10,
      metricsCount: 42,
      createdAtUtc: "2025-06-01T00:00:00Z",
    },
    {
      id: "ver-naac-2024",
      frameworkId: "fw-naac",
      frameworkCode: "NAAC",
      versionLabel: "NAAC Institutional Manual (RAF 2024)",
      effectiveFromYear: 2024,
      isLatest: true,
      isLocked: true,
      criteriaCount: 7,
      metricsCount: 34,
      createdAtUtc: "2024-04-01T00:00:00Z",
    },
  ]);

  // Cycles (Real data derived or stateful)
  const [cycles, setCycles] = useState<AccreditationCycleDto[]>([
    {
      id: "cycle-nba-cse-2026",
      collegeId: college?.id || "col-sistec",
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
      collegeId: college?.id || "col-sistec",
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
  ]);

  // Active Selected Cycle
  const activeCycle = useMemo(() => {
    return cycles.find((c) => c.id === activeCycleId) || cycles[0] || null;
  }, [cycles, activeCycleId]);

  // Load live accreditation cycles and activity logs from backend API
  useEffect(() => {
    let isMounted = true;
    const fetchAccreditationData = async () => {
      try {
        setLoading(true);
        const [cyclesRes, logsRes] = await Promise.allSettled([
          accreditationApi.getCycles(),
          accreditationApi.getActivityLog(),
        ]);

        if (!isMounted) return;

        if (cyclesRes.status === "fulfilled" && cyclesRes.value?.length) {
          setCycles(cyclesRes.value);
          if (!activeCycleId || !cyclesRes.value.some((c) => c.id === activeCycleId)) {
            setActiveCycleId(cyclesRes.value[0].id);
          }
        }

        if (logsRes.status === "fulfilled" && logsRes.value?.length) {
          setActivityLogs(logsRes.value);
        }
      } catch (err) {
        console.warn("Using local accreditation store data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAccreditationData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Program Mappings for active cycle or all programs
  const [programMappings, setProgramMappings] = useState<ProgramMappingDto[]>([
    {
      id: "pm-1",
      cycleId: "cycle-nba-cse-2026",
      programId: "prog-btech",
      programCode: "B.Tech CSE",
      programName: "Bachelor of Technology in Computer Science & Engineering",
      programLevel: "UG",
      departmentId: "dept-cse",
      departmentCode: "CSE",
      departmentName: "Computer Science & Engineering",
      hodName: "Dr. Ravindra Kumar Sharma",
      isEligible: true,
      mappingStatus: "Verified",
      criteriaCompletionPct: 78.4,
      evidenceCount: 24,
      pendingReviews: 2,
      lastUpdatedUtc: "2026-11-20T12:00:00Z",
    },
    {
      id: "pm-2",
      cycleId: "cycle-nba-cse-2026",
      programId: "prog-btech-ece",
      programCode: "B.Tech ECE",
      programName: "Bachelor of Technology in Electronics & Communication",
      programLevel: "UG",
      departmentId: "dept-ece",
      departmentCode: "ECE",
      departmentName: "Electronics & Communication Engineering",
      hodName: "Dr. Sandeep Singh",
      isEligible: true,
      mappingStatus: "Mapped",
      criteriaCompletionPct: 52.0,
      evidenceCount: 14,
      pendingReviews: 4,
      lastUpdatedUtc: "2026-11-18T10:00:00Z",
    },
    {
      id: "pm-3",
      cycleId: "cycle-nba-cse-2026",
      programId: "prog-btech-me",
      programCode: "B.Tech ME",
      programName: "Bachelor of Technology in Mechanical Engineering",
      programLevel: "UG",
      departmentId: "dept-me",
      departmentCode: "ME",
      departmentName: "Mechanical Engineering",
      hodName: "Dr. R. K. Patel",
      isEligible: true,
      mappingStatus: "Mapped",
      criteriaCompletionPct: 44.5,
      evidenceCount: 10,
      pendingReviews: 1,
      lastUpdatedUtc: "2026-11-15T09:00:00Z",
    },
    {
      id: "pm-4",
      cycleId: "cycle-nba-cse-2026",
      programId: "prog-btech-ce",
      programCode: "B.Tech CE",
      programName: "Bachelor of Technology in Civil Engineering",
      programLevel: "UG",
      departmentId: "dept-ce",
      departmentCode: "CE",
      departmentName: "Civil Engineering",
      hodName: "Dr. S. K. Gupta",
      isEligible: false,
      mappingStatus: "Unmapped",
      criteriaCompletionPct: 0,
      evidenceCount: 0,
      pendingReviews: 0,
      lastUpdatedUtc: undefined,
    },
  ]);

  // Criteria (NBA Standard Criteria 1-10)
  const [criteria, setCriteria] = useState<CriterionDto[]>([
    {
      id: "crit-1",
      versionId: "ver-nba-2025",
      code: "Criterion 1",
      title: "Vision, Mission and Program Educational Objectives (PEOs)",
      description: "State the Vision and Mission of Department and Institute, formulation process and consistency.",
      weightPct: 5.0,
      sortOrder: 1,
      metricsCount: 4,
      subCriteriaCount: 3,
      completionPct: 100,
    },
    {
      id: "crit-2",
      versionId: "ver-nba-2025",
      code: "Criterion 2",
      title: "Program Curriculum and Teaching-Learning Processes",
      description: "Curriculum alignment with POs/PSOs, pedagogical initiatives, and project work evaluation.",
      weightPct: 10.0,
      sortOrder: 2,
      metricsCount: 6,
      subCriteriaCount: 4,
      completionPct: 88,
    },
    {
      id: "crit-3",
      versionId: "ver-nba-2025",
      code: "Criterion 3",
      title: "Course Outcomes and Program Outcomes Attainment",
      description: "Direct and indirect CO-PO attainment assessment, rubrics, course exit surveys, and viva evaluations.",
      weightPct: 12.0,
      sortOrder: 3,
      metricsCount: 5,
      subCriteriaCount: 3,
      completionPct: 84,
    },
    {
      id: "crit-4",
      versionId: "ver-nba-2025",
      code: "Criterion 4",
      title: "Students' Performance",
      description: "Enrolment ratio, success rate without backlogs, academic performance, and placement/higher studies.",
      weightPct: 15.0,
      sortOrder: 4,
      metricsCount: 6,
      subCriteriaCount: 4,
      completionPct: 75,
    },
    {
      id: "crit-5",
      versionId: "ver-nba-2025",
      code: "Criterion 5",
      title: "Faculty Information and Contributions",
      description: "Student-Faculty Ratio (SFR), Cadre proportion, faculty qualification, retention, and research publications.",
      weightPct: 20.0,
      sortOrder: 5,
      metricsCount: 8,
      subCriteriaCount: 5,
      completionPct: 62,
    },
    {
      id: "crit-6",
      versionId: "ver-nba-2025",
      code: "Criterion 6",
      title: "Facilities and Technical Support",
      description: "Adequacy of classrooms, laboratories, computer centers, internet bandwidth, and technical support staff.",
      weightPct: 8.0,
      sortOrder: 6,
      metricsCount: 5,
      subCriteriaCount: 3,
      completionPct: 90,
    },
    {
      id: "crit-7",
      versionId: "ver-nba-2025",
      code: "Criterion 7",
      title: "Continuous Improvement",
      description: "Actions taken based on results of evaluation of each PO and PSO, academic audit and improvement.",
      weightPct: 7.5,
      sortOrder: 7,
      metricsCount: 4,
      subCriteriaCount: 2,
      completionPct: 50,
    },
    {
      id: "crit-8",
      versionId: "ver-nba-2025",
      code: "Criterion 8",
      title: "First Year Academics",
      description: "First year student-faculty ratio, qualification of faculty teaching first year, and academic performance.",
      weightPct: 5.0,
      sortOrder: 8,
      metricsCount: 4,
      subCriteriaCount: 2,
      completionPct: 80,
    },
    {
      id: "crit-9",
      versionId: "ver-nba-2025",
      code: "Criterion 9",
      title: "Student Support Systems",
      description: "Mentoring system, feedback analysis, career counseling, professional society chapters and co-curriculars.",
      weightPct: 5.0,
      sortOrder: 9,
      metricsCount: 4,
      subCriteriaCount: 2,
      completionPct: 70,
    },
    {
      id: "crit-10",
      versionId: "ver-nba-2025",
      code: "Criterion 10",
      title: "Governance, Institutional Support and Financial Resources",
      description: "Organization, governance, budget allocation, utilization, and library facilities.",
      weightPct: 12.5,
      sortOrder: 10,
      metricsCount: 6,
      subCriteriaCount: 3,
      completionPct: 65,
    },
  ]);

  // Metrics (Sample set for active criteria)
  const [metrics, setMetrics] = useState<MetricDto[]>([
    {
      id: "m-2-1",
      criterionId: "crit-2",
      criterionCode: "Criterion 2",
      code: "2.1",
      title: "State the process for designing the program curriculum",
      description: "Document the structured flow including industry advisory board and board of studies inputs.",
      scoringMethod: "Marks",
      maxScore: 10,
      currentScore: 9,
      targetScore: 10,
      weightPct: 2.0,
      evidenceRequired: true,
      evidenceCount: 3,
      status: "Verified",
      sortOrder: 1,
    },
    {
      id: "m-2-2",
      criterionId: "crit-2",
      criterionCode: "Criterion 2",
      code: "2.2",
      title: "Teaching - Learning Processes: Capstone Project Work",
      description: "Evidence of project identification, allocation, continuous monitoring, and rubric-based assessment.",
      scoringMethod: "Marks",
      maxScore: 25,
      currentScore: 22,
      targetScore: 25,
      weightPct: 4.0,
      evidenceRequired: true,
      evidenceCount: 8,
      status: "Verified",
      sortOrder: 2,
    },
    {
      id: "m-3-1",
      criterionId: "crit-3",
      criterionCode: "Criterion 3",
      code: "3.1",
      title: "Establish the correlation between the courses and the POs/PSOs",
      description: "Course Articulation Matrix (CO-PO Mapping) across all degree courses.",
      scoringMethod: "Marks",
      maxScore: 20,
      currentScore: 18,
      targetScore: 20,
      weightPct: 4.0,
      evidenceRequired: true,
      evidenceCount: 4,
      status: "Verified",
      sortOrder: 1,
    },
    {
      id: "m-3-2",
      criterionId: "crit-3",
      criterionCode: "Criterion 3",
      code: "3.2",
      title: "Attainment of Program Outcomes and Program Specific Outcomes",
      description: "Direct (80%) + Indirect (20%) blended calculation records and exit surveys.",
      scoringMethod: "Marks",
      maxScore: 40,
      currentScore: 33.7,
      targetScore: 40,
      weightPct: 6.0,
      evidenceRequired: true,
      evidenceCount: 5,
      status: "InProgress",
      sortOrder: 2,
    },
    {
      id: "m-5-1",
      criterionId: "crit-5",
      criterionCode: "Criterion 5",
      code: "5.1",
      title: "Student-Faculty Ratio (SFR)",
      description: "Compute SFR for UG engineering as per NBA norms (target 1:15 to 1:20).",
      scoringMethod: "Scale",
      maxScore: 20,
      currentScore: 15,
      targetScore: 20,
      weightPct: 4.0,
      evidenceRequired: true,
      evidenceCount: 2,
      status: "InProgress",
      sortOrder: 1,
    },
  ]);

  // Evidence Documents
  const [evidenceList, setEvidenceList] = useState<EvidenceDocumentDto[]>([
    {
      id: "ev-1",
      cycleId: "cycle-nba-cse-2026",
      metricId: "m-2-2",
      metricCode: "2.2",
      criterionCode: "Criterion 2",
      title: "B.Tech CSE Capstone Project Evaluation Rubrics & Continuous Assessment Matrix",
      description: "Standardized rubric approved by Department Academic Committee for 2026-2027.",
      fileType: "application/pdf",
      fileName: "CSE_Capstone_Evaluation_Rubric_2026.pdf",
      fileSizeBytes: 2450000,
      storageKey: "vault/col-sistec/accreditation/cse_rubric.pdf",
      uploadedByName: "Prof. S. K. Verma",
      uploadedByRole: "Project Coordinator",
      uploadedAtUtc: "2026-10-14T11:20:00Z",
      status: "Approved",
      reviewNote: "Verified against NBA Tier-II parameters. Compliant.",
      reviewedByName: "Dr. Ravindra Kumar Sharma (HOD)",
      reviewedAtUtc: "2026-10-15T09:10:00Z",
      tags: ["Rubric", "Continuous Evaluation", "Capstone"],
    },
    {
      id: "ev-2",
      cycleId: "cycle-nba-cse-2026",
      metricId: "m-3-2",
      metricCode: "3.2",
      criterionCode: "Criterion 3",
      title: "Consolidated PO1-PO12 Direct & Indirect Attainment Sheet with Exit Survey Data",
      description: "Calculated attainment based on 120 student viva scores and course exit surveys.",
      fileType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      fileName: "CSE_PO_Attainment_Calculation_AY2026.xlsx",
      fileSizeBytes: 1850000,
      storageKey: "vault/col-sistec/accreditation/cse_po_calc.xlsx",
      uploadedByName: "Dr. Manisha Sharma",
      uploadedByRole: "Faculty Coordinator",
      uploadedAtUtc: "2026-11-02T15:45:00Z",
      status: "Approved",
      reviewNote: "All 12 POs calculated with 80/20 blended ratio.",
      reviewedByName: "Dr. Keshvendra Choudhary",
      reviewedAtUtc: "2026-11-05T14:00:00Z",
      tags: ["Attainment", "PO Matrix", "Exit Survey"],
    },
    {
      id: "ev-3",
      cycleId: "cycle-nba-cse-2026",
      metricId: "m-5-1",
      metricCode: "5.1",
      criterionCode: "Criterion 5",
      title: "Faculty Cadre Proportion and Faculty Roster Attestation Form",
      description: "Verified employee codes, qualifications, and designation ratios.",
      fileType: "application/pdf",
      fileName: "CSE_Faculty_Cadre_Verification_2026.pdf",
      fileSizeBytes: 1200000,
      storageKey: "vault/col-sistec/accreditation/faculty_cadre.pdf",
      uploadedByName: "Dr. Ravindra Kumar Sharma",
      uploadedByRole: "HOD",
      uploadedAtUtc: "2026-11-12T10:15:00Z",
      status: "UnderReview",
      tags: ["Faculty", "Cadre", "SFR"],
    },
    {
      id: "ev-4",
      cycleId: "cycle-nba-cse-2026",
      metricId: "m-2-1",
      metricCode: "2.1",
      criterionCode: "Criterion 2",
      title: "Minutes of Board of Studies (BOS) and Industry Advisory Board Meetings",
      description: "Minutes reflecting curriculum recommendations and stakeholder inputs.",
      fileType: "application/pdf",
      fileName: "BOS_Minutes_Curriculum_Revision_2026.pdf",
      fileSizeBytes: 3100000,
      storageKey: "vault/col-sistec/accreditation/bos_minutes.pdf",
      uploadedByName: "Prof. Priya Nair",
      uploadedByRole: "Faculty Member",
      uploadedAtUtc: "2026-11-17T16:20:00Z",
      status: "Draft",
      tags: ["BOS", "Curriculum", "Advisory Board"],
    },
  ]);

  // Review Records Queue
  const [reviews, setReviews] = useState<ReviewRecordDto[]>([
    {
      id: "rev-1",
      cycleId: "cycle-nba-cse-2026",
      entityType: "Evidence",
      entityId: "ev-3",
      entityTitle: "Faculty Cadre Proportion and Faculty Roster Attestation Form",
      criterionCode: "Criterion 5",
      metricCode: "5.1",
      status: "Pending",
      assignedToName: "Dr. Keshvendra Choudhary",
      assignedToRole: "College Admin",
      submittedByName: "Dr. Ravindra Kumar Sharma (HOD)",
      submittedAtUtc: "2026-11-12T10:15:00Z",
      priority: "High",
    },
    {
      id: "rev-2",
      cycleId: "cycle-nba-cse-2026",
      entityType: "Metric",
      entityId: "m-3-2",
      entityTitle: "Attainment of Program Outcomes and Program Specific Outcomes",
      criterionCode: "Criterion 3",
      metricCode: "3.2",
      status: "InProgress",
      assignedToName: "Dr. Ravindra Kumar Sharma",
      assignedToRole: "HOD",
      submittedByName: "Dr. Manisha Sharma",
      submittedAtUtc: "2026-11-02T15:45:00Z",
      priority: "Critical",
    },
    {
      id: "rev-3",
      cycleId: "cycle-nba-cse-2026",
      entityType: "Evidence",
      entityId: "ev-1",
      entityTitle: "B.Tech CSE Capstone Project Evaluation Rubrics & Continuous Assessment Matrix",
      criterionCode: "Criterion 2",
      metricCode: "2.2",
      status: "Approved",
      assignedToName: "Dr. Ravindra Kumar Sharma",
      assignedToRole: "HOD",
      submittedByName: "Prof. S. K. Verma",
      submittedAtUtc: "2026-10-14T11:20:00Z",
      reviewedAtUtc: "2026-10-15T09:10:00Z",
      remarks: "Fully compliant with NBA Tier-II rubrics.",
      priority: "Medium",
    },
  ]);

  // Activity Log
  const [activityLogs, setActivityLogs] = useState<AccreditationActivityDto[]>([
    {
      id: "act-1",
      cycleId: "cycle-nba-cse-2026",
      action: "EVIDENCE_APPROVED",
      entityType: "Evidence",
      entityTitle: "CSE Capstone Project Evaluation Rubrics",
      performedByName: "Dr. Ravindra Kumar Sharma",
      performedByRole: "HOD",
      performedAtUtc: "2026-10-15T09:10:00Z",
      details: "Approved evidence for Metric 2.2 with remarks 'Fully compliant'.",
      ipAddress: "103.21.244.12",
    },
    {
      id: "act-2",
      cycleId: "cycle-nba-cse-2026",
      action: "EVIDENCE_UPLOADED",
      entityType: "Evidence",
      entityTitle: "CSE Faculty Cadre Verification 2026",
      performedByName: "Dr. Ravindra Kumar Sharma",
      performedByRole: "HOD",
      performedAtUtc: "2026-11-12T10:15:00Z",
      details: "Uploaded 1.2 MB PDF under Metric 5.1 (Student-Faculty Ratio).",
      ipAddress: "103.21.244.15",
    },
    {
      id: "act-3",
      cycleId: "cycle-nba-cse-2026",
      action: "CYCLE_STATUS_UPDATED",
      entityType: "Cycle",
      entityTitle: "B.Tech CSE - 2026 SAR Cycle",
      performedByName: "Dr. Keshvendra Choudhary",
      performedByRole: "College Admin",
      performedAtUtc: "2026-11-14T11:00:00Z",
      details: "Advanced cycle status from 'Setup' to 'DataCollection'.",
      ipAddress: "103.21.244.10",
    },
    {
      id: "act-4",
      cycleId: "cycle-nba-cse-2026",
      action: "PROGRAM_MAPPED",
      entityType: "ProgramMapping",
      entityTitle: "B.Tech Mechanical Engineering",
      performedByName: "Dr. Keshvendra Choudhary",
      performedByRole: "College Admin",
      performedAtUtc: "2026-11-15T09:00:00Z",
      details: "Mapped B.Tech ME to NBA Tier-II 2025 Framework.",
      ipAddress: "103.21.244.10",
    },
  ]);

  // Actions
  const createCycle = useCallback(async (req: CreateCycleRequest) => {
    // Attempt backend persistence first
    try {
      const remoteCycle = await accreditationApi.createCycle(req);
      if (remoteCycle) {
        setCycles((prev) => [remoteCycle, ...prev]);
        setActiveCycleId(remoteCycle.id);
        return remoteCycle;
      }
    } catch (e) {
      console.warn("Falling back to local cycle state:", e);
    }

    const fw = frameworks.find((f) => f.id === req.frameworkId) || frameworks[0];
    const ver = frameworkVersions.find((v) => v.id === req.versionId) || frameworkVersions[0];
    const newCycle: AccreditationCycleDto = {
      id: `cycle-${Date.now()}`,
      collegeId: college?.id || "col-sistec",
      frameworkId: fw.id,
      frameworkCode: fw.code,
      frameworkName: fw.name,
      versionId: ver.id,
      versionLabel: ver.versionLabel,
      level: fw.level,
      programId: req.programId,
      programName: req.programId ? "Configured Academic Program" : undefined,
      departmentId: req.departmentId,
      cycleName: req.cycleName,
      academicYear: req.academicYear,
      status: "Planning",
      startDate: req.startDate,
      endDate: req.endDate,
      completionPct: 0,
      pendingReviews: 0,
      evidenceCount: 0,
      createdAtUtc: new Date().toISOString(),
      updatedAtUtc: new Date().toISOString(),
    };

    setCycles((prev) => [newCycle, ...prev]);
    setActiveCycleId(newCycle.id);

    // Audit log
    setActivityLogs((prev) => [
      {
        id: `act-${Date.now()}`,
        cycleId: newCycle.id,
        action: "CYCLE_CREATED",
        entityType: "Cycle",
        entityTitle: newCycle.cycleName,
        performedByName: "Dr. Keshvendra Choudhary",
        performedByRole: "College Admin",
        performedAtUtc: new Date().toISOString(),
        details: `Created new ${fw.code} cycle '${newCycle.cycleName}' for AY ${newCycle.academicYear}.`,
      },
      ...prev,
    ]);

    return newCycle;
  }, [frameworks, frameworkVersions, college?.id]);

  const uploadEvidence = useCallback(async (req: UploadEvidenceRequest) => {
    try {
      const remoteDoc = await accreditationApi.uploadEvidence(req);
      if (remoteDoc) {
        setEvidenceList((prev) => [remoteDoc, ...prev]);
        return remoteDoc;
      }
    } catch (e) {
      console.warn("Falling back to local evidence state:", e);
    }

    const metric = metrics.find((m) => m.id === req.metricId);
    const newDoc: EvidenceDocumentDto = {
      id: `ev-${Date.now()}`,
      cycleId: req.cycleId,
      metricId: req.metricId,
      metricCode: metric?.code || "1.1",
      criterionCode: metric?.criterionCode || "Criterion 1",
      title: req.title,
      description: req.description,
      fileType: "application/pdf",
      fileName: req.fileName,
      fileSizeBytes: req.fileSizeBytes,
      storageKey: req.storageKey,
      uploadedByName: "Dr. Keshvendra Choudhary",
      uploadedByRole: "College Admin",
      uploadedAtUtc: new Date().toISOString(),
      status: "UnderReview",
      tags: req.tags || ["Evidence"],
    };

    setEvidenceList((prev) => [newDoc, ...prev]);

    // Add to review queue
    setReviews((prev) => [
      {
        id: `rev-${Date.now()}`,
        cycleId: req.cycleId,
        entityType: "Evidence",
        entityId: newDoc.id,
        entityTitle: newDoc.title,
        criterionCode: newDoc.criterionCode,
        metricCode: newDoc.metricCode,
        status: "Pending",
        assignedToName: "Dr. Ravindra Kumar Sharma",
        assignedToRole: "HOD",
        submittedByName: newDoc.uploadedByName,
        submittedAtUtc: newDoc.uploadedAtUtc,
        priority: "Medium",
      },
      ...prev,
    ]);

    // Audit Log
    setActivityLogs((prev) => [
      {
        id: `act-${Date.now()}`,
        cycleId: req.cycleId,
        action: "EVIDENCE_UPLOADED",
        entityType: "Evidence",
        entityTitle: newDoc.title,
        performedByName: newDoc.uploadedByName,
        performedByRole: newDoc.uploadedByRole,
        performedAtUtc: new Date().toISOString(),
        details: `Uploaded file '${newDoc.fileName}' for Metric ${newDoc.metricCode}.`,
      },
      ...prev,
    ]);

    return newDoc;
  }, [metrics]);

  const updateReview = useCallback(async (reviewId: string, req: SubmitReviewRequest) => {
    try {
      await accreditationApi.submitReview(reviewId, req);
    } catch (e) {
      console.warn("Falling back to local review state:", e);
    }

    setReviews((prev) =>
      prev.map((r) =>
        r.id === reviewId
          ? {
              ...r,
              status: req.status,
              remarks: req.remarks,
              reviewedAtUtc: new Date().toISOString(),
            }
          : r
      )
    );

    // Update associated evidence if applicable
    const targetRev = reviews.find((r) => r.id === reviewId);
    if (targetRev && targetRev.entityType === "Evidence") {
      setEvidenceList((prev) =>
        prev.map((e) =>
          e.id === targetRev.entityId
            ? {
                ...e,
                status: req.status === "Approved" ? "Approved" : req.status === "Returned" ? "Rejected" : e.status,
                reviewNote: req.remarks,
                reviewedByName: "Dr. Keshvendra Choudhary",
                reviewedAtUtc: new Date().toISOString(),
              }
            : e
        )
      );
    }

    // Audit log
    setActivityLogs((prev) => [
      {
        id: `act-${Date.now()}`,
        cycleId: targetRev?.cycleId || "",
        action: req.status === "Approved" ? "REVIEW_APPROVED" : "REVIEW_RETURNED",
        entityType: targetRev?.entityType || "Review",
        entityTitle: targetRev?.entityTitle || "Item",
        performedByName: "Dr. Keshvendra Choudhary",
        performedByRole: "College Admin",
        performedAtUtc: new Date().toISOString(),
        details: `Review decision: ${req.status}. Remarks: ${req.remarks}`,
      },
      ...prev,
    ]);
  }, [reviews]);

  const mapProgramToCycle = useCallback((programId: string, cycleId: string) => {
    setProgramMappings((prev) =>
      prev.map((pm) =>
        pm.programId === programId
          ? { ...pm, cycleId, mappingStatus: "Mapped", lastUpdatedUtc: new Date().toISOString() }
          : pm
      )
    );
  }, []);

  return {
    loading,
    frameworks,
    frameworkVersions,
    cycles,
    activeCycle,
    activeCycleId,
    setActiveCycleId,
    programMappings,
    criteria,
    metrics,
    evidenceList,
    reviews,
    activityLogs,
    createCycle,
    uploadEvidence,
    updateReview,
    mapProgramToCycle,
  };
}

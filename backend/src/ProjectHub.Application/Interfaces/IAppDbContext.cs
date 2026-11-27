using Microsoft.EntityFrameworkCore;
using ProjectHub.Domain.Entities;
using ProjectHub.Domain.Entities.Master;

namespace ProjectHub.Application.Interfaces;

/// <summary>
/// Application database abstraction for DbContext operations.
/// </summary>
public interface IAppDbContext
{
    // Platform Root & Master Catalog Entities
    DbSet<CollegeTenant> CollegeTenants { get; }
    DbSet<MasterSdgCatalog> MasterSdgCatalogs { get; }
    DbSet<PlatformAuditLog> PlatformAuditLogs { get; }
    DbSet<PlatformAnnouncement> PlatformAnnouncements { get; }
    DbSet<EmailOutboxMessage> EmailOutboxMessages { get; }
    DbSet<SupportTicket> SupportTickets { get; }
    DbSet<SupportTicketMessage> SupportTicketMessages { get; }
    DbSet<MasterUniversity> MasterUniversities { get; }
    DbSet<MasterCurriculumScheme> MasterCurriculumSchemes { get; }
    DbSet<MasterProgram> MasterPrograms { get; }
    DbSet<MasterBranch> MasterBranches { get; }
    DbSet<MasterSubjectTemplate> MasterSubjectTemplates { get; }

    // Campus Tenant Entities
    DbSet<Department> Departments { get; }
    DbSet<UserAccount> Users { get; }
    DbSet<UserSession> UserSessions { get; }
    DbSet<RefreshTokenRecord> RefreshTokenRecords { get; }
    DbSet<AcademicTrack> AcademicTracks { get; }
    DbSet<ProjectTeam> ProjectTeams { get; }
    DbSet<TeamMember> TeamMembers { get; }
    DbSet<TeamJoinRequest> TeamJoinRequests { get; }
    DbSet<SprintTask> SprintTasks { get; }
    DbSet<ProjectMilestone> ProjectMilestones { get; }
    DbSet<MilestoneReviewHistory> MilestoneReviewHistories { get; }
    DbSet<ProjectReportSubmission> ProjectReportSubmissions { get; }
    DbSet<SubmissionReviewHistory> SubmissionReviewHistories { get; }
    DbSet<TeamArtifact> TeamArtifacts { get; }
    DbSet<WeeklyLogbook> WeeklyLogbooks { get; }
    DbSet<VivaPanel> VivaPanels { get; }
    DbSet<VivaPanelEvaluator> VivaPanelEvaluators { get; }
    DbSet<VivaEvaluation> VivaEvaluations { get; }
    DbSet<IndividualStudentScore> IndividualStudentScores { get; }
    DbSet<TeamVivaDefenseSchedule> TeamVivaDefenseSchedules { get; }
    DbSet<EvaluationRubric> EvaluationRubrics { get; }
    DbSet<EvaluationRubricCriterion> EvaluationRubricCriteria { get; }
    DbSet<ExceptionAuditLog> ExceptionAuditLogs { get; }
    DbSet<ProjectClosureRecord> ProjectClosureRecords { get; }
    DbSet<StudentAcademicRecord> StudentAcademicRecords { get; }

    // Dynamic Multi-Level Academic Hierarchy Entities
    DbSet<AcademicSession> AcademicSessions { get; }
    DbSet<CourseProgram> CoursePrograms { get; }
    DbSet<CurriculumScheme> CurriculumSchemes { get; }
    DbSet<SemesterTerm> SemesterTerms { get; }
    DbSet<SubjectOffering> SubjectOfferings { get; }
    DbSet<StudentAcademicEnrollment> StudentAcademicEnrollments { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}

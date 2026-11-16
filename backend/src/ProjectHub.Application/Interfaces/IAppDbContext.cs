using Microsoft.EntityFrameworkCore;
using ProjectHub.Domain.Entities;

namespace ProjectHub.Application.Interfaces;

/// <summary>
/// Application database abstraction for DbContext operations.
/// </summary>
public interface IAppDbContext
{
    // Platform Entities
    DbSet<CollegeTenant> CollegeTenants { get; }
    DbSet<MasterNbaOutcome> MasterNbaOutcomes { get; }
    DbSet<MasterSdgCatalog> MasterSdgCatalogs { get; }
    DbSet<PlatformAuditLog> PlatformAuditLogs { get; }

    // Campus Tenant Entities
    DbSet<Department> Departments { get; }
    DbSet<UserAccount> Users { get; }
    DbSet<AcademicTrack> AcademicTracks { get; }
    DbSet<CourseOutcomeDefinition> CourseOutcomeDefinitions { get; }
    DbSet<ProblemBankStatement> ProblemBankStatements { get; }
    DbSet<ProjectTeam> ProjectTeams { get; }
    DbSet<TeamMember> TeamMembers { get; }
    DbSet<SprintTask> SprintTasks { get; }
    DbSet<TeamArtifact> TeamArtifacts { get; }
    DbSet<WeeklyLogbook> WeeklyLogbooks { get; }
    DbSet<VivaPanel> VivaPanels { get; }
    DbSet<VivaPanelEvaluator> VivaPanelEvaluators { get; }
    DbSet<VivaEvaluation> VivaEvaluations { get; }
    DbSet<IndividualStudentScore> IndividualStudentScores { get; }
    DbSet<CourseExitSurvey> CourseExitSurveys { get; }
    DbSet<ExceptionAuditLog> ExceptionAuditLogs { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}

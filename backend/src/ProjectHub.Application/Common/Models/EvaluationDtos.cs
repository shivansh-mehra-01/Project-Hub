using System.ComponentModel.DataAnnotations;
using ProjectHub.Domain.Enums;

namespace ProjectHub.Application.Common.Models;

// =========================================================================
// PHASE 9: EVALUATION, VIVA DEFENSE & ACADEMIC GRADING DTOs
// =========================================================================

public record VivaScheduleDto
{
    public Guid Id { get; init; }
    public Guid CollegeId { get; init; }
    public Guid DepartmentId { get; init; }
    public string DepartmentName { get; init; } = string.Empty;
    public Guid AcademicTrackId { get; init; }
    public string TrackName { get; init; } = string.Empty;
    public Guid ProjectTeamId { get; init; }
    public string TeamCode { get; init; } = string.Empty;
    public string TeamTitle { get; init; } = string.Empty;
    public Guid? VivaPanelId { get; init; }
    public string? PanelName { get; init; }
    public DateTime ScheduledDateUtc { get; init; }
    public int DurationMinutes { get; init; }
    public string VenueOrLink { get; init; } = string.Empty;
    public VivaScheduleStatus Status { get; init; }
    public string? CandidateInstructions { get; init; }
    public string? CancellationReason { get; init; }
    public List<string> EvaluatorNames { get; init; } = new();
    public string? ScheduledByName { get; init; }
    public DateTime ScheduledAtUtc { get; init; }
    public DateTime? RescheduledAtUtc { get; init; }
}

public record ScheduleVivaRequest
{
    [Required]
    public Guid ProjectTeamId { get; init; }

    public Guid? VivaPanelId { get; init; }

    [Required]
    public DateTime ScheduledDateUtc { get; init; }

    [Range(15, 180, ErrorMessage = "Duration must be between 15 and 180 minutes.")]
    public int DurationMinutes { get; init; } = 30;

    [Required]
    [MinLength(3, ErrorMessage = "Venue or meeting link must be at least 3 characters.")]
    [MaxLength(250, ErrorMessage = "Venue or meeting link cannot exceed 250 characters.")]
    public string VenueOrLink { get; init; } = string.Empty;

    [MaxLength(2000, ErrorMessage = "Candidate instructions cannot exceed 2000 characters.")]
    public string? CandidateInstructions { get; init; }
}

public record RescheduleVivaRequest
{
    [Required]
    public DateTime NewScheduledDateUtc { get; init; }

    [Range(15, 180, ErrorMessage = "Duration must be between 15 and 180 minutes.")]
    public int? NewDurationMinutes { get; init; }

    [MaxLength(250, ErrorMessage = "Venue or meeting link cannot exceed 250 characters.")]
    public string? NewVenueOrLink { get; init; }

    [Required]
    [MinLength(5, ErrorMessage = "Rescheduling reason must be at least 5 characters.")]
    [MaxLength(1000, ErrorMessage = "Rescheduling reason cannot exceed 1000 characters.")]
    public string Reason { get; init; } = string.Empty;
}

public record CancelVivaRequest
{
    [Required]
    [MinLength(5, ErrorMessage = "Cancellation reason must be at least 5 characters.")]
    [MaxLength(1000, ErrorMessage = "Cancellation reason cannot exceed 1000 characters.")]
    public string CancellationReason { get; init; } = string.Empty;
}

public record RubricCriterionDto
{
    public Guid Id { get; init; }
    public string CriterionCode { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public decimal MaxMarks { get; init; }
    public decimal WeightPercentage { get; init; }
    public int DisplayOrder { get; init; }
    public string? BloomTaxonomyLevel { get; init; }
}

public record EvaluationRubricDto
{
    public Guid Id { get; init; }
    public Guid DepartmentId { get; init; }
    public Guid AcademicTrackId { get; init; }
    public string Title { get; init; } = string.Empty;
    public CheckpointType CheckpointType { get; init; }
    public decimal TotalMaxMarks { get; init; }
    public bool IsActive { get; init; }
    public List<RubricCriterionDto> Criteria { get; init; } = new();
}

public record SaveRubricRequest
{
    [Required]
    public Guid DepartmentId { get; init; }

    [Required]
    public Guid AcademicTrackId { get; init; }

    [Required]
    [MinLength(3, ErrorMessage = "Rubric title must be at least 3 characters.")]
    [MaxLength(200, ErrorMessage = "Rubric title cannot exceed 200 characters.")]
    public string Title { get; init; } = string.Empty;

    [Required]
    public CheckpointType CheckpointType { get; init; } = CheckpointType.FinalViva;

    [Range(1, 100, ErrorMessage = "Total maximum marks must be between 1 and 100.")]
    public decimal TotalMaxMarks { get; init; } = 50.0m;

    [Required]
    [MinLength(1, ErrorMessage = "At least one evaluation criterion is required.")]
    public List<SaveRubricCriterionRequest> Criteria { get; init; } = new();
}

public record SaveRubricCriterionRequest
{
    [Required]
    [MaxLength(50)]
    public string CriterionCode { get; init; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string Title { get; init; } = string.Empty;

    [Required]
    [MaxLength(2000)]
    public string Description { get; init; } = string.Empty;

    [Range(0.5, 50, ErrorMessage = "Max marks for criterion must be between 0.5 and 50.")]
    public decimal MaxMarks { get; init; }

    [Range(1, 100, ErrorMessage = "Weight percentage must be between 1 and 100.")]
    public decimal WeightPercentage { get; init; }

    public int DisplayOrder { get; init; }

    [MaxLength(100)]
    public string? BloomTaxonomyLevel { get; init; }
}

public record EvaluatorAssessmentCriterionScoreDto
{
    public string CriterionCode { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public decimal AwardedMarks { get; init; }
    public decimal MaxMarks { get; init; }
    public string? Remarks { get; init; }
}

public record StudentIndividualScoreDto
{
    public Guid StudentUserId { get; init; }
    public string StudentName { get; init; } = string.Empty;
    public string EnrollmentCode { get; init; } = string.Empty;
    public decimal ModuleOwnershipScore { get; init; }
    public decimal VivaQaScore { get; init; }
    public decimal LogDisciplineScore { get; init; }
    public decimal IndividualTotalScore { get; init; }
    public decimal FinalComputedStudentMark { get; init; }
}

public record StudentIndividualScoreInputDto
{
    [Required]
    public Guid StudentUserId { get; init; }

    [Range(0, 20, ErrorMessage = "Module ownership score must be between 0 and 20.")]
    public decimal ModuleOwnershipScore { get; init; }

    [Range(0, 20, ErrorMessage = "Viva Q&A score must be between 0 and 20.")]
    public decimal VivaQaScore { get; init; }

    [Range(0, 20, ErrorMessage = "Logbook discipline score must be between 0 and 20.")]
    public decimal LogDisciplineScore { get; init; }
}

public record SubmitEvaluatorAssessmentRequest
{
    [Required]
    public Guid ProjectTeamId { get; init; }

    public CheckpointType CheckpointType { get; init; } = CheckpointType.FinalViva;

    [Required]
    public List<EvaluatorAssessmentCriterionScoreDto> CriterionScores { get; init; } = new();

    [Required]
    [MinLength(5, ErrorMessage = "General remarks must be at least 5 characters.")]
    [MaxLength(2000, ErrorMessage = "General remarks cannot exceed 2000 characters.")]
    public string GeneralRemarks { get; init; } = string.Empty;

    [Required]
    public List<StudentIndividualScoreInputDto> StudentScores { get; init; } = new();

    public bool IsDraft { get; init; } = false;
}

public record PublishEvaluationRequest
{
    [Required]
    public VivaOutcome Outcome { get; init; }

    [Required]
    [MinLength(5, ErrorMessage = "Moderation/Publication remarks must be at least 5 characters.")]
    [MaxLength(2000, ErrorMessage = "Moderation/Publication remarks cannot exceed 2000 characters.")]
    public string Remarks { get; init; } = string.Empty;
}

public record CorrectEvaluationRequest
{
    [Required]
    [MinLength(10, ErrorMessage = "Correction reason must be at least 10 characters.")]
    [MaxLength(1000, ErrorMessage = "Correction reason cannot exceed 1000 characters.")]
    public string Reason { get; init; } = string.Empty;

    [Range(0, 100, ErrorMessage = "New shared total score must be between 0 and 100.")]
    public decimal? NewSharedTotalScore { get; init; }

    public VivaOutcome? NewOutcome { get; init; }

    [MaxLength(2000)]
    public string? NewRemarks { get; init; }

    public List<StudentIndividualScoreInputDto>? StudentCorrections { get; init; }
}

public record StudentVivaResultDto
{
    public Guid TeamId { get; init; }
    public string TeamCode { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public ProjectStatus Status { get; init; }
    public EvaluationStage EvaluationStage { get; init; }
    public VivaScheduleDto? Schedule { get; init; }
    public VivaOutcome Outcome { get; init; }
    public bool IsPublished { get; init; }
    public DateTime? PublishedAtUtc { get; init; }
    public decimal? SharedTotalScore { get; init; }
    public decimal? SharedMaxScore { get; init; }
    public List<EvaluatorAssessmentCriterionScoreDto> CriteriaScores { get; init; } = new();
    public StudentIndividualScoreDto? MyIndividualScore { get; init; }
    public List<StudentIndividualScoreDto> TeamMembersScores { get; init; } = new();
    public string? GeneralRemarks { get; init; }
    public string? ModerationRemarks { get; init; }
}

public record AssignedDefenseSessionDto
{
    public Guid TeamId { get; init; }
    public string TeamCode { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Abstract { get; init; } = string.Empty;
    public string DomainTag { get; init; } = string.Empty;
    public Guid? GuideUserId { get; init; }
    public string? GuideName { get; init; }
    public bool IsGuideConflict { get; init; }
    public ProjectStatus Status { get; init; }
    public EvaluationStage EvaluationStage { get; init; }
    public DateTime? ScheduledDateUtc { get; init; }
    public int? DurationMinutes { get; init; }
    public string? VenueOrLink { get; init; }
    public bool HasEvaluation { get; init; }
    public bool IsEvaluationLocked { get; init; }
    public decimal? SharedTotalScore { get; init; }
    public VivaOutcome Outcome { get; init; }
    public bool IsPublished { get; init; }
    public List<TeamMemberDto> Members { get; init; } = new();
}

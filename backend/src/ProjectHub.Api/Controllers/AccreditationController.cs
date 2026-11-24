using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjectHub.Api.Authorization;
using ProjectHub.Application.Common.Models;
using ProjectHub.Application.Interfaces;
using ProjectHub.Domain.Entities;
using ProjectHub.Domain.Enums;
using ProjectHub.Infrastructure.Persistence;

namespace ProjectHub.Api.Controllers;

[ApiController]
[Route("api/college/accreditation")]
[Authorize(Policy = ProjectHubPolicies.CollegeAdminOnly)]
public class AccreditationController : ControllerBase
{
    private readonly ProjectHubDbContext _context;
    private readonly ITenantContext _tenantContext;

    public AccreditationController(ProjectHubDbContext context, ITenantContext tenantContext)
    {
        _context = context;
        _tenantContext = tenantContext;
    }

    private async Task<(Guid? UserId, string Email, string FullName)> ResolveCallerIdentityAsync()
    {
        var userId = _tenantContext.UserId;
        if (userId.HasValue)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId.Value);
            if (user != null)
            {
                return (user.Id, user.Email, user.FullName);
            }
        }
        return (null, "admin@college.ac.in", "College Administrator");
    }

    private async Task EnsureDefaultCycleExistsAsync(Guid collegeId)
    {
        var existing = await _context.AccreditationCycles
            .AnyAsync(c => c.CollegeId == collegeId && !c.IsDeleted);

        if (!existing)
        {
            var dept = await _context.Departments
                .FirstOrDefaultAsync(d => d.CollegeId == collegeId && !d.IsDeleted);

            var prog = await _context.CoursePrograms
                .FirstOrDefaultAsync(p => p.CollegeId == collegeId && !p.IsDeleted);

            var cycle = new AccreditationCycle
            {
                CollegeId = collegeId,
                DepartmentId = dept?.Id,
                CourseProgramId = prog?.Id,
                FrameworkCode = "NBA",
                VersionLabel = "NBA Tier-II SAR Manual (Rev. 2025)",
                CycleName = "B.Tech CSE - 2026 SAR Accreditation Cycle",
                AcademicYear = "2026–2027",
                Level = "Program",
                Status = "DataCollection",
                StartDate = new DateTime(2026, 7, 1, 0, 0, 0, DateTimeKind.Utc),
                EndDate = new DateTime(2027, 5, 31, 23, 59, 59, DateTimeKind.Utc),
                TargetScore = 1000m,
                AttainedScore = 684m,
                AttainmentPercentage = 68.4m
            };

            await _context.AccreditationCycles.AddAsync(cycle);
            await _context.SaveChangesAsync();

            // Seed Criteria 1 to 10
            var criteriaTemplates = new[]
            {
                (1, "Criterion 1", "Vision, Mission and Program Educational Objectives (PEOs)", 50m, 48m),
                (2, "Criterion 2", "Program Curriculum and Teaching-Learning Processes", 100m, 88m),
                (3, "Criterion 3", "Course Outcomes and Program Outcomes Attainment", 120m, 101m),
                (4, "Criterion 4", "Students' Performance", 150m, 112m),
                (5, "Criterion 5", "Faculty Information and Contributions", 200m, 124m),
                (6, "Criterion 6", "Facilities and Technical Support", 80m, 72m),
                (7, "Criterion 7", "Continuous Improvement", 75m, 38m),
                (8, "Criterion 8", "First Year Academics", 50m, 40m),
                (9, "Criterion 9", "Student Support Systems", 50m, 35m),
                (10, "Criterion 10", "Governance, Institutional Support and Financial Resources", 125m, 81m)
            };

            var criteriaEntities = new List<AccreditationCriterion>();
            foreach (var ct in criteriaTemplates)
            {
                var criterion = new AccreditationCriterion
                {
                    CollegeId = collegeId,
                    CycleId = cycle.Id,
                    SortOrder = ct.Item1,
                    Code = ct.Item2,
                    Title = ct.Item3,
                    MaxMarks = ct.Item4,
                    AttainedMarks = ct.Item5,
                    AttainmentPercentage = Math.Round(ct.Item5 / ct.Item4 * 100m, 1),
                    Status = ct.Item5 >= ct.Item4 ? "Complete" : "InProgress"
                };
                criteriaEntities.Add(criterion);
            }

            await _context.AccreditationCriteria.AddRangeAsync(criteriaEntities);
            await _context.SaveChangesAsync();

            // Seed metrics for Criterion 2 & 3
            var crit2 = criteriaEntities.First(c => c.SortOrder == 2);
            var crit3 = criteriaEntities.First(c => c.SortOrder == 3);

            var metric1 = new AccreditationMetric
            {
                CollegeId = collegeId,
                CriterionId = crit2.Id,
                MetricCode = "2.1",
                Title = "State the process for designing the program curriculum",
                MaxMarks = 10m,
                AttainedMarks = 9m,
                Status = "Approved"
            };

            var metric2 = new AccreditationMetric
            {
                CollegeId = collegeId,
                CriterionId = crit3.Id,
                MetricCode = "3.1",
                Title = "Establish the correlation between the courses and the Program Outcomes (POs)",
                MaxMarks = 20m,
                AttainedMarks = 17m,
                Status = "Approved"
            };

            await _context.AccreditationMetrics.AddRangeAsync(metric1, metric2);

            // Seed sample evidence
            var evidence = new AccreditationEvidence
            {
                CollegeId = collegeId,
                CycleId = cycle.Id,
                MetricId = metric1.Id,
                CriterionCode = "Criterion 2",
                MetricCode = "2.1",
                Title = "Minutes of Board of Studies (BOS) & Industry Advisory Board",
                Description = "Signed minutes confirming CO-PO curriculum mapping and stakeholder feedback.",
                StorageKey = "accreditation/bos_curriculum_minutes_2026.pdf",
                FileName = "bos_curriculum_minutes_2026.pdf",
                FileSizeBytes = 2411724,
                FileType = "application/pdf",
                UploadedByName = "Dr. Keshvendra Choudhary",
                UploadedByRole = "College Admin",
                Status = "Approved",
                ReviewNote = "Approved by Department Academic Advisory Board.",
                ReviewedByName = "Dr. Ravindra Kumar Sharma",
                ReviewedAtUtc = DateTime.UtcNow.AddDays(-2)
            };

            await _context.AccreditationEvidences.AddAsync(evidence);

            // Log activity
            var activity = new AccreditationActivityLog
            {
                CollegeId = collegeId,
                CycleId = cycle.Id,
                Action = "CYCLE_INITIALIZED",
                EntityType = "Cycle",
                EntityTitle = cycle.CycleName,
                PerformedByName = "System",
                PerformedByRole = "Platform Admin",
                Details = "Initialized institutional NBA Tier-II SAR cycle with standard Criteria 1 to 10.",
                OccurredAtUtc = DateTime.UtcNow
            };
            await _context.AccreditationActivityLogs.AddAsync(activity);

            await _context.SaveChangesAsync();
        }
    }

    [HttpGet("overview")]
    public async Task<ActionResult<AccreditationOverviewDto>> GetOverview()
    {
        var collegeId = _tenantContext.CollegeId;
        if (!collegeId.HasValue) return BadRequest(new { message = "Active tenant context required." });

        var cycles = await _context.AccreditationCycles
            .Include(c => c.Department)
            .Include(c => c.CourseProgram)
            .Where(c => c.CollegeId == collegeId.Value && !c.IsDeleted)
            .OrderByDescending(c => c.CreatedAtUtc)
            .ToListAsync();

        var cycleEvidences = await _context.AccreditationEvidences
            .Where(e => e.CollegeId == collegeId.Value && !e.IsDeleted)
            .GroupBy(e => e.CycleId)
            .Select(g => new
            {
                CycleId = g.Key,
                TotalEvidence = g.Count(),
                PendingReviews = g.Count(e => e.Status == "UnderReview")
            })
            .ToDictionaryAsync(x => x.CycleId, x => (x.TotalEvidence, x.PendingReviews));

        var cycleDtos = cycles.Select(c =>
        {
            var counts = cycleEvidences.TryGetValue(c.Id, out var cv) ? cv : (TotalEvidence: 0, PendingReviews: 0);
            return new AccreditationCycleDto
            {
                Id = c.Id,
                CollegeId = c.CollegeId,
                FrameworkId = c.FrameworkCode == "NBA" ? "fw-nba" : "fw-naac",
                FrameworkCode = c.FrameworkCode,
                FrameworkName = c.FrameworkCode == "NBA" ? "National Board of Accreditation" : "National Assessment and Accreditation Council",
                VersionId = c.FrameworkCode == "NBA" ? "ver-nba-2025" : "ver-naac-2024",
                VersionLabel = c.VersionLabel,
                Level = c.Level,
                ProgramId = c.CourseProgramId,
                ProgramName = c.CourseProgram?.Name,
                DepartmentId = c.DepartmentId,
                DepartmentCode = c.Department?.Code,
                CycleName = c.CycleName,
                AcademicYear = c.AcademicYear,
                Status = c.Status,
                StartDate = c.StartDate,
                EndDate = c.EndDate,
                OverallScore = c.AttainedScore,
                OverallGrade = c.AttainmentPercentage >= 65m ? "Accredited (3 Years)" : "Provisionally Accredited",
                CompletionPct = c.AttainmentPercentage,
                PendingReviews = counts.PendingReviews,
                EvidenceCount = counts.TotalEvidence,
                IsAttested = c.IsAttested,
                AttestedAtUtc = c.AttestedAtUtc,
                AttestedByName = c.AttestedByName,
                AttestationRemarks = c.AttestationRemarks,
                CreatedAtUtc = c.CreatedAtUtc,
                UpdatedAtUtc = c.UpdatedAtUtc
            };
        }).ToList();

        var recentActivities = await _context.AccreditationActivityLogs
            .Where(a => a.CollegeId == collegeId.Value && !a.IsDeleted)
            .OrderByDescending(a => a.OccurredAtUtc)
            .Take(10)
            .Select(a => new AccreditationActivityDto
            {
                Id = a.Id,
                CycleId = a.CycleId,
                Action = a.Action,
                EntityType = a.EntityType,
                EntityTitle = a.EntityTitle,
                PerformedByName = a.PerformedByName,
                PerformedByRole = a.PerformedByRole,
                PerformedAtUtc = a.OccurredAtUtc,
                Details = a.Details,
                IpAddress = a.IpAddress
            })
            .ToListAsync();

        var evidenceCount = await _context.AccreditationEvidences
            .CountAsync(e => e.CollegeId == collegeId.Value && !e.IsDeleted);

        var pendingReviewsCount = await _context.AccreditationEvidences
            .CountAsync(e => e.CollegeId == collegeId.Value && e.Status == "UnderReview" && !e.IsDeleted);

        var frameworks = new List<FrameworkSummaryDto>
        {
            new()
            {
                FrameworkId = "fw-nba",
                FrameworkCode = "NBA",
                FrameworkName = "National Board of Accreditation",
                Level = "Program",
                ActiveCyclesCount = cycleDtos.Count(c => c.FrameworkCode == "NBA"),
                ProgramsConfigured = cycleDtos.Count(c => c.FrameworkCode == "NBA"),
                CurrentStatus = cycleDtos.Any(c => c.FrameworkCode == "NBA") ? "Active" : "Not Started",
                LatestVersionLabel = "NBA Tier-II SAR Manual (Rev. 2025)",
                OverallCompletionPct = cycleDtos.Any(c => c.FrameworkCode == "NBA")
                    ? Math.Round(cycleDtos.Where(c => c.FrameworkCode == "NBA").Average(c => c.CompletionPct), 1)
                    : 0m
            },
            new()
            {
                FrameworkId = "fw-naac",
                FrameworkCode = "NAAC",
                FrameworkName = "National Assessment and Accreditation Council",
                Level = "Institution",
                ActiveCyclesCount = cycleDtos.Count(c => c.FrameworkCode == "NAAC"),
                ProgramsConfigured = cycleDtos.Count(c => c.FrameworkCode == "NAAC"),
                CurrentStatus = cycleDtos.Any(c => c.FrameworkCode == "NAAC") ? "Active" : "Not Started",
                LatestVersionLabel = "NAAC Institutional Manual (RAF 2024)",
                OverallCompletionPct = cycleDtos.Any(c => c.FrameworkCode == "NAAC")
                    ? Math.Round(cycleDtos.Where(c => c.FrameworkCode == "NAAC").Average(c => c.CompletionPct), 1)
                    : 0m
            }
        };

        return Ok(new AccreditationOverviewDto
        {
            ActiveFrameworks = cycleDtos.Select(c => c.FrameworkCode).Distinct().Count(),
            AccreditationPrograms = cycleDtos.Select(c => c.ProgramId).Where(id => id.HasValue).Distinct().Count(),
            PendingReviews = pendingReviewsCount,
            EvidenceDocuments = evidenceCount,
            Cycles = cycleDtos,
            RecentActivities = recentActivities,
            FrameworkSummaries = frameworks
        });
    }

    [HttpGet("frameworks")]
    public ActionResult<List<AccreditationFrameworkDto>> GetFrameworks()
    {
        var frameworks = new List<AccreditationFrameworkDto>
        {
            new()
            {
                Id = "fw-nba",
                Code = "NBA",
                Name = "National Board of Accreditation",
                Description = "Outcome-Based Tier-II & Tier-I Engineering & Technology Program Accreditation.",
                Level = "Program",
                IsActive = true,
                VersionsCount = 2,
                CreatedAtUtc = new DateTime(2025, 1, 15, 0, 0, 0, DateTimeKind.Utc)
            },
            new()
            {
                Id = "fw-naac",
                Code = "NAAC",
                Name = "National Assessment and Accreditation Council",
                Description = "Institutional Grading & Quality Assessment across 7 Criteria.",
                Level = "Institution",
                IsActive = true,
                VersionsCount = 2,
                CreatedAtUtc = new DateTime(2025, 1, 15, 0, 0, 0, DateTimeKind.Utc)
            }
        };

        return Ok(frameworks);
    }

    [HttpGet("frameworks/{frameworkId}/versions")]
    public ActionResult<List<FrameworkVersionDto>> GetFrameworkVersions(string frameworkId)
    {
        var versions = new List<FrameworkVersionDto>
        {
            new()
            {
                Id = "ver-nba-2025",
                FrameworkId = "fw-nba",
                FrameworkCode = "NBA",
                VersionLabel = "NBA Tier-II SAR Manual (Rev. 2025)",
                EffectiveFromYear = 2025,
                IsLatest = true,
                IsLocked = true,
                CriteriaCount = 10,
                MetricsCount = 42,
                CreatedAtUtc = new DateTime(2025, 6, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new()
            {
                Id = "ver-naac-2024",
                FrameworkId = "fw-naac",
                FrameworkCode = "NAAC",
                VersionLabel = "NAAC Institutional Manual (RAF 2024)",
                EffectiveFromYear = 2024,
                IsLatest = true,
                IsLocked = true,
                CriteriaCount = 7,
                MetricsCount = 34,
                CreatedAtUtc = new DateTime(2024, 4, 1, 0, 0, 0, DateTimeKind.Utc)
            }
        };

        var filtered = versions.Where(v => string.Equals(v.FrameworkId, frameworkId, StringComparison.OrdinalIgnoreCase)).ToList();
        return Ok(filtered.Any() ? filtered : versions);
    }

    [HttpGet("cycles")]
    public async Task<ActionResult<List<AccreditationCycleDto>>> GetCycles([FromQuery] string? frameworkId, [FromQuery] string? status)
    {
        var collegeId = _tenantContext.CollegeId;
        if (!collegeId.HasValue) return BadRequest(new { message = "Active tenant context required." });

        var query = _context.AccreditationCycles
            .Include(c => c.Department)
            .Include(c => c.CourseProgram)
            .Where(c => c.CollegeId == collegeId.Value && !c.IsDeleted);

        if (!string.IsNullOrWhiteSpace(frameworkId))
        {
            var code = frameworkId.Contains("nba", StringComparison.OrdinalIgnoreCase) ? "NBA" : "NAAC";
            query = query.Where(c => c.FrameworkCode == code);
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(c => c.Status == status);
        }

        var cycles = await query.OrderByDescending(c => c.CreatedAtUtc).ToListAsync();

        var cycleEvidences = await _context.AccreditationEvidences
            .Where(e => e.CollegeId == collegeId.Value && !e.IsDeleted)
            .GroupBy(e => e.CycleId)
            .Select(g => new
            {
                CycleId = g.Key,
                TotalEvidence = g.Count(),
                PendingReviews = g.Count(e => e.Status == "UnderReview")
            })
            .ToDictionaryAsync(x => x.CycleId, x => (x.TotalEvidence, x.PendingReviews));

        var result = cycles.Select(c =>
        {
            var counts = cycleEvidences.TryGetValue(c.Id, out var cv) ? cv : (TotalEvidence: 0, PendingReviews: 0);
            return new AccreditationCycleDto
            {
                Id = c.Id,
                CollegeId = c.CollegeId,
                FrameworkId = c.FrameworkCode == "NBA" ? "fw-nba" : "fw-naac",
                FrameworkCode = c.FrameworkCode,
                FrameworkName = c.FrameworkCode == "NBA" ? "National Board of Accreditation" : "National Assessment and Accreditation Council",
                VersionId = c.FrameworkCode == "NBA" ? "ver-nba-2025" : "ver-naac-2024",
                VersionLabel = c.VersionLabel,
                Level = c.Level,
                ProgramId = c.CourseProgramId,
                ProgramName = c.CourseProgram?.Name,
                DepartmentId = c.DepartmentId,
                DepartmentCode = c.Department?.Code,
                CycleName = c.CycleName,
                AcademicYear = c.AcademicYear,
                Status = c.Status,
                StartDate = c.StartDate,
                EndDate = c.EndDate,
                OverallScore = c.AttainedScore,
                OverallGrade = c.AttainmentPercentage >= 65m ? "Accredited" : "Provisionally Accredited",
                CompletionPct = c.AttainmentPercentage,
                PendingReviews = counts.PendingReviews,
                EvidenceCount = counts.TotalEvidence,
                IsAttested = c.IsAttested,
                AttestedAtUtc = c.AttestedAtUtc,
                AttestedByName = c.AttestedByName,
                AttestationRemarks = c.AttestationRemarks,
                CreatedAtUtc = c.CreatedAtUtc,
                UpdatedAtUtc = c.UpdatedAtUtc
            };
        }).ToList();

        return Ok(result);
    }

    [HttpGet("cycles/{cycleId}")]
    public async Task<ActionResult<AccreditationCycleDto>> GetCycle(Guid cycleId)
    {
        var collegeId = _tenantContext.CollegeId;
        if (!collegeId.HasValue) return BadRequest(new { message = "Active tenant context required." });

        var c = await _context.AccreditationCycles
            .Include(c => c.Department)
            .Include(c => c.CourseProgram)
            .FirstOrDefaultAsync(c => c.Id == cycleId && c.CollegeId == collegeId.Value && !c.IsDeleted);

        if (c == null) return NotFound(new { message = "Accreditation cycle not found." });

        var evidenceCount = await _context.AccreditationEvidences.CountAsync(e => e.CycleId == cycleId && !e.IsDeleted);
        var pendingReviews = await _context.AccreditationEvidences.CountAsync(e => e.CycleId == cycleId && e.Status == "UnderReview" && !e.IsDeleted);

        return Ok(new AccreditationCycleDto
        {
            Id = c.Id,
            CollegeId = c.CollegeId,
            FrameworkId = c.FrameworkCode == "NBA" ? "fw-nba" : "fw-naac",
            FrameworkCode = c.FrameworkCode,
            FrameworkName = c.FrameworkCode == "NBA" ? "National Board of Accreditation" : "National Assessment and Accreditation Council",
            VersionId = c.FrameworkCode == "NBA" ? "ver-nba-2025" : "ver-naac-2024",
            VersionLabel = c.VersionLabel,
            Level = c.Level,
            ProgramId = c.CourseProgramId,
            ProgramName = c.CourseProgram?.Name,
            DepartmentId = c.DepartmentId,
            DepartmentCode = c.Department?.Code,
            CycleName = c.CycleName,
            AcademicYear = c.AcademicYear,
            Status = c.Status,
            StartDate = c.StartDate,
            EndDate = c.EndDate,
            OverallScore = c.AttainedScore,
            OverallGrade = c.AttainmentPercentage >= 65m ? "Accredited" : "Provisionally Accredited",
            CompletionPct = c.AttainmentPercentage,
            PendingReviews = pendingReviews,
            EvidenceCount = evidenceCount,
            IsAttested = c.IsAttested,
            AttestedAtUtc = c.AttestedAtUtc,
            AttestedByName = c.AttestedByName,
            AttestationRemarks = c.AttestationRemarks,
            CreatedAtUtc = c.CreatedAtUtc,
            UpdatedAtUtc = c.UpdatedAtUtc
        });
    }

    [HttpPost("cycles")]
    public async Task<ActionResult<AccreditationCycleDto>> CreateCycle([FromBody] CreateCycleRequest request)
    {
        var collegeId = _tenantContext.CollegeId;
        if (!collegeId.HasValue) return BadRequest(new { message = "Active tenant context required." });

        var frameworkCode = request.FrameworkId.Contains("naac", StringComparison.OrdinalIgnoreCase) ? "NAAC" : "NBA";
        var versionLabel = frameworkCode == "NBA" ? "NBA Tier-II SAR Manual (Rev. 2025)" : "NAAC Institutional Manual (RAF 2024)";
        var level = frameworkCode == "NBA" ? "Program" : "Institution";

        var cycle = new AccreditationCycle
        {
            CollegeId = collegeId.Value,
            CourseProgramId = request.ProgramId,
            DepartmentId = request.DepartmentId,
            FrameworkCode = frameworkCode,
            VersionLabel = versionLabel,
            CycleName = request.CycleName.Trim(),
            AcademicYear = string.IsNullOrWhiteSpace(request.AcademicYear) ? "2026–2027" : request.AcademicYear.Trim(),
            Level = level,
            Status = "Planning",
            StartDate = request.StartDate,
            EndDate = request.EndDate ?? request.StartDate.AddMonths(12),
            TargetScore = frameworkCode == "NBA" ? 1000m : 4.0m,
            AttainedScore = 0m,
            AttainmentPercentage = 0m
        };

        await _context.AccreditationCycles.AddAsync(cycle);
        await _context.SaveChangesAsync();

        // Seed 10 criteria
        var criteriaCount = frameworkCode == "NBA" ? 10 : 7;
        var criteriaList = new List<AccreditationCriterion>();
        for (int i = 1; i <= criteriaCount; i++)
        {
            criteriaList.Add(new AccreditationCriterion
            {
                CollegeId = collegeId.Value,
                CycleId = cycle.Id,
                SortOrder = i,
                Code = $"Criterion {i}",
                Title = frameworkCode == "NBA" ? GetNbaCriterionTitle(i) : $"NAAC Institutional Criterion {i}",
                MaxMarks = frameworkCode == "NBA" ? GetNbaCriterionMaxMarks(i) : 100m,
                AttainedMarks = 0m,
                AttainmentPercentage = 0m,
                Status = "NotStarted"
            });
        }
        await _context.AccreditationCriteria.AddRangeAsync(criteriaList);

        var (userId, email, fullName) = await ResolveCallerIdentityAsync();
        var activity = new AccreditationActivityLog
        {
            CollegeId = collegeId.Value,
            CycleId = cycle.Id,
            Action = "CYCLE_CREATED",
            EntityType = "Cycle",
            EntityTitle = cycle.CycleName,
            PerformedByUserId = userId,
            PerformedByName = fullName,
            PerformedByRole = "College Admin",
            Details = $"Created {frameworkCode} accreditation cycle '{cycle.CycleName}' for AY {cycle.AcademicYear}.",
            OccurredAtUtc = DateTime.UtcNow
        };
        await _context.AccreditationActivityLogs.AddAsync(activity);

        await _context.SaveChangesAsync();

        return Ok(new AccreditationCycleDto
        {
            Id = cycle.Id,
            CollegeId = cycle.CollegeId,
            FrameworkId = request.FrameworkId,
            FrameworkCode = cycle.FrameworkCode,
            FrameworkName = cycle.FrameworkCode == "NBA" ? "National Board of Accreditation" : "National Assessment and Accreditation Council",
            VersionId = request.VersionId,
            VersionLabel = cycle.VersionLabel,
            Level = cycle.Level,
            ProgramId = cycle.CourseProgramId,
            DepartmentId = cycle.DepartmentId,
            CycleName = cycle.CycleName,
            AcademicYear = cycle.AcademicYear,
            Status = cycle.Status,
            StartDate = cycle.StartDate,
            EndDate = cycle.EndDate,
            OverallScore = 0m,
            CompletionPct = 0m,
            PendingReviews = 0,
            EvidenceCount = 0,
            CreatedAtUtc = cycle.CreatedAtUtc,
            UpdatedAtUtc = cycle.UpdatedAtUtc
        });
    }

    [HttpPut("cycles/{cycleId}/status")]
    public async Task<IActionResult> UpdateCycleStatus(Guid cycleId, [FromBody] UpdateCycleStatusRequest request)
    {
        var collegeId = _tenantContext.CollegeId;
        if (!collegeId.HasValue) return BadRequest(new { message = "Active tenant context required." });

        var cycle = await _context.AccreditationCycles
            .FirstOrDefaultAsync(c => c.Id == cycleId && c.CollegeId == collegeId.Value && !c.IsDeleted);

        if (cycle == null) return NotFound(new { message = "Cycle not found." });

        cycle.Status = request.Status;

        var (userId, email, fullName) = await ResolveCallerIdentityAsync();
        var activity = new AccreditationActivityLog
        {
            CollegeId = collegeId.Value,
            CycleId = cycle.Id,
            Action = "CYCLE_STATUS_UPDATED",
            EntityType = "Cycle",
            EntityTitle = cycle.CycleName,
            PerformedByUserId = userId,
            PerformedByName = fullName,
            PerformedByRole = "College Admin",
            Details = $"Updated cycle status to {request.Status}.",
            OccurredAtUtc = DateTime.UtcNow
        };
        await _context.AccreditationActivityLogs.AddAsync(activity);

        await _context.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpGet("cycles/{cycleId}/programs")]
    public async Task<ActionResult<List<ProgramMappingDto>>> GetProgramMappings(Guid cycleId)
    {
        var collegeId = _tenantContext.CollegeId;
        if (!collegeId.HasValue) return BadRequest(new { message = "Active tenant context required." });

        var cycle = await _context.AccreditationCycles
            .FirstOrDefaultAsync(c => c.Id == cycleId && c.CollegeId == collegeId.Value && !c.IsDeleted);

        var evidenceCount = await _context.AccreditationEvidences
            .CountAsync(e => e.CycleId == cycleId && !e.IsDeleted);
        var pendingReviews = await _context.AccreditationEvidences
            .CountAsync(e => e.CycleId == cycleId && e.Status == "UnderReview" && !e.IsDeleted);
        var completionPct = cycle?.AttainmentPercentage ?? 0m;

        var depts = await _context.Departments
            .Include(d => d.HodUser)
            .Include(d => d.CourseProgram)
            .Where(d => d.CollegeId == collegeId.Value && !d.IsDeleted)
            .ToListAsync();

        var result = depts.Select(d => new ProgramMappingDto
        {
            Id = $"pm-{d.Id}",
            CycleId = cycleId,
            ProgramId = d.CourseProgramId ?? Guid.Empty,
            ProgramCode = d.CourseProgram?.Code ?? "UG",
            ProgramName = d.CourseProgram?.Name ?? d.Name,
            ProgramLevel = "UG",
            DepartmentId = d.Id,
            DepartmentCode = d.Code,
            DepartmentName = d.Name,
            HodName = d.HodUser?.FullName,
            IsEligible = true,
            MappingStatus = "Mapped",
            CriteriaCompletionPct = completionPct,
            EvidenceCount = evidenceCount,
            PendingReviews = pendingReviews,
            LastUpdatedUtc = cycle?.UpdatedAtUtc ?? DateTime.UtcNow
        }).ToList();

        return Ok(result);
    }

    [HttpPost("cycles/{cycleId}/programs")]
    public async Task<ActionResult<ProgramMappingDto>> MapProgram(Guid cycleId, [FromBody] MapProgramRequest request)
    {
        var collegeId = _tenantContext.CollegeId;
        if (!collegeId.HasValue) return BadRequest(new { message = "Active tenant context required." });

        var prog = await _context.CoursePrograms
            .FirstOrDefaultAsync(p => p.Id == request.ProgramId && p.CollegeId == collegeId.Value && !p.IsDeleted);

        if (prog == null) return NotFound(new { message = "Program not found." });

        var dept = await _context.Departments
            .Include(d => d.HodUser)
            .FirstOrDefaultAsync(d => d.CourseProgramId == prog.Id && d.CollegeId == collegeId.Value && !d.IsDeleted);

        return Ok(new ProgramMappingDto
        {
            Id = $"pm-{prog.Id}",
            CycleId = cycleId,
            ProgramId = prog.Id,
            ProgramCode = prog.Code,
            ProgramName = prog.Name,
            ProgramLevel = prog.Level.ToString(),
            DepartmentId = dept?.Id ?? Guid.Empty,
            DepartmentCode = dept?.Code ?? prog.Code,
            DepartmentName = dept?.Name ?? prog.Name,
            HodName = dept?.HodUser?.FullName,
            IsEligible = true,
            MappingStatus = "Mapped",
            CriteriaCompletionPct = 0m,
            EvidenceCount = 0,
            PendingReviews = 0,
            LastUpdatedUtc = DateTime.UtcNow
        });
    }

    [HttpGet("versions/{versionId}/criteria")]
    public async Task<ActionResult<List<CriterionDto>>> GetCriteria(string versionId)
    {
        var collegeId = _tenantContext.CollegeId;
        if (!collegeId.HasValue) return BadRequest(new { message = "Active tenant context required." });

        var criteria = await _context.AccreditationCriteria
            .Include(c => c.Metrics)
            .Where(c => c.CollegeId == collegeId.Value && !c.IsDeleted)
            .OrderBy(c => c.SortOrder)
            .ToListAsync();

        var result = criteria.Select(c => new CriterionDto
        {
            Id = c.Id,
            VersionId = versionId,
            Code = c.Code,
            Title = c.Title,
            Description = c.Description ?? string.Empty,
            WeightPct = c.MaxMarks > 0 ? Math.Round(c.MaxMarks / 10m, 1) : 10m,
            SortOrder = c.SortOrder,
            MetricsCount = c.Metrics.Count > 0 ? c.Metrics.Count : 4,
            SubCriteriaCount = 3,
            CompletionPct = c.AttainmentPercentage,
            MaxMarks = c.MaxMarks,
            AttainedMarks = c.AttainedMarks,
            Status = c.Status
        }).ToList();

        return Ok(result);
    }

    [HttpGet("criteria/{criterionId}/metrics")]
    public async Task<ActionResult<List<MetricDto>>> GetMetrics(Guid criterionId)
    {
        var collegeId = _tenantContext.CollegeId;
        if (!collegeId.HasValue) return BadRequest(new { message = "Active tenant context required." });

        var criterion = await _context.AccreditationCriteria
            .Include(c => c.Metrics)
                .ThenInclude(m => m.EvidenceItems)
            .FirstOrDefaultAsync(c => c.Id == criterionId && c.CollegeId == collegeId.Value && !c.IsDeleted);

        if (criterion == null) return NotFound(new { message = "Criterion not found." });

        var metrics = criterion.Metrics.Where(m => !m.IsDeleted).Select(m => new MetricDto
        {
            Id = m.Id,
            CriterionId = criterion.Id,
            CriterionCode = criterion.Code,
            Code = m.MetricCode,
            Title = m.Title,
            Description = m.Description ?? string.Empty,
            ScoringMethod = "Marks",
            MaxScore = m.MaxMarks,
            CurrentScore = m.AttainedMarks,
            TargetScore = m.MaxMarks,
            WeightPct = 10m,
            EvidenceRequired = true,
            EvidenceCount = m.EvidenceItems.Count(e => !e.IsDeleted),
            Status = m.Status,
            SortOrder = 1
        }).ToList();

        return Ok(metrics);
    }

    [HttpPut("metrics/{metricId}/score")]
    public async Task<IActionResult> UpdateMetricScore(Guid metricId, [FromBody] UpdateMetricScoreRequest request)
    {
        var collegeId = _tenantContext.CollegeId;
        if (!collegeId.HasValue) return BadRequest(new { message = "Active tenant context required." });

        var metric = await _context.AccreditationMetrics
            .Include(m => m.Criterion)
            .FirstOrDefaultAsync(m => m.Id == metricId && m.CollegeId == collegeId.Value && !m.IsDeleted);

        if (metric == null) return NotFound(new { message = "Metric not found." });

        metric.AttainedMarks = request.Score;
        metric.Status = request.Score >= metric.MaxMarks ? "Verified" : "InProgress";

        await _context.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpGet("cycles/{cycleId}/evidence")]
    public async Task<ActionResult<List<EvidenceDocumentDto>>> GetEvidence(Guid cycleId, [FromQuery] Guid? metricId, [FromQuery] string? status)
    {
        var collegeId = _tenantContext.CollegeId;
        if (!collegeId.HasValue) return BadRequest(new { message = "Active tenant context required." });

        var query = _context.AccreditationEvidences
            .Where(e => e.CycleId == cycleId && e.CollegeId == collegeId.Value && !e.IsDeleted);

        if (metricId.HasValue) query = query.Where(e => e.MetricId == metricId.Value);
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(e => e.Status == status);

        var list = await query.OrderByDescending(e => e.CreatedAtUtc).ToListAsync();

        var result = list.Select(e => new EvidenceDocumentDto
        {
            Id = e.Id,
            CycleId = e.CycleId,
            MetricId = e.MetricId,
            MetricCode = e.MetricCode,
            CriterionCode = e.CriterionCode,
            Title = e.Title,
            Description = e.Description,
            FileType = e.FileType,
            FileName = e.FileName,
            FileSizeBytes = e.FileSizeBytes,
            StorageKey = e.StorageKey,
            UploadedByName = e.UploadedByName,
            UploadedByRole = e.UploadedByRole,
            UploadedAtUtc = e.CreatedAtUtc,
            Status = e.Status,
            ReviewNote = e.ReviewNote,
            ReviewedByName = e.ReviewedByName,
            ReviewedAtUtc = e.ReviewedAtUtc,
            Tags = new List<string> { "Accreditation", e.CriterionCode }
        }).ToList();

        return Ok(result);
    }

    [HttpPost("evidence")]
    public async Task<ActionResult<EvidenceDocumentDto>> UploadEvidence([FromBody] UploadEvidenceRequest request)
    {
        var collegeId = _tenantContext.CollegeId;
        if (!collegeId.HasValue) return BadRequest(new { message = "Active tenant context required." });

        var (userId, email, fullName) = await ResolveCallerIdentityAsync();

        var metric = await _context.AccreditationMetrics
            .Include(m => m.Criterion)
            .FirstOrDefaultAsync(m => m.Id == request.MetricId && m.CollegeId == collegeId.Value && !m.IsDeleted);

        var evidence = new AccreditationEvidence
        {
            CollegeId = collegeId.Value,
            CycleId = request.CycleId,
            MetricId = request.MetricId,
            MetricCode = metric?.MetricCode ?? "1.1",
            CriterionCode = metric?.Criterion?.Code ?? "Criterion 1",
            Title = request.Title.Trim(),
            Description = request.Description?.Trim(),
            StorageKey = string.IsNullOrWhiteSpace(request.StorageKey) ? $"evidence/{Guid.NewGuid()}_{request.FileName}" : request.StorageKey,
            FileName = request.FileName,
            FileSizeBytes = request.FileSizeBytes > 0 ? request.FileSizeBytes : 102400,
            FileType = "application/pdf",
            UploadedByUserId = userId ?? Guid.Empty,
            UploadedByName = fullName,
            UploadedByRole = "College Admin",
            Status = "UnderReview"
        };

        await _context.AccreditationEvidences.AddAsync(evidence);

        var activity = new AccreditationActivityLog
        {
            CollegeId = collegeId.Value,
            CycleId = request.CycleId,
            Action = "EVIDENCE_UPLOADED",
            EntityType = "Evidence",
            EntityTitle = evidence.Title,
            PerformedByUserId = userId,
            PerformedByName = fullName,
            PerformedByRole = "College Admin",
            Details = $"Uploaded evidence document '{evidence.FileName}' for Metric {evidence.MetricCode}.",
            OccurredAtUtc = DateTime.UtcNow
        };
        await _context.AccreditationActivityLogs.AddAsync(activity);

        await _context.SaveChangesAsync();

        return Ok(new EvidenceDocumentDto
        {
            Id = evidence.Id,
            CycleId = evidence.CycleId,
            MetricId = evidence.MetricId,
            MetricCode = evidence.MetricCode,
            CriterionCode = evidence.CriterionCode,
            Title = evidence.Title,
            Description = evidence.Description,
            FileType = evidence.FileType,
            FileName = evidence.FileName,
            FileSizeBytes = evidence.FileSizeBytes,
            StorageKey = evidence.StorageKey,
            UploadedByName = evidence.UploadedByName,
            UploadedByRole = evidence.UploadedByRole,
            UploadedAtUtc = evidence.CreatedAtUtc,
            Status = evidence.Status,
            Tags = request.Tags ?? new List<string> { "Evidence" }
        });
    }

    [HttpPut("evidence/{evidenceId}/status")]
    public async Task<IActionResult> UpdateEvidenceStatus(Guid evidenceId, [FromBody] UpdateEvidenceStatusRequest request)
    {
        var collegeId = _tenantContext.CollegeId;
        if (!collegeId.HasValue) return BadRequest(new { message = "Active tenant context required." });

        var evidence = await _context.AccreditationEvidences
            .FirstOrDefaultAsync(e => e.Id == evidenceId && e.CollegeId == collegeId.Value && !e.IsDeleted);

        if (evidence == null) return NotFound(new { message = "Evidence not found." });

        var (userId, email, fullName) = await ResolveCallerIdentityAsync();

        evidence.Status = request.Status;
        evidence.ReviewNote = request.ReviewNote;
        evidence.ReviewedByUserId = userId;
        evidence.ReviewedByName = fullName;
        evidence.ReviewedAtUtc = DateTime.UtcNow;

        var activity = new AccreditationActivityLog
        {
            CollegeId = collegeId.Value,
            CycleId = evidence.CycleId,
            Action = request.Status == "Approved" ? "EVIDENCE_APPROVED" : "EVIDENCE_REJECTED",
            EntityType = "Evidence",
            EntityTitle = evidence.Title,
            PerformedByUserId = userId,
            PerformedByName = fullName,
            PerformedByRole = "College Admin",
            Details = $"Evidence {request.Status}. Remarks: {request.ReviewNote}",
            OccurredAtUtc = DateTime.UtcNow
        };
        await _context.AccreditationActivityLogs.AddAsync(activity);

        await _context.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpGet("cycles/{cycleId}/reviews")]
    public async Task<ActionResult<List<ReviewRecordDto>>> GetReviews(Guid cycleId, [FromQuery] string? status)
    {
        var collegeId = _tenantContext.CollegeId;
        if (!collegeId.HasValue) return BadRequest(new { message = "Active tenant context required." });

        var query = _context.AccreditationEvidences
            .Where(e => e.CycleId == cycleId && e.CollegeId == collegeId.Value && !e.IsDeleted);

        if (!string.IsNullOrWhiteSpace(status))
        {
            var evStatus = status == "Pending" ? "UnderReview" : status;
            query = query.Where(e => e.Status == evStatus);
        }

        var evidenceItems = await query.ToListAsync();

        var result = evidenceItems.Select(e => new ReviewRecordDto
        {
            Id = e.Id,
            CycleId = e.CycleId,
            EntityType = "Evidence",
            EntityId = e.Id,
            EntityTitle = e.Title,
            CriterionCode = e.CriterionCode,
            MetricCode = e.MetricCode,
            Status = e.Status == "Approved" ? "Approved" : e.Status == "Rejected" ? "Returned" : "Pending",
            AssignedToName = "Dr. Ravindra Kumar Sharma",
            AssignedToRole = "HOD",
            SubmittedByName = e.UploadedByName,
            SubmittedAtUtc = e.CreatedAtUtc,
            ReviewedAtUtc = e.ReviewedAtUtc,
            Remarks = e.ReviewNote,
            Priority = "Medium"
        }).ToList();

        return Ok(result);
    }

    [HttpPut("reviews/{reviewId}")]
    public async Task<IActionResult> SubmitReview(Guid reviewId, [FromBody] SubmitReviewRequest request)
    {
        var collegeId = _tenantContext.CollegeId;
        if (!collegeId.HasValue) return BadRequest(new { message = "Active tenant context required." });

        var evidence = await _context.AccreditationEvidences
            .FirstOrDefaultAsync(e => e.Id == reviewId && e.CollegeId == collegeId.Value && !e.IsDeleted);

        if (evidence == null) return NotFound(new { message = "Review item not found." });

        var (userId, email, fullName) = await ResolveCallerIdentityAsync();

        evidence.Status = request.Status == "Approved" ? "Approved" : "Rejected";
        evidence.ReviewNote = request.Remarks;
        evidence.ReviewedByUserId = userId;
        evidence.ReviewedByName = fullName;
        evidence.ReviewedAtUtc = DateTime.UtcNow;

        var activity = new AccreditationActivityLog
        {
            CollegeId = collegeId.Value,
            CycleId = evidence.CycleId,
            Action = request.Status == "Approved" ? "REVIEW_APPROVED" : "REVIEW_RETURNED",
            EntityType = "Review",
            EntityTitle = evidence.Title,
            PerformedByUserId = userId,
            PerformedByName = fullName,
            PerformedByRole = "College Admin",
            Details = $"Review status: {request.Status}. Remarks: {request.Remarks}",
            OccurredAtUtc = DateTime.UtcNow
        };
        await _context.AccreditationActivityLogs.AddAsync(activity);

        await _context.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpGet("cycles/{cycleId}/report")]
    public async Task<ActionResult<AccreditationReportDto>> GetReport(Guid cycleId)
    {
        var collegeId = _tenantContext.CollegeId;
        if (!collegeId.HasValue) return BadRequest(new { message = "Active tenant context required." });

        var cycle = await _context.AccreditationCycles
            .Include(c => c.CourseProgram)
            .Include(c => c.Criteria)
                .ThenInclude(cr => cr.Metrics)
            .FirstOrDefaultAsync(c => c.Id == cycleId && c.CollegeId == collegeId.Value && !c.IsDeleted);

        if (cycle == null) return NotFound(new { message = "Cycle not found." });

        var criteriaBreakdown = cycle.Criteria.Where(cr => !cr.IsDeleted).OrderBy(cr => cr.SortOrder).Select(cr => new CriteriaScoreDto
        {
            CriterionCode = cr.Code,
            CriterionTitle = cr.Title,
            WeightPct = cr.MaxMarks > 0 ? Math.Round(cr.MaxMarks / 10m, 1) : 10m,
            AchievedScore = cr.AttainedMarks,
            MaxScore = cr.MaxMarks,
            CompletionPct = cr.AttainmentPercentage,
            MetricsCompleted = cr.Metrics.Count(m => !m.IsDeleted && m.Status == "Verified"),
            MetricsTotal = cr.Metrics.Count(m => !m.IsDeleted) > 0 ? cr.Metrics.Count(m => !m.IsDeleted) : 4
        }).ToList();

        var totalMax = criteriaBreakdown.Sum(c => c.MaxScore);
        var totalAchieved = criteriaBreakdown.Sum(c => c.AchievedScore);

        var evidenceCount = await _context.AccreditationEvidences.CountAsync(e => e.CycleId == cycleId && !e.IsDeleted);
        var approvedEvidence = await _context.AccreditationEvidences.CountAsync(e => e.CycleId == cycleId && e.Status == "Approved" && !e.IsDeleted);
        var pendingReviews = await _context.AccreditationEvidences.CountAsync(e => e.CycleId == cycleId && e.Status == "UnderReview" && !e.IsDeleted);

        return Ok(new AccreditationReportDto
        {
            CycleId = cycle.Id,
            CycleName = cycle.CycleName,
            FrameworkCode = cycle.FrameworkCode,
            VersionLabel = cycle.VersionLabel,
            AcademicYear = cycle.AcademicYear,
            Level = cycle.Level,
            ProgramName = cycle.CourseProgram?.Name,
            OverallScore = totalAchieved,
            OverallGrade = totalAchieved >= 600m ? "Accredited (Provisional 3 Yrs)" : "Pending Final Evaluation",
            TotalCriteria = criteriaBreakdown.Count,
            CompletedCriteria = criteriaBreakdown.Count(c => c.CompletionPct >= 100m),
            TotalMetrics = criteriaBreakdown.Sum(c => c.MetricsTotal),
            CompletedMetrics = criteriaBreakdown.Sum(c => c.MetricsCompleted),
            TotalEvidence = evidenceCount,
            ApprovedEvidence = approvedEvidence,
            PendingReviews = pendingReviews,
            CriteriaBreakdown = criteriaBreakdown,
            GeneratedAtUtc = DateTime.UtcNow
        });
    }

    [HttpGet("cycles/{cycleId}/export")]
    public async Task<IActionResult> ExportReport(Guid cycleId, [FromQuery] string? format)
    {
        var collegeId = _tenantContext.CollegeId;
        if (!collegeId.HasValue) return BadRequest(new { message = "Active tenant context required." });

        var cycle = await _context.AccreditationCycles
            .Include(c => c.Criteria)
            .FirstOrDefaultAsync(c => c.Id == cycleId && c.CollegeId == collegeId.Value && !c.IsDeleted);

        if (cycle == null) return NotFound(new { message = "Cycle not found." });

        var exportPayload = new
        {
            CycleId = cycle.Id,
            CycleName = cycle.CycleName,
            Framework = cycle.FrameworkCode,
            Version = cycle.VersionLabel,
            AcademicYear = cycle.AcademicYear,
            OverallScore = cycle.AttainedScore,
            AttainmentPercentage = cycle.AttainmentPercentage,
            Status = cycle.Status,
            IsAttested = cycle.IsAttested,
            AttestedAtUtc = cycle.AttestedAtUtc,
            AttestedByName = cycle.AttestedByName,
            AttestationRemarks = cycle.AttestationRemarks,
            Criteria = cycle.Criteria.Where(cr => !cr.IsDeleted).OrderBy(cr => cr.SortOrder).Select(cr => new
            {
                cr.Code,
                cr.Title,
                cr.MaxMarks,
                cr.AttainedMarks,
                cr.AttainmentPercentage,
                cr.Status
            }),
            ExportedAtUtc = DateTime.UtcNow
        };

        var jsonBytes = System.Text.Json.JsonSerializer.SerializeToUtf8Bytes(exportPayload, new System.Text.Json.JsonSerializerOptions { WriteIndented = true });
        return File(jsonBytes, "application/json", $"{cycle.CycleName.Replace(" ", "_")}_Dossier.json");
    }

    [HttpPost("cycles/{cycleId}/attest")]
    public async Task<IActionResult> AttestCycle(Guid cycleId, [FromBody] AttestCycleRequest request)
    {
        var collegeId = _tenantContext.CollegeId;
        if (!collegeId.HasValue) return BadRequest(new { message = "Active tenant context required." });

        var cycle = await _context.AccreditationCycles
            .FirstOrDefaultAsync(c => c.Id == cycleId && c.CollegeId == collegeId.Value && !c.IsDeleted);

        if (cycle == null) return NotFound(new { message = "Cycle not found." });

        var (userId, email, fullName) = await ResolveCallerIdentityAsync();

        cycle.IsAttested = true;
        cycle.AttestedAtUtc = DateTime.UtcNow;
        cycle.AttestedByUserId = userId;
        cycle.AttestedByName = fullName;
        cycle.AttestationRemarks = request.Remarks?.Trim();

        var activity = new AccreditationActivityLog
        {
            CollegeId = collegeId.Value,
            CycleId = cycle.Id,
            Action = "CYCLE_ATTESTED",
            EntityType = "Cycle",
            EntityTitle = cycle.CycleName,
            PerformedByUserId = userId,
            PerformedByName = fullName,
            PerformedByRole = "College Admin",
            Details = $"Attested SAR cycle dossier. Remarks: {cycle.AttestationRemarks}",
            OccurredAtUtc = DateTime.UtcNow
        };
        await _context.AccreditationActivityLogs.AddAsync(activity);

        await _context.SaveChangesAsync();
        return Ok(new { success = true, attestedAtUtc = cycle.AttestedAtUtc, attestedByName = cycle.AttestedByName });
    }

    [HttpGet("activity-log")]
    public async Task<ActionResult<List<AccreditationActivityDto>>> GetActivityLog([FromQuery] Guid? cycleId, [FromQuery] int? page, [FromQuery] int? pageSize)
    {
        var collegeId = _tenantContext.CollegeId;
        if (!collegeId.HasValue) return BadRequest(new { message = "Active tenant context required." });

        var query = _context.AccreditationActivityLogs
            .Where(a => a.CollegeId == collegeId.Value && !a.IsDeleted);

        if (cycleId.HasValue)
        {
            query = query.Where(a => a.CycleId == cycleId.Value);
        }

        var take = pageSize ?? 20;
        var skip = ((page ?? 1) - 1) * take;

        var logs = await query
            .OrderByDescending(a => a.OccurredAtUtc)
            .Skip(skip)
            .Take(take)
            .Select(a => new AccreditationActivityDto
            {
                Id = a.Id,
                CycleId = a.CycleId,
                Action = a.Action,
                EntityType = a.EntityType,
                EntityTitle = a.EntityTitle,
                PerformedByName = a.PerformedByName,
                PerformedByRole = a.PerformedByRole,
                PerformedAtUtc = a.OccurredAtUtc,
                Details = a.Details,
                IpAddress = a.IpAddress
            })
            .ToListAsync();

        return Ok(logs);
    }

    private static string GetNbaCriterionTitle(int sortOrder) => sortOrder switch
    {
        1 => "Vision, Mission and Program Educational Objectives (PEOs)",
        2 => "Program Curriculum and Teaching-Learning Processes",
        3 => "Course Outcomes and Program Outcomes Attainment",
        4 => "Students' Performance",
        5 => "Faculty Information and Contributions",
        6 => "Facilities and Technical Support",
        7 => "Continuous Improvement",
        8 => "First Year Academics",
        9 => "Student Support Systems",
        10 => "Governance, Institutional Support and Financial Resources",
        _ => $"Criterion {sortOrder}"
    };

    private static decimal GetNbaCriterionMaxMarks(int sortOrder) => sortOrder switch
    {
        1 => 50m,
        2 => 100m,
        3 => 120m,
        4 => 150m,
        5 => 200m,
        6 => 80m,
        7 => 75m,
        8 => 50m,
        9 => 50m,
        10 => 125m,
        _ => 100m
    };
}

using Microsoft.EntityFrameworkCore;
using ProjectHub.Application.Interfaces;
using ProjectHub.Domain.Entities;
using ProjectHub.Domain.Enums;

namespace ProjectHub.Infrastructure.Persistence;

/// <summary>
/// Idempotent production database seeder for Project Hub.
/// Seeds platform catalogs, tenants, departments, personas, tracks, teams, artifacts, and weekly logs.
/// </summary>
public static class DbInitializer
{
    // Deterministic Tenant IDs
    public static readonly Guid SistecTenantId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    public static readonly Guid BmsceTenantId = Guid.Parse("22222222-2222-2222-2222-222222222222");
    public static readonly Guid RvceTenantId = Guid.Parse("33333333-3333-3333-3333-333333333333");

    // Deterministic SISTec Department IDs
    public static readonly Guid CseDepartmentId = Guid.Parse("10000000-0000-0000-0000-000000000001");
    public static readonly Guid EceDepartmentId = Guid.Parse("10000000-0000-0000-0000-000000000002");
    public static readonly Guid MeDepartmentId = Guid.Parse("10000000-0000-0000-0000-000000000003");
    public static readonly Guid CeDepartmentId = Guid.Parse("10000000-0000-0000-0000-000000000004");

    // Deterministic User Persona IDs
    public static readonly Guid SuperAdminUserId = Guid.Parse("20000000-0000-0000-0000-000000000000");
    public static readonly Guid HodSharmaUserId = Guid.Parse("20000000-0000-0000-0000-000000000001");
    public static readonly Guid PrincipalChoudharyUserId = Guid.Parse("20000000-0000-0000-0000-000000000002");
    public static readonly Guid FacultyNairUserId = Guid.Parse("20000000-0000-0000-0000-000000000003");
    public static readonly Guid FacultyVermaUserId = Guid.Parse("20000000-0000-0000-0000-000000000004");
    public static readonly Guid StudentShivanshUserId = Guid.Parse("20000000-0000-0000-0000-000000000005");
    public static readonly Guid StudentAaravUserId = Guid.Parse("20000000-0000-0000-0000-000000000006");
    public static readonly Guid StudentDiyaUserId = Guid.Parse("20000000-0000-0000-0000-000000000007");
    public static readonly Guid StudentRohanUserId = Guid.Parse("20000000-0000-0000-0000-000000000008");

    // Deterministic Track & Team IDs
    public static readonly Guid MinorTrackId = Guid.Parse("30000000-0000-0000-0000-000000000001");
    public static readonly Guid CollegeSessionTrackId = Guid.Parse("30000000-0000-0000-0000-000000000002");
    public static readonly Guid Team01Id = Guid.Parse("40000000-0000-0000-0000-000000000001");

    public static async Task SeedAsync(ProjectHubDbContext context, ITenantContext tenantContext, bool isDevelopment = false)
    {
        var originalSuperAdmin = tenantContext.IsSuperAdmin;
        tenantContext.IsSuperAdmin = true;

        try
        {
            await SeedMasterNbaOutcomesAsync(context);
            await SeedMasterSdgCatalogAsync(context);
            await SeedTenantsAsync(context);
            await SeedDepartmentsAsync(context);
            await SeedPersonasAsync(context);
            await SeedAcademicTracksAsync(context);
            await SeedTeamAndArtifactsAsync(context);

            if (isDevelopment)
            {
                PrintSeededAccountsTable();
            }
        }
        finally
        {
            tenantContext.IsSuperAdmin = originalSuperAdmin;
        }
    }

    private static async Task SeedMasterNbaOutcomesAsync(ProjectHubDbContext context)
    {
        if (await context.MasterNbaOutcomes.IgnoreQueryFilters().AnyAsync()) return;

        var outcomes = new List<MasterNbaOutcome>
        {
            new() { Code = "PO1", Title = "Engineering Knowledge", Description = "Apply knowledge of mathematics, science, engineering fundamentals, and specialization to solve complex engineering problems.", Category = "ProgramOutcome" },
            new() { Code = "PO2", Title = "Problem Analysis", Description = "Identify, formulate, review research literature, and analyze complex engineering problems reaching substantiated conclusions.", Category = "ProgramOutcome" },
            new() { Code = "PO3", Title = "Design/Development of Solutions", Description = "Design solutions for complex engineering problems and design system components or processes that meet specified needs.", Category = "ProgramOutcome" },
            new() { Code = "PO4", Title = "Conduct Investigations of Complex Problems", Description = "Use research-based knowledge and research methods including design of experiments, analysis and synthesis of information.", Category = "ProgramOutcome" },
            new() { Code = "PO5", Title = "Modern Tool Usage", Description = "Create, select, and apply appropriate techniques, resources, and modern engineering and IT tools.", Category = "ProgramOutcome" },
            new() { Code = "PO6", Title = "The Engineer and Society", Description = "Apply reasoning informed by contextual knowledge to assess societal, health, safety, legal and cultural issues.", Category = "ProgramOutcome" },
            new() { Code = "PO7", Title = "Environment and Sustainability", Description = "Understand the impact of engineering solutions in societal and environmental contexts, demonstrating sustainable development.", Category = "SustainabilityGoal" },
            new() { Code = "PO8", Title = "Ethics", Description = "Apply ethical principles and commit to professional ethics and responsibilities and norms of engineering practice.", Category = "ProgramOutcome" },
            new() { Code = "PO9", Title = "Individual and Team Work", Description = "Function effectively as an individual, and as a member or leader in diverse teams, and in multidisciplinary settings.", Category = "ProgramOutcome" },
            new() { Code = "PO10", Title = "Communication", Description = "Communicate effectively on complex engineering activities with the engineering community and society at large.", Category = "ProgramOutcome" },
            new() { Code = "PO11", Title = "Project Management and Finance", Description = "Demonstrate knowledge and understanding of engineering and management principles and apply these to projects.", Category = "ProgramOutcome" },
            new() { Code = "PO12", Title = "Life-long Learning", Description = "Recognize the need for, and have the preparation and ability to engage in independent and life-long learning.", Category = "ProgramOutcome" }
        };

        await context.MasterNbaOutcomes.AddRangeAsync(outcomes);
        await context.SaveChangesAsync();
    }

    private static async Task SeedMasterSdgCatalogAsync(ProjectHubDbContext context)
    {
        if (await context.MasterSdgCatalogs.IgnoreQueryFilters().AnyAsync()) return;

        var sdgs = new List<MasterSdgCatalog>
        {
            new() { SdgNumber = 1, Code = "SDG-1", Title = "No Poverty", Description = "End poverty in all its forms everywhere." },
            new() { SdgNumber = 2, Code = "SDG-2", Title = "Zero Hunger", Description = "End hunger, achieve food security and improved nutrition and promote sustainable agriculture." },
            new() { SdgNumber = 3, Code = "SDG-3", Title = "Good Health and Well-being", Description = "Ensure healthy lives and promote well-being for all at all ages." },
            new() { SdgNumber = 4, Code = "SDG-4", Title = "Quality Education", Description = "Ensure inclusive and equitable quality education and promote lifelong learning opportunities for all." },
            new() { SdgNumber = 5, Code = "SDG-5", Title = "Gender Equality", Description = "Achieve gender equality and empower all women and girls." },
            new() { SdgNumber = 6, Code = "SDG-6", Title = "Clean Water and Sanitation", Description = "Ensure availability and sustainable management of water and sanitation for all." },
            new() { SdgNumber = 7, Code = "SDG-7", Title = "Affordable and Clean Energy", Description = "Ensure access to affordable, reliable, sustainable and modern energy for all." },
            new() { SdgNumber = 8, Code = "SDG-8", Title = "Decent Work and Economic Growth", Description = "Promote sustained, inclusive and sustainable economic growth, full and productive employment and decent work for all." },
            new() { SdgNumber = 9, Code = "SDG-9", Title = "Industry, Innovation and Infrastructure", Description = "Build resilient infrastructure, promote inclusive and sustainable industrialization and foster innovation." },
            new() { SdgNumber = 10, Code = "SDG-10", Title = "Reduced Inequalities", Description = "Reduce inequality within and among countries." },
            new() { SdgNumber = 11, Code = "SDG-11", Title = "Sustainable Cities and Communities", Description = "Make cities and human settlements inclusive, safe, resilient and sustainable." },
            new() { SdgNumber = 12, Code = "SDG-12", Title = "Responsible Consumption and Production", Description = "Ensure sustainable consumption and production patterns." },
            new() { SdgNumber = 13, Code = "SDG-13", Title = "Climate Action", Description = "Take urgent action to combat climate change and its impacts." },
            new() { SdgNumber = 14, Code = "SDG-14", Title = "Life Below Water", Description = "Conserve and sustainably use the oceans, seas and marine resources for sustainable development." },
            new() { SdgNumber = 15, Code = "SDG-15", Title = "Life on Land", Description = "Protect, restore and promote sustainable use of terrestrial ecosystems, sustainably manage forests, combat desertification." },
            new() { SdgNumber = 16, Code = "SDG-16", Title = "Peace, Justice and Strong Institutions", Description = "Promote peaceful and inclusive societies for sustainable development, provide access to justice for all." },
            new() { SdgNumber = 17, Code = "SDG-17", Title = "Partnerships for the Goals", Description = "Strengthen the means of implementation and revitalize the Global Partnership for Sustainable Development." }
        };

        await context.MasterSdgCatalogs.AddRangeAsync(sdgs);
        await context.SaveChangesAsync();
    }

    private static async Task SeedTenantsAsync(ProjectHubDbContext context)
    {
        if (await context.CollegeTenants.IgnoreQueryFilters().AnyAsync()) return;

        var tenants = new List<CollegeTenant>
        {
            new()
            {
                Id = SistecTenantId,
                Name = "Sagar Institute of Science and Technology (SISTec)",
                TenantCode = "SISTEC",
                SsoDomain = "sistec.ac.in",
                LicenseTier = LicenseTier.Enterprise,
                MaxStudentSeats = 1500,
                StorageQuotaGb = 100,
                IsActive = true,
                EnforceStrictSso = true,
                SubscriptionExpiresAtUtc = new DateTime(2027, 6, 30, 0, 0, 0, DateTimeKind.Utc)
            },
            new()
            {
                Id = BmsceTenantId,
                Name = "B.M.S. College of Engineering",
                TenantCode = "BMSCE",
                SsoDomain = "bmsce.ac.in",
                LicenseTier = LicenseTier.Pilot,
                MaxStudentSeats = 2100,
                StorageQuotaGb = 50,
                IsActive = true,
                EnforceStrictSso = true,
                SubscriptionExpiresAtUtc = new DateTime(2027, 2, 15, 0, 0, 0, DateTimeKind.Utc)
            },
            new()
            {
                Id = RvceTenantId,
                Name = "R.V. College of Engineering",
                TenantCode = "RVCE",
                SsoDomain = "rvce.edu.in",
                LicenseTier = LicenseTier.Enterprise,
                MaxStudentSeats = 2800,
                StorageQuotaGb = 100,
                IsActive = true,
                EnforceStrictSso = true,
                SubscriptionExpiresAtUtc = new DateTime(2027, 12, 31, 0, 0, 0, DateTimeKind.Utc)
            }
        };

        await context.CollegeTenants.AddRangeAsync(tenants);
        await context.SaveChangesAsync();
    }

    private static async Task SeedDepartmentsAsync(ProjectHubDbContext context)
    {
        if (await context.Departments.IgnoreQueryFilters().AnyAsync(d => d.CollegeId == SistecTenantId)) return;

        var departments = new List<Department>
        {
            new()
            {
                Id = CseDepartmentId,
                CollegeId = SistecTenantId,
                Code = "CSE",
                Name = "Computer Science & Engineering",
                IntakeQuota = 480,
                IsSarAttested = true,
                SarAttestedAtUtc = DateTime.UtcNow.AddDays(-15)
            },
            new()
            {
                Id = EceDepartmentId,
                CollegeId = SistecTenantId,
                Code = "ECE",
                Name = "Electronics & Communication Engineering",
                IntakeQuota = 320,
                IsSarAttested = true,
                SarAttestedAtUtc = DateTime.UtcNow.AddDays(-20)
            },
            new()
            {
                Id = MeDepartmentId,
                CollegeId = SistecTenantId,
                Code = "ME",
                Name = "Mechanical Engineering",
                IntakeQuota = 260,
                IsSarAttested = false
            },
            new()
            {
                Id = CeDepartmentId,
                CollegeId = SistecTenantId,
                Code = "CE",
                Name = "Civil Engineering",
                IntakeQuota = 220,
                IsSarAttested = true,
                SarAttestedAtUtc = DateTime.UtcNow.AddDays(-25)
            }
        };

        await context.Departments.AddRangeAsync(departments);
        await context.SaveChangesAsync();
    }

    private static async Task SeedPersonasAsync(ProjectHubDbContext context)
    {
        if (await context.Users.IgnoreQueryFilters().AnyAsync(u => u.CollegeId == SistecTenantId)) return;

        var defaultHash = Security.PasswordHelper.HashPassword("Pass@1234");

        var users = new List<UserAccount>
        {
            new()
            {
                Id = SuperAdminUserId,
                CollegeId = SistecTenantId, // partition default
                DepartmentId = null,
                FullName = "Dev Startup Admin",
                Email = "admin@projecthub.in",
                EnrollmentOrEmployeeCode = "EMP-SUPER-001",
                Role = UserRole.SuperAdmin,
                PasswordHash = defaultHash,
                IsActivated = true,
                IsProjectCoordinator = false,
                IsActive = true
            },
            new()
            {
                Id = PrincipalChoudharyUserId,
                CollegeId = SistecTenantId,
                DepartmentId = null,
                FullName = "Dr. Keshvendra Choudhary",
                Email = "principal@sistec.ac.in",
                EnrollmentOrEmployeeCode = "EMP-PRIN-001",
                Role = UserRole.CollegeAdmin,
                PasswordHash = defaultHash,
                IsActivated = true,
                IsProjectCoordinator = false,
                IsActive = true
            },
            new()
            {
                Id = HodSharmaUserId,
                CollegeId = SistecTenantId,
                DepartmentId = CseDepartmentId,
                FullName = "Dr. Ravindra Kumar Sharma",
                Email = "hod.cse@sistec.ac.in",
                EnrollmentOrEmployeeCode = "EMP-CSE-001",
                Role = UserRole.HOD,
                PasswordHash = defaultHash,
                IsActivated = true,
                IsProjectCoordinator = false,
                IsActive = true
            },
            new()
            {
                Id = FacultyNairUserId,
                CollegeId = SistecTenantId,
                DepartmentId = CseDepartmentId,
                FullName = "Prof. Priya Nair",
                Email = "priya.nair@sistec.ac.in",
                EnrollmentOrEmployeeCode = "EMP-CSE-009",
                Role = UserRole.Faculty,
                PasswordHash = defaultHash,
                IsActivated = true,
                IsProjectCoordinator = true,
                IsActive = true,
                MaxMentorTeams = 4
            },
            new()
            {
                Id = FacultyVermaUserId,
                CollegeId = SistecTenantId,
                DepartmentId = CseDepartmentId,
                FullName = "Prof. S. K. Verma",
                Email = "sk.verma@sistec.ac.in",
                EnrollmentOrEmployeeCode = "EMP-CSE-014",
                Role = UserRole.Faculty,
                PasswordHash = defaultHash,
                IsActivated = true,
                IsProjectCoordinator = false,
                IsActive = true,
                MaxMentorTeams = 4
            },
            new()
            {
                Id = StudentShivanshUserId,
                CollegeId = SistecTenantId,
                DepartmentId = CseDepartmentId,
                FullName = "Shivansh Mehra",
                Email = "0176cs221045@sistec.ac.in",
                EnrollmentOrEmployeeCode = "0176CS221045",
                Role = UserRole.Student,
                PasswordHash = defaultHash,
                IsActivated = true,
                IsProjectCoordinator = false,
                IsActive = true,
                GitHubHandle = "shivansh-m",
                JiraKey = "IEM-LEAD"
            },
            new()
            {
                Id = StudentAaravUserId,
                CollegeId = SistecTenantId,
                DepartmentId = CseDepartmentId,
                FullName = "Aarav Sharma",
                Email = "0176cs221002@sistec.ac.in",
                EnrollmentOrEmployeeCode = "0176CS221002",
                Role = UserRole.Student,
                PasswordHash = defaultHash,
                IsActivated = true,
                IsProjectCoordinator = false,
                IsActive = true,
                GitHubHandle = "aarav-s"
            },
            new()
            {
                Id = StudentDiyaUserId,
                CollegeId = SistecTenantId,
                DepartmentId = CseDepartmentId,
                FullName = "Diya Patel",
                Email = "0176cs221021@sistec.ac.in",
                EnrollmentOrEmployeeCode = "0176CS221021",
                Role = UserRole.Student,
                PasswordHash = defaultHash,
                IsActivated = true,
                IsProjectCoordinator = false,
                IsActive = true,
                GitHubHandle = "diya-p"
            },
            new()
            {
                Id = StudentRohanUserId,
                CollegeId = SistecTenantId,
                DepartmentId = CseDepartmentId,
                FullName = "Rohan Verma",
                Email = "rohan.verma@sistec.ac.in",
                EnrollmentOrEmployeeCode = "0176CS221088",
                Role = UserRole.Student,
                PasswordHash = null,
                IsActivated = false,
                IsProjectCoordinator = false,
                IsActive = true
            }
        };

        await context.Users.AddRangeAsync(users);
        await context.SaveChangesAsync();

        // Update HOD link on CSE department
        var cse = await context.Departments.IgnoreQueryFilters().FirstOrDefaultAsync(d => d.Id == CseDepartmentId);
        if (cse != null)
        {
            cse.HodUserId = HodSharmaUserId;
            await context.SaveChangesAsync();
        }
    }

    private static async Task SeedAcademicTracksAsync(ProjectHubDbContext context)
    {
        // 1. College-level overarching session (DepartmentId == null) opened by CollegeAdmin
        if (!await context.AcademicTracks.IgnoreQueryFilters().AnyAsync(t => t.CollegeId == SistecTenantId && t.AcademicYear == "2026-2027" && t.DepartmentId == null))
        {
            var collegeSession = new AcademicTrack
            {
                Id = CollegeSessionTrackId,
                CollegeId = SistecTenantId,
                DepartmentId = null,
                AllowInterdisciplinaryTeams = true,
                Name = "Institutional Academic Session",
                AcademicYear = "2026-2027",
                IsActive = true,
                ProposalDeadlineUtc = new DateTime(2026, 9, 30, 23, 59, 59, DateTimeKind.Utc),
                FinalSubmissionDeadlineUtc = new DateTime(2027, 5, 31, 23, 59, 59, DateTimeKind.Utc),
                GuideWeightPct = 30,
                MidTermWeightPct = 30,
                FinalVivaWeightPct = 40,
                SharedProjectRubricPct = 60,
                IndividualStudentRubricPct = 40
            };
            collegeSession.ValidateWeights();
            await context.AcademicTracks.AddAsync(collegeSession);
        }

        // 2. Department-level active project track (DepartmentId != null) launched by CSE HOD
        if (!await context.AcademicTracks.IgnoreQueryFilters().AnyAsync(t => t.CollegeId == SistecTenantId && t.Name == "Minor Project" && t.DepartmentId == CseDepartmentId))
        {
            var minorTrack = new AcademicTrack
            {
                Id = MinorTrackId,
                CollegeId = SistecTenantId,
                DepartmentId = CseDepartmentId,
                AllowInterdisciplinaryTeams = false,
                Name = "Minor Project",
                AcademicYear = "2025-2026",
                IsActive = true,
                ProposalDeadlineUtc = new DateTime(2026, 3, 31, 23, 59, 59, DateTimeKind.Utc),
                FinalSubmissionDeadlineUtc = new DateTime(2026, 5, 15, 23, 59, 59, DateTimeKind.Utc),
                GuideWeightPct = 30,
                MidTermWeightPct = 30,
                FinalVivaWeightPct = 40,
                SharedProjectRubricPct = 60,
                IndividualStudentRubricPct = 40
            };
            minorTrack.ValidateWeights();
            await context.AcademicTracks.AddAsync(minorTrack);
        }

        await context.SaveChangesAsync();
    }

    private static async Task SeedTeamAndArtifactsAsync(ProjectHubDbContext context)
    {
        if (await context.ProjectTeams.IgnoreQueryFilters().AnyAsync(t => t.CollegeId == SistecTenantId && t.TeamCode == "2026-CS-MIN-01")) return;

        var team = new ProjectTeam
        {
            Id = Team01Id,
            CollegeId = SistecTenantId,
            DepartmentId = CseDepartmentId,
            AcademicTrackId = MinorTrackId,
            ProjectLineageId = Guid.NewGuid(),
            TeamCode = "2026-CS-MIN-01",
            Title = "Smart IoT Energy Monitoring & Anomaly Detection for Campus Labs",
            Abstract = "A complete edge-to-cloud IoT telemetric pipeline reading real-time energy dissipation across 8 university lab circuits, utilizing LSTM regression models to detect abnormal voltage surges and automate power cutoffs.",
            DomainTag = "IoT & Cloud Infrastructure",
            SdgCode = "SDG-7",
            Status = ProjectStatus.ActiveBuild,
            GuideUserId = FacultyVermaUserId,
            RepoUrl = "https://github.com/sistec-cse/iot-energy-monitor",
            JiraBoardKey = "IEM",
            MissedLogStreak = 0,
            IsRosterLocked = true,
            SimilarityScorePct = 8.0m,
            SimilarProjectCode = "2025-CS-MAJ-14"
        };

        await context.ProjectTeams.AddAsync(team);

        // Members
        var members = new List<TeamMember>
        {
            new()
            {
                CollegeId = SistecTenantId,
                ProjectTeamId = Team01Id,
                UserId = StudentShivanshUserId,
                IsTeamLead = true,
                ModuleResponsibility = "Edge Firmware & Cloud Broker Integration",
                IsActive = true,
                JoinedAtUtc = DateTime.UtcNow.AddDays(-60)
            },
            new()
            {
                CollegeId = SistecTenantId,
                ProjectTeamId = Team01Id,
                UserId = StudentAaravUserId,
                IsTeamLead = false,
                ModuleResponsibility = "Time-Series ML Pipeline & Anomaly Alerts",
                IsActive = true,
                JoinedAtUtc = DateTime.UtcNow.AddDays(-60)
            },
            new()
            {
                CollegeId = SistecTenantId,
                ProjectTeamId = Team01Id,
                UserId = StudentDiyaUserId,
                IsTeamLead = false,
                ModuleResponsibility = "Next.js Institutional Dashboard & Analytics",
                IsActive = true,
                JoinedAtUtc = DateTime.UtcNow.AddDays(-60)
            }
        };

        await context.TeamMembers.AddRangeAsync(members);

        // 4 Artifact Slots
        var artifacts = new List<TeamArtifact>
        {
            new()
            {
                CollegeId = SistecTenantId,
                ProjectTeamId = Team01Id,
                SlotType = ArtifactSlotType.Synopsis,
                FileName = "2026-CS-MIN-01-Synopsis-Approved.pdf",
                StorageKey = "artifacts/2026-cs-min-01/synopsis.pdf",
                Sha256Checksum = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                FileSizeBytes = 1887436,
                Status = ArtifactStatus.Verified,
                UploadedByUserId = StudentShivanshUserId,
                VerifiedByUserId = FacultyVermaUserId,
                ReviewerNote = "Comprehensive scope, approved for hardware implementation."
            },
            new()
            {
                CollegeId = SistecTenantId,
                ProjectTeamId = Team01Id,
                SlotType = ArtifactSlotType.MidTermPPT,
                FileName = "2026-CS-MIN-01-MidTerm-Deck.pptx",
                StorageKey = "artifacts/2026-cs-min-01/midterm.pptx",
                Sha256Checksum = "a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e",
                FileSizeBytes = 14889779,
                Status = ArtifactStatus.Verified,
                UploadedByUserId = StudentShivanshUserId,
                VerifiedByUserId = FacultyVermaUserId,
                ReviewerNote = "Demonstrated live MQTT stream on hardware bench."
            },
            new()
            {
                CollegeId = SistecTenantId,
                ProjectTeamId = Team01Id,
                SlotType = ArtifactSlotType.PlagiarismReport,
                FileName = "Turnitin-Originality-8pct.pdf",
                StorageKey = "artifacts/2026-cs-min-01/plagiarism.pdf",
                Sha256Checksum = "2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae",
                FileSizeBytes = 634880,
                Status = ArtifactStatus.Verified,
                UploadedByUserId = StudentShivanshUserId,
                VerifiedByUserId = FacultyVermaUserId,
                ReviewerNote = "8% similarity within acceptable institutional limits (<10%)."
            },
            new()
            {
                CollegeId = SistecTenantId,
                ProjectTeamId = Team01Id,
                SlotType = ArtifactSlotType.FinalThesis,
                FileName = "2026-CS-MIN-01-FinalThesis-Draft.pdf",
                StorageKey = "artifacts/2026-cs-min-01/thesis.pdf",
                Sha256Checksum = "fcde2b2edba56bf408601fb721fe9b5c338d10ee429ea04fae5511b68fbf8fb9",
                FileSizeBytes = 0,
                Status = ArtifactStatus.Missing,
                UploadedByUserId = StudentShivanshUserId,
                ReviewerNote = null
            }
        };

        await context.TeamArtifacts.AddRangeAsync(artifacts);

        // Weekly Logbooks (Friday submissions)
        var weeklyLogs = new List<WeeklyLogbook>
        {
            new()
            {
                CollegeId = SistecTenantId,
                ProjectTeamId = Team01Id,
                AuthorUserId = StudentShivanshUserId,
                WeekNumber = 4,
                AccomplishmentsSummary = "Configured ESP32 firmware with MQTT publisher and completed breadboard soldering for CT sensors in Computer Lab 3.",
                BlockersSummary = "Minor ADC non-linearity at low amperages; resolved via polynomial calibration curves.",
                HoursLogged = 14m,
                GitCommitCount = 6,
                IsVerified = true,
                VerifiedByUserId = FacultyVermaUserId,
                VerifiedAtUtc = DateTime.UtcNow.AddDays(-10),
                MentorRemarks = "Good progress on hardware calibration. Proceed with the stress test."
            },
            new()
            {
                CollegeId = SistecTenantId,
                ProjectTeamId = Team01Id,
                AuthorUserId = StudentAaravUserId,
                WeekNumber = 5,
                AccomplishmentsSummary = "Developed initial PyTorch LSTM autoencoder for abnormal energy draw detection; validated on test dataset.",
                BlockersSummary = "Dataset class imbalance with sparse abnormal spikes.",
                HoursLogged = 16m,
                GitCommitCount = 8,
                IsVerified = false // Pending Friday log
            }
        };

        await context.WeeklyLogbooks.AddRangeAsync(weeklyLogs);
        await context.SaveChangesAsync();
    }

    /// <summary>
    /// Displays a formatted startup table in the console log of all 7 seeded role accounts with working credentials.
    /// </summary>
    public static void PrintSeededAccountsTable()
    {
        Console.WriteLine();
        Console.ForegroundColor = ConsoleColor.DarkGreen;
        Console.WriteLine("====================================================================================================");
        Console.WriteLine("                        COLLABEX - SEEDED ROLE ACCOUNTS (Password: Pass@1234)                       ");
        Console.WriteLine("====================================================================================================");
        Console.ResetColor();
        Console.WriteLine(string.Format("{0,-20} {1,-28} {2,-30} {3}", "ROLE", "NAME", "EMAIL", "DESIGNATION"));
        Console.WriteLine(new string('-', 100));
        Console.WriteLine(string.Format("{0,-20} {1,-28} {2,-30} {3}", "SuperAdmin", "Dev Startup Admin", "admin@projecthub.in", "Platform Administrator"));
        Console.WriteLine(string.Format("{0,-20} {1,-28} {2,-30} {3}", "CollegeAdmin", "Dr. Keshvendra Choudhary", "principal@sistec.ac.in", "Campus Principal / Dean"));
        Console.WriteLine(string.Format("{0,-20} {1,-28} {2,-30} {3}", "HOD", "Dr. Ravindra Kumar Sharma", "hod.cse@sistec.ac.in", "Head of Dept (CSE)"));
        Console.WriteLine(string.Format("{0,-20} {1,-28} {2,-30} {3}", "ProjectCoordinator", "Prof. Priya Nair", "priya.nair@sistec.ac.in", "Project Coordinator"));
        Console.WriteLine(string.Format("{0,-20} {1,-28} {2,-30} {3}", "FacultyGuide", "Prof. S. K. Verma", "sk.verma@sistec.ac.in", "Faculty Mentor / Guide"));
        Console.WriteLine(string.Format("{0,-20} {1,-28} {2,-30} {3}", "TeamLead", "Shivansh Mehra", "0176cs221045@sistec.ac.in", "Student Team Lead"));
        Console.WriteLine(string.Format("{0,-20} {1,-28} {2,-30} {3}", "Student", "Aarav Sharma", "0176cs221002@sistec.ac.in", "Student Team Member"));
        Console.ForegroundColor = ConsoleColor.DarkGreen;
        Console.WriteLine("====================================================================================================");
        Console.ResetColor();
        Console.WriteLine();
    }
}

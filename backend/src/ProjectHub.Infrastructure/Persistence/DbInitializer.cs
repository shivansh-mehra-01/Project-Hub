
using Microsoft.EntityFrameworkCore;
using ProjectHub.Application.Interfaces;
using ProjectHub.Domain.Entities;
using ProjectHub.Domain.Entities.Master;
using ProjectHub.Domain.Enums;

namespace ProjectHub.Infrastructure.Persistence;

/// <summary>
/// Idempotent production database seeder for Project Hub.
/// Seeds platform catalogs, RGPV Master Academic Catalog, tenants, academic hierarchies,
/// departments, personas, tracks, teams, artifacts, and weekly logs.
/// </summary>
public static class DbInitializer
{
    // Deterministic Tenant IDs
    public static readonly Guid SistecTenantId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    public static readonly Guid BmsceTenantId = Guid.Parse("22222222-2222-2222-2222-222222222222");
    public static readonly Guid RvceTenantId = Guid.Parse("33333333-3333-3333-3333-333333333333");

    // Deterministic Master University & Scheme IDs
    public static readonly Guid RgpvUniversityId = Guid.Parse("00000000-0000-0000-0001-000000000001");
    public static readonly Guid RgpvCbcsSchemeId = Guid.Parse("00000000-0000-0000-0002-000000000001");
    public static readonly Guid RgpvAicteFlexSchemeId = Guid.Parse("00000000-0000-0000-0002-000000000002");
    public static readonly Guid RgpvPciSchemeId = Guid.Parse("00000000-0000-0000-0002-000000000003");
    public static readonly Guid RgpvDiplomaSchemeId = Guid.Parse("00000000-0000-0000-0002-000000000004");

    // Deterministic Master Program IDs
    public static readonly Guid BTechProgramId = Guid.Parse("00000000-0000-0000-0003-000000000001");
    public static readonly Guid BPharmProgramId = Guid.Parse("00000000-0000-0000-0003-000000000002");
    public static readonly Guid BArchProgramId = Guid.Parse("00000000-0000-0000-0003-000000000003");
    public static readonly Guid MTechProgramId = Guid.Parse("00000000-0000-0000-0003-000000000004");
    public static readonly Guid McaProgramId = Guid.Parse("00000000-0000-0000-0003-000000000005");
    public static readonly Guid MbaProgramId = Guid.Parse("00000000-0000-0000-0003-000000000006");
    public static readonly Guid MPharmProgramId = Guid.Parse("00000000-0000-0000-0003-000000000007");
    public static readonly Guid DiplomaProgramId = Guid.Parse("00000000-0000-0000-0003-000000000008");
    public static readonly Guid DPharmProgramId = Guid.Parse("00000000-0000-0000-0003-000000000009");

    // Deterministic SISTec Department IDs
    public static readonly Guid CseDepartmentId = Guid.Parse("10000000-0000-0000-0000-000000000001");
    public static readonly Guid EceDepartmentId = Guid.Parse("10000000-0000-0000-0000-000000000002");
    public static readonly Guid MeDepartmentId = Guid.Parse("10000000-0000-0000-0000-000000000003");
    public static readonly Guid CeDepartmentId = Guid.Parse("10000000-0000-0000-0000-000000000004");

    // Deterministic SISTec Academic Hierarchy IDs
    public static readonly Guid SistecSession2026Id = Guid.Parse("50000000-0000-0000-0000-000000000001");
    public static readonly Guid SistecBTechCourseProgramId = Guid.Parse("50000000-0000-0000-0000-000000000002");
    public static readonly Guid SistecMTechCourseProgramId = Guid.Parse("50000000-0000-0000-0000-000000000003");
    public static readonly Guid SistecMbaCourseProgramId = Guid.Parse("50000000-0000-0000-0000-000000000004");
    public static readonly Guid SistecMcaCourseProgramId = Guid.Parse("50000000-0000-0000-0000-000000000005");
    public static readonly Guid SistecAicteFlexSchemeId = Guid.Parse("50000000-0000-0000-0000-000000000006");
    public static readonly Guid SistecCseSem6TermId = Guid.Parse("50000000-0000-0000-0000-000000000007");
    public static readonly Guid SistecCseSem7TermId = Guid.Parse("50000000-0000-0000-0000-000000000008");
    public static readonly Guid SistecCseMinorProjectOfferingId = Guid.Parse("50000000-0000-0000-0000-000000000009");
    public static readonly Guid SistecCseMajorProjectOfferingId = Guid.Parse("50000000-0000-0000-0000-000000000010");

    // Deterministic User Persona IDs
    public static readonly Guid SuperAdminUserId = Guid.Parse("20000000-0000-0000-0000-000000000000");
    public static readonly Guid SuperAdminCollabexUserId = Guid.Parse("20000000-0000-0000-0000-000000000099");
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
            await SeedRgpvMasterCatalogAsync(context);
            await SeedTenantsAsync(context);
            await SeedDepartmentsAsync(context);
            await SeedPersonasAsync(context);
            await SeedSistecAcademicHierarchyAsync(context);
            await SeedAcademicTracksAsync(context);
            await SeedTeamAndArtifactsAsync(context);
            await SeedPlatformAuditLogsAsync(context);

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
            new() { SdgNumber = 8, Code = "SDG-8", Title = "Decent Work and Economic Growth", Description = "Promote sustained, inclusive and sustainable economic growth, full and productive employment." },
            new() { SdgNumber = 9, Code = "SDG-9", Title = "Industry, Innovation and Infrastructure", Description = "Build resilient infrastructure, promote inclusive and sustainable industrialization." },
            new() { SdgNumber = 10, Code = "SDG-10", Title = "Reduced Inequalities", Description = "Reduce inequality within and among countries." },
            new() { SdgNumber = 11, Code = "SDG-11", Title = "Sustainable Cities and Communities", Description = "Make cities and human settlements inclusive, safe, resilient and sustainable." },
            new() { SdgNumber = 12, Code = "SDG-12", Title = "Responsible Consumption and Production", Description = "Ensure sustainable consumption and production patterns." },
            new() { SdgNumber = 13, Code = "SDG-13", Title = "Climate Action", Description = "Take urgent action to combat climate change and its impacts." },
            new() { SdgNumber = 14, Code = "SDG-14", Title = "Life Below Water", Description = "Conserve and sustainably use the oceans, seas and marine resources for sustainable development." },
            new() { SdgNumber = 15, Code = "SDG-15", Title = "Life on Land", Description = "Protect, restore and promote sustainable use of terrestrial ecosystems." },
            new() { SdgNumber = 16, Code = "SDG-16", Title = "Peace, Justice and Strong Institutions", Description = "Promote peaceful and inclusive societies for sustainable development." },
            new() { SdgNumber = 17, Code = "SDG-17", Title = "Partnerships for the Goals", Description = "Strengthen the means of implementation and revitalize the Global Partnership." }
        };

        await context.MasterSdgCatalogs.AddRangeAsync(sdgs);
        await context.SaveChangesAsync();
    }

    /// <summary>
    /// Seeds the complete RGPV University Master Catalog with Schemes, UG/PG/Diploma Programs,
    /// all 19 Core + 6 Emerging B.Tech branches, Pharmacy, Architecture, M.Tech, MCA, MBA, and Subject Templates.
    /// </summary>
    public static async Task SeedRgpvMasterCatalogAsync(ProjectHubDbContext context)
    {
        if (await context.MasterUniversities.IgnoreQueryFilters().AnyAsync(u => u.Code == "RGPV"))
            return;

        // 1. Master University: RGPV
        var rgpv = new MasterUniversity
        {
            Id = RgpvUniversityId,
            Code = "RGPV",
            Name = "Rajiv Gandhi Proudyogiki Vishwavidyalaya",
            State = "Madhya Pradesh",
            IsActive = true
        };
        await context.MasterUniversities.AddAsync(rgpv);

        // 2. Master Curriculum Schemes
        var schemes = new List<MasterCurriculumScheme>
        {
            new() { Id = RgpvCbcsSchemeId, UniversityId = RgpvUniversityId, Code = "RGPV-CBCS", Name = "Choice Based Credit System (CBCS)", EffectiveFromYear = 2018 },
            new() { Id = RgpvAicteFlexSchemeId, UniversityId = RgpvUniversityId, Code = "RGPV-AICTE-FLEX", Name = "AICTE Flexible Curriculum Model", EffectiveFromYear = 2022 },
            new() { Id = RgpvPciSchemeId, UniversityId = RgpvUniversityId, Code = "RGPV-PCI", Name = "Pharmacy Council of India (PCI) Regulation Scheme", EffectiveFromYear = 2020 },
            new() { Id = RgpvDiplomaSchemeId, UniversityId = RgpvUniversityId, Code = "RGPV-DIPLOMA", Name = "Directorate of Technical Education MP Diploma Scheme", EffectiveFromYear = 2021 }
        };
        await context.MasterCurriculumSchemes.AddRangeAsync(schemes);

        // 3. Master Programs
        var programs = new List<MasterProgram>
        {
            new() { Id = BTechProgramId, UniversityId = RgpvUniversityId, Level = AcademicProgramLevel.UG, Code = "BTECH", Name = "Bachelor of Technology (B.Tech)", DurationYears = 4, TotalSemesters = 8 },
            new() { Id = BPharmProgramId, UniversityId = RgpvUniversityId, Level = AcademicProgramLevel.UG, Code = "BPHARM", Name = "Bachelor of Pharmacy (B.Pharm)", DurationYears = 4, TotalSemesters = 8 },
            new() { Id = BArchProgramId, UniversityId = RgpvUniversityId, Level = AcademicProgramLevel.UG, Code = "BARCH", Name = "Bachelor of Architecture (B.Arch)", DurationYears = 5, TotalSemesters = 10 },
            new() { Id = MTechProgramId, UniversityId = RgpvUniversityId, Level = AcademicProgramLevel.PG, Code = "MTECH", Name = "Master of Technology (M.Tech)", DurationYears = 2, TotalSemesters = 4 },
            new() { Id = McaProgramId, UniversityId = RgpvUniversityId, Level = AcademicProgramLevel.PG, Code = "MCA", Name = "Master of Computer Applications (MCA)", DurationYears = 2, TotalSemesters = 4 },
            new() { Id = MbaProgramId, UniversityId = RgpvUniversityId, Level = AcademicProgramLevel.PG, Code = "MBA", Name = "Master of Business Administration (MBA)", DurationYears = 2, TotalSemesters = 4 },
            new() { Id = MPharmProgramId, UniversityId = RgpvUniversityId, Level = AcademicProgramLevel.PG, Code = "MPHARM", Name = "Master of Pharmacy (M.Pharm)", DurationYears = 2, TotalSemesters = 4 },
            new() { Id = DiplomaProgramId, UniversityId = RgpvUniversityId, Level = AcademicProgramLevel.Diploma, Code = "DIPLOMA", Name = "Diploma in Engineering", DurationYears = 3, TotalSemesters = 6 },
            new() { Id = DPharmProgramId, UniversityId = RgpvUniversityId, Level = AcademicProgramLevel.Diploma, Code = "DPHARM", Name = "Diploma in Pharmacy (D.Pharm)", DurationYears = 2, TotalSemesters = 4 }
        };
        await context.MasterPrograms.AddRangeAsync(programs);
        await context.SaveChangesAsync();

        // 4. Master Branches
        var branches = new List<MasterBranch>();
        var templates = new List<MasterSubjectTemplate>();

        // (A) B.Tech: 19 Core Branches + 6 Emerging Specializations
        var btechBranches = new (string Code, string Name, string Category)[]
        {
            // 19 Core Branches
            ("CSE", "Computer Science & Engineering", "Core"),
            ("IT", "Information Technology", "Core"),
            ("EC", "Electronics & Communication Engineering", "Core"),
            ("EE", "Electrical Engineering", "Core"),
            ("EX", "Electrical & Electronics Engineering", "Core"),
            ("ME", "Mechanical Engineering", "Core"),
            ("CE", "Civil Engineering", "Core"),
            ("AU", "Automobile Engineering", "Core"),
            ("CH", "Chemical Engineering", "Core"),
            ("BM", "Biomedical Engineering", "Core"),
            ("BT", "Biotechnology", "Core"),
            ("AEI", "Applied Electronics & Instrumentation", "Core"),
            ("EN", "Environmental Engineering", "Core"),
            ("FT", "Fire Technology & Safety", "Core"),
            ("IEM", "Industrial Engineering & Management", "Core"),
            ("IP", "Industrial & Production Engineering", "Core"),
            ("MI", "Mining Engineering", "Core"),
            ("PC", "Petrochemical Engineering", "Core"),
            ("TX", "Textile Engineering", "Core"),
            // 6 Emerging Specializations
            ("AIML", "Computer Science & Engg (Artificial Intelligence & Machine Learning)", "Emerging"),
            ("CS-DS", "Computer Science & Engg (Data Science)", "Emerging"),
            ("CS-CS", "Computer Science & Engg (Cyber Security)", "Emerging"),
            ("CS-IoT", "Computer Science & Engg (Internet of Things)", "Emerging"),
            ("CSBS", "Computer Science & Business Systems", "Emerging"),
            ("RAI", "Robotics & Artificial Intelligence", "Emerging")
        };

        foreach (var b in btechBranches)
        {
            var branch = new MasterBranch
            {
                Id = Guid.CreateVersion7(),
                MasterProgramId = BTechProgramId,
                Code = b.Code,
                Name = b.Name,
                Category = b.Category,
                IsActive = true
            };
            branches.Add(branch);

            // Standard RGPV Project Subject Templates for B.Tech
            // Sem 6: Minor Project
            templates.Add(new MasterSubjectTemplate
            {
                MasterBranchId = branch.Id,
                SchemeId = RgpvAicteFlexSchemeId,
                SemesterNumber = 6,
                SubjectCode = $"{b.Code}-606",
                SubjectName = "Minor Project",
                SubjectType = SubjectType.MinorProject,
                DefaultParticipationMode = ParticipationMode.Team,
                DefaultMinTeamSize = 2,
                DefaultMaxTeamSize = 4,
                MaxInternalMarks = 60,
                MaxExternalMarks = 40
            });

            // Sem 7: Major Project Phase-I
            templates.Add(new MasterSubjectTemplate
            {
                MasterBranchId = branch.Id,
                SchemeId = RgpvAicteFlexSchemeId,
                SemesterNumber = 7,
                SubjectCode = $"{b.Code}-705",
                SubjectName = "Major Project Phase-I",
                SubjectType = SubjectType.MajorProject,
                DefaultParticipationMode = ParticipationMode.Team,
                DefaultMinTeamSize = 2,
                DefaultMaxTeamSize = 4,
                MaxInternalMarks = 60,
                MaxExternalMarks = 40
            });

            // Sem 7: Industrial Internship
            templates.Add(new MasterSubjectTemplate
            {
                MasterBranchId = branch.Id,
                SchemeId = RgpvAicteFlexSchemeId,
                SemesterNumber = 7,
                SubjectCode = $"{b.Code}-706",
                SubjectName = "Industrial Training / Internship",
                SubjectType = SubjectType.Internship,
                DefaultParticipationMode = ParticipationMode.Individual,
                DefaultMinTeamSize = 1,
                DefaultMaxTeamSize = 1,
                MaxInternalMarks = 50,
                MaxExternalMarks = 50
            });

            // Sem 8: Major Project Phase-II
            templates.Add(new MasterSubjectTemplate
            {
                MasterBranchId = branch.Id,
                SchemeId = RgpvAicteFlexSchemeId,
                SemesterNumber = 8,
                SubjectCode = $"{b.Code}-805",
                SubjectName = "Major Project Phase-II",
                SubjectType = SubjectType.MajorProject,
                DefaultParticipationMode = ParticipationMode.Team,
                DefaultMinTeamSize = 2,
                DefaultMaxTeamSize = 4,
                MaxInternalMarks = 60,
                MaxExternalMarks = 40
            });
        }

        // (B) B.Pharm
        var bpharmBranch = new MasterBranch
        {
            Id = Guid.CreateVersion7(),
            MasterProgramId = BPharmProgramId,
            Code = "PHARM",
            Name = "Pharmacy",
            Category = "Pharmacy"
        };
        branches.Add(bpharmBranch);
        templates.Add(new MasterSubjectTemplate
        {
            MasterBranchId = bpharmBranch.Id,
            SchemeId = RgpvPciSchemeId,
            SemesterNumber = 8,
            SubjectCode = "BP-801",
            SubjectName = "Project Work",
            SubjectType = SubjectType.MajorProject,
            DefaultParticipationMode = ParticipationMode.Individual,
            DefaultMinTeamSize = 1,
            DefaultMaxTeamSize = 2,
            MaxInternalMarks = 60,
            MaxExternalMarks = 40
        });

        // (C) B.Arch
        var barchBranch = new MasterBranch
        {
            Id = Guid.CreateVersion7(),
            MasterProgramId = BArchProgramId,
            Code = "ARCH",
            Name = "Architecture",
            Category = "Core"
        };
        branches.Add(barchBranch);
        templates.Add(new MasterSubjectTemplate
        {
            MasterBranchId = barchBranch.Id,
            SemesterNumber = 10,
            SubjectCode = "AR-1001",
            SubjectName = "Architectural Thesis & Project",
            SubjectType = SubjectType.MajorProject,
            DefaultParticipationMode = ParticipationMode.Individual,
            DefaultMinTeamSize = 1,
            DefaultMaxTeamSize = 1,
            MaxInternalMarks = 50,
            MaxExternalMarks = 50
        });

        // (D) M.Tech Branches
        var mtechBranches = new (string Code, string Name, string Category)[]
        {
            ("CSE", "Computer Science & Engineering", "Core"),
            ("AI", "Artificial Intelligence", "Emerging"),
            ("DS", "Data Science", "Emerging"),
            ("CS", "Cyber Security", "Emerging"),
            ("SE", "Software Engineering", "Core"),
            ("VLSI", "VLSI Design & Embedded Systems", "Core"),
            ("DC", "Digital Communication", "Core"),
            ("PS", "Power Systems", "Core"),
            ("STE", "Structural Engineering", "Core"),
            ("THE", "Thermal Engineering", "Core"),
            ("MD", "Machine Design", "Core")
        };
        foreach (var mb in mtechBranches)
        {
            var branch = new MasterBranch
            {
                Id = Guid.CreateVersion7(),
                MasterProgramId = MTechProgramId,
                Code = mb.Code,
                Name = mb.Name,
                Category = mb.Category
            };
            branches.Add(branch);

            templates.Add(new MasterSubjectTemplate
            {
                MasterBranchId = branch.Id,
                SemesterNumber = 3,
                SubjectCode = $"MT-{mb.Code}-301",
                SubjectName = "Dissertation Phase-I",
                SubjectType = SubjectType.Dissertation,
                DefaultParticipationMode = ParticipationMode.Individual,
                DefaultMinTeamSize = 1,
                DefaultMaxTeamSize = 1,
                MaxInternalMarks = 100,
                MaxExternalMarks = 100
            });
            templates.Add(new MasterSubjectTemplate
            {
                MasterBranchId = branch.Id,
                SemesterNumber = 4,
                SubjectCode = $"MT-{mb.Code}-401",
                SubjectName = "Dissertation Phase-II",
                SubjectType = SubjectType.Dissertation,
                DefaultParticipationMode = ParticipationMode.Individual,
                DefaultMinTeamSize = 1,
                DefaultMaxTeamSize = 1,
                MaxInternalMarks = 100,
                MaxExternalMarks = 100
            });
        }

        // (E) MCA
        var mcaBranch = new MasterBranch
        {
            Id = Guid.CreateVersion7(),
            MasterProgramId = McaProgramId,
            Code = "MCA",
            Name = "Master of Computer Applications",
            Category = "ComputerApplications"
        };
        branches.Add(mcaBranch);
        templates.Add(new MasterSubjectTemplate
        {
            MasterBranchId = mcaBranch.Id,
            SemesterNumber = 4,
            SubjectCode = "MCA-401",
            SubjectName = "Major Project & Industrial Internship",
            SubjectType = SubjectType.MajorProject,
            DefaultParticipationMode = ParticipationMode.Team,
            DefaultMinTeamSize = 1,
            DefaultMaxTeamSize = 2,
            MaxInternalMarks = 60,
            MaxExternalMarks = 40
        });

        // (F) MBA
        var mbaBranches = new (string Code, string Name)[]
        {
            ("FIN", "Financial Management"),
            ("MKT", "Marketing Management"),
            ("HR", "Human Resource Management"),
            ("OPS", "Operations & Supply Chain"),
            ("BA", "Business Analytics"),
            ("IT", "Information Technology Management")
        };
        foreach (var mba in mbaBranches)
        {
            var branch = new MasterBranch
            {
                Id = Guid.CreateVersion7(),
                MasterProgramId = MbaProgramId,
                Code = mba.Code,
                Name = mba.Name,
                Category = "Management"
            };
            branches.Add(branch);
            templates.Add(new MasterSubjectTemplate
            {
                MasterBranchId = branch.Id,
                SemesterNumber = 3,
                SubjectCode = $"MBA-{mba.Code}-301",
                SubjectName = "Summer Internship Project",
                SubjectType = SubjectType.Internship,
                DefaultParticipationMode = ParticipationMode.Individual,
                DefaultMinTeamSize = 1,
                DefaultMaxTeamSize = 1,
                MaxInternalMarks = 50,
                MaxExternalMarks = 50
            });
            templates.Add(new MasterSubjectTemplate
            {
                MasterBranchId = branch.Id,
                SemesterNumber = 4,
                SubjectCode = $"MBA-{mba.Code}-401",
                SubjectName = "Major Research Project",
                SubjectType = SubjectType.MajorProject,
                DefaultParticipationMode = ParticipationMode.Individual,
                DefaultMinTeamSize = 1,
                DefaultMaxTeamSize = 1,
                MaxInternalMarks = 60,
                MaxExternalMarks = 40
            });
        }

        // (G) M.Pharm
        var mpharmBranches = new[] { ("PHARMA", "Pharmaceutics"), ("PHARMCOL", "Pharmacology"), ("QAS", "Quality Assurance") };
        foreach (var mp in mpharmBranches)
        {
            var branch = new MasterBranch
            {
                Id = Guid.CreateVersion7(),
                MasterProgramId = MPharmProgramId,
                Code = mp.Item1,
                Name = mp.Item2,
                Category = "Pharmacy"
            };
            branches.Add(branch);
            templates.Add(new MasterSubjectTemplate
            {
                MasterBranchId = branch.Id,
                SchemeId = RgpvPciSchemeId,
                SemesterNumber = 4,
                SubjectCode = $"MP-{mp.Item1}-401",
                SubjectName = "Research Work and Colloquium",
                SubjectType = SubjectType.Dissertation,
                DefaultParticipationMode = ParticipationMode.Individual,
                DefaultMinTeamSize = 1,
                DefaultMaxTeamSize = 1,
                MaxInternalMarks = 100,
                MaxExternalMarks = 100
            });
        }

        // (H) Diploma Engineering
        var diplomaBranches = new[] { "CSE", "IT", "ME", "CE", "EE", "EC" };
        foreach (var d in diplomaBranches)
        {
            var branch = new MasterBranch
            {
                Id = Guid.CreateVersion7(),
                MasterProgramId = DiplomaProgramId,
                Code = d,
                Name = $"Diploma in {d}",
                Category = "Core"
            };
            branches.Add(branch);
            templates.Add(new MasterSubjectTemplate
            {
                MasterBranchId = branch.Id,
                SchemeId = RgpvDiplomaSchemeId,
                SemesterNumber = 5,
                SubjectCode = $"DIP-{d}-501",
                SubjectName = "Minor Project",
                SubjectType = SubjectType.MinorProject,
                DefaultParticipationMode = ParticipationMode.Team,
                DefaultMinTeamSize = 2,
                DefaultMaxTeamSize = 4,
                MaxInternalMarks = 50,
                MaxExternalMarks = 50
            });
            templates.Add(new MasterSubjectTemplate
            {
                MasterBranchId = branch.Id,
                SchemeId = RgpvDiplomaSchemeId,
                SemesterNumber = 6,
                SubjectCode = $"DIP-{d}-601",
                SubjectName = "Major Project",
                SubjectType = SubjectType.MajorProject,
                DefaultParticipationMode = ParticipationMode.Team,
                DefaultMinTeamSize = 2,
                DefaultMaxTeamSize = 4,
                MaxInternalMarks = 60,
                MaxExternalMarks = 40
            });
        }

        // (I) D.Pharm
        var dpharmBranch = new MasterBranch
        {
            Id = Guid.CreateVersion7(),
            MasterProgramId = DPharmProgramId,
            Code = "DPHARM",
            Name = "Diploma in Pharmacy",
            Category = "Pharmacy"
        };
        branches.Add(dpharmBranch);
        templates.Add(new MasterSubjectTemplate
        {
            MasterBranchId = dpharmBranch.Id,
            SchemeId = RgpvPciSchemeId,
            SemesterNumber = 2,
            SubjectCode = "DP-201",
            SubjectName = "Hospital Training / Practical Project",
            SubjectType = SubjectType.Internship,
            DefaultParticipationMode = ParticipationMode.Individual,
            DefaultMinTeamSize = 1,
            DefaultMaxTeamSize = 1,
            MaxInternalMarks = 50,
            MaxExternalMarks = 50
        });

        await context.MasterBranches.AddRangeAsync(branches);
        await context.MasterSubjectTemplates.AddRangeAsync(templates);
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
                MaxStudentSeats = 2500,
                StorageQuotaGb = 250,
                IsActive = true,
                EnforceStrictSso = true,
                CrestUrl = "https://images.unsplash.com/photo-1562774053-701939374585?w=128&q=80",
                SubscriptionExpiresAtUtc = DateTime.UtcNow.AddYears(2)
            },
            new()
            {
                Id = BmsceTenantId,
                Name = "BMS College of Engineering",
                TenantCode = "BMSCE",
                SsoDomain = "bmsce.ac.in",
                LicenseTier = LicenseTier.Standard,
                MaxStudentSeats = 1500,
                StorageQuotaGb = 150,
                IsActive = true,
                EnforceStrictSso = false,
                CrestUrl = "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=128&q=80",
                SubscriptionExpiresAtUtc = DateTime.UtcNow.AddYears(1)
            },
            new()
            {
                Id = RvceTenantId,
                Name = "RV College of Engineering",
                TenantCode = "RVCE",
                SsoDomain = "rvce.edu.in",
                LicenseTier = LicenseTier.Pilot,
                MaxStudentSeats = 500,
                StorageQuotaGb = 50,
                IsActive = true,
                EnforceStrictSso = true,
                CrestUrl = "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=128&q=80",
                SubscriptionExpiresAtUtc = DateTime.UtcNow.AddMonths(3)
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
                FullName = "Collabex Super Admin",
                Email = "admin@collabex.in",
                EnrollmentOrEmployeeCode = "EMP-SUPER-001",
                Role = UserRole.SuperAdmin,
                PasswordHash = defaultHash,
                IsActivated = true,
                IsProjectCoordinator = false,
                IsActive = true
            },
            new()
            {
                Id = Guid.Parse("20000000-0000-0000-0000-000000000099"),
                CollegeId = SistecTenantId, // partition default
                DepartmentId = null,
                FullName = "Dev Startup Admin",
                Email = "admin@projecthub.in",
                EnrollmentOrEmployeeCode = "EMP-SUPER-002",
                Role = UserRole.SuperAdmin,
                PasswordHash = defaultHash,
                IsActivated = true,
                IsProjectCoordinator = false,
                IsActive = true
            },
            new()
            {
                Id = SuperAdminCollabexUserId,
                CollegeId = SistecTenantId,
                DepartmentId = null,
                FullName = "Dev Startup Admin",
                Email = "admin@collabex.in",
                EnrollmentOrEmployeeCode = "EMP-SUPER-002",
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
                EnrollmentOrEmployeeCode = "EMP-SISTEC-001",
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
                EnrollmentOrEmployeeCode = "EMP-CSE-042",
                Role = UserRole.Faculty,
                PasswordHash = defaultHash,
                IsActivated = true,
                IsProjectCoordinator = true, // Coordinator for CSE cohort
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
                EnrollmentOrEmployeeCode = "EMP-CSE-019",
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

    /// <summary>
    /// Seeds SISTec Bhopal academic hierarchy (Sessions, Programs, Schemes, Semesters, Offerings, Enrollments)
    /// importing RGPV standards and binding seamlessly to seeded entities.
    /// </summary>
    private static async Task SeedSistecAcademicHierarchyAsync(ProjectHubDbContext context)
    {
        // 1. Academic Session: 2026-27 (Institutional Academic Session Governance)
        var existingSession = await context.AcademicSessions.IgnoreQueryFilters().FirstOrDefaultAsync(s => s.CollegeId == SistecTenantId && (s.Label == "2026-27" || s.Label == "2026–2027"));
        if (existingSession == null)
        {
            var session = new AcademicSession
            {
                Id = SistecSession2026Id,
                CollegeId = SistecTenantId,
                Label = "2026–2027",
                StartDate = new DateTime(2026, 7, 1, 0, 0, 0, DateTimeKind.Utc),
                EndDate = new DateTime(2027, 6, 30, 23, 59, 59, DateTimeKind.Utc),
                ExamCutoffDateUtc = new DateTime(2027, 5, 31, 23, 59, 59, DateTimeKind.Utc),
                AllowInterdisciplinaryTeams = true,
                IsActive = true
            };
            await context.AcademicSessions.AddAsync(session);
        }
        else
        {
            existingSession.ExamCutoffDateUtc ??= new DateTime(2027, 5, 31, 23, 59, 59, DateTimeKind.Utc);
            existingSession.AllowInterdisciplinaryTeams = true;
            existingSession.IsActive = true;
        }

        // 2. Course Programs: B.Tech, M.Tech, MBA, MCA
        if (!await context.CoursePrograms.IgnoreQueryFilters().AnyAsync(p => p.CollegeId == SistecTenantId && p.Code == "BTECH"))
        {
            var coursePrograms = new List<CourseProgram>
            {
                new() { Id = SistecBTechCourseProgramId, CollegeId = SistecTenantId, MasterProgramId = BTechProgramId, Level = AcademicProgramLevel.UG, Code = "BTECH", Name = "Bachelor of Technology", TotalSemesters = 8, IsActive = true },
                new() { Id = SistecMTechCourseProgramId, CollegeId = SistecTenantId, MasterProgramId = MTechProgramId, Level = AcademicProgramLevel.PG, Code = "MTECH", Name = "Master of Technology", TotalSemesters = 4, IsActive = true },
                new() { Id = SistecMbaCourseProgramId, CollegeId = SistecTenantId, MasterProgramId = MbaProgramId, Level = AcademicProgramLevel.PG, Code = "MBA", Name = "Master of Business Administration", TotalSemesters = 4, IsActive = true },
                new() { Id = SistecMcaCourseProgramId, CollegeId = SistecTenantId, MasterProgramId = McaProgramId, Level = AcademicProgramLevel.PG, Code = "MCA", Name = "Master of Computer Applications", TotalSemesters = 4, IsActive = true }
            };
            await context.CoursePrograms.AddRangeAsync(coursePrograms);
        }

        await context.SaveChangesAsync();

        // 3. Update Existing SISTec Departments to bind to B.Tech
        var depts = await context.Departments.IgnoreQueryFilters().Where(d => d.CollegeId == SistecTenantId).ToListAsync();
        foreach (var d in depts)
        {
            if (d.CourseProgramId == null)
            {
                d.CourseProgramId = SistecBTechCourseProgramId;
            }
        }
        await context.SaveChangesAsync();

        // 3b. Add Branches for MBA and MCA if not present
        if (!await context.Departments.IgnoreQueryFilters().AnyAsync(d => d.CollegeId == SistecTenantId && d.Code == "MBA-FIN"))
        {
            var mbaMcaDepts = new List<Department>
            {
                new() { Id = Guid.Parse("10000000-0000-0000-0000-000000000011"), CollegeId = SistecTenantId, CourseProgramId = SistecMbaCourseProgramId, Code = "MBA-FIN", Name = "MBA Finance", IntakeQuota = 60, IsSarAttested = true, SarAttestedAtUtc = DateTime.UtcNow.AddDays(-10) },
                new() { Id = Guid.Parse("10000000-0000-0000-0000-000000000012"), CollegeId = SistecTenantId, CourseProgramId = SistecMbaCourseProgramId, Code = "MBA-MKT", Name = "MBA Marketing", IntakeQuota = 60, IsSarAttested = true, SarAttestedAtUtc = DateTime.UtcNow.AddDays(-10) },
                new() { Id = Guid.Parse("10000000-0000-0000-0000-000000000013"), CollegeId = SistecTenantId, CourseProgramId = SistecMbaCourseProgramId, Code = "MBA-HR", Name = "MBA Human Resources", IntakeQuota = 60, IsSarAttested = false },
                new() { Id = Guid.Parse("10000000-0000-0000-0000-000000000021"), CollegeId = SistecTenantId, CourseProgramId = SistecMcaCourseProgramId, Code = "MCA-GEN", Name = "MCA General Software Development", IntakeQuota = 60, IsSarAttested = true, SarAttestedAtUtc = DateTime.UtcNow.AddDays(-5) },
                new() { Id = Guid.Parse("10000000-0000-0000-0000-000000000022"), CollegeId = SistecTenantId, CourseProgramId = SistecMcaCourseProgramId, Code = "MCA-SPEC", Name = "MCA Specialization (AI & Data Science)", IntakeQuota = 60, IsSarAttested = false },
            };
            await context.Departments.AddRangeAsync(mbaMcaDepts);
            await context.SaveChangesAsync();
        }

        // 4. Curriculum Scheme: RGPV-AICTE-FLEX 2022
        if (!await context.CurriculumSchemes.IgnoreQueryFilters().AnyAsync(s => s.CollegeId == SistecTenantId && s.SchemeCode == "RGPV-AICTE-FLEX"))
        {
            var scheme = new CurriculumScheme
            {
                Id = SistecAicteFlexSchemeId,
                CollegeId = SistecTenantId,
                CourseProgramId = SistecBTechCourseProgramId,
                SchemeCode = "RGPV-AICTE-FLEX",
                SchemeVersion = "2022",
                EffectiveAdmissionYear = 2022,
                IsActive = true
            };
            await context.CurriculumSchemes.AddAsync(scheme);
        }

        // 5. Semester Terms for CSE: Semester 6 (Even) and Semester 7 (Odd)
        if (!await context.SemesterTerms.IgnoreQueryFilters().AnyAsync(t => t.CollegeId == SistecTenantId && t.DepartmentId == CseDepartmentId && t.AcademicSessionId == SistecSession2026Id && t.SemesterNumber == 6))
        {
            var terms = new List<SemesterTerm>();
            if (!await context.SemesterTerms.IgnoreQueryFilters().AnyAsync(t => t.CollegeId == SistecTenantId && t.DepartmentId == CseDepartmentId && t.AcademicSessionId == SistecSession2026Id && t.SemesterNumber == 6))
            {
                terms.Add(new()
                {
                    Id = SistecCseSem6TermId,
                    CollegeId = SistecTenantId,
                    DepartmentId = CseDepartmentId,
                    AcademicSessionId = SistecSession2026Id,
                    SemesterNumber = 6,
                    SemesterName = "Semester 6",
                    Parity = SemesterParity.Even,
                    IsActive = true
                });
            }
            if (!await context.SemesterTerms.IgnoreQueryFilters().AnyAsync(t => t.CollegeId == SistecTenantId && t.DepartmentId == CseDepartmentId && t.AcademicSessionId == SistecSession2026Id && t.SemesterNumber == 7))
            {
                terms.Add(new()
                {
                    Id = SistecCseSem7TermId,
                    CollegeId = SistecTenantId,
                    DepartmentId = CseDepartmentId,
                    AcademicSessionId = SistecSession2026Id,
                    SemesterNumber = 7,
                    SemesterName = "Semester 7",
                    Parity = SemesterParity.Odd,
                    IsActive = true
                });
            }
            if (terms.Count > 0)
            {
                await context.SemesterTerms.AddRangeAsync(terms);
            }
        }

        await context.SaveChangesAsync();

        // 6. Subject Offerings for CSE Sem 6 & 7
        if (!await context.SubjectOfferings.IgnoreQueryFilters().AnyAsync(o => o.CollegeId == SistecTenantId && o.SubjectCode == "CS-606"))
        {
            var offerings = new List<SubjectOffering>
            {
                new()
                {
                    Id = SistecCseMinorProjectOfferingId,
                    CollegeId = SistecTenantId,
                    SemesterTermId = SistecCseSem6TermId,
                    CurriculumSchemeId = SistecAicteFlexSchemeId,
                    SubjectCode = "CS-606",
                    SubjectName = "Minor Project",
                    SubjectType = SubjectType.MinorProject,
                    Credits = 4,
                    InternalMaxMarks = 60,
                    ExternalMaxMarks = 40,
                    IsActive = true
                },
                new()
                {
                    Id = SistecCseMajorProjectOfferingId,
                    CollegeId = SistecTenantId,
                    SemesterTermId = SistecCseSem7TermId,
                    CurriculumSchemeId = SistecAicteFlexSchemeId,
                    SubjectCode = "CS-705",
                    SubjectName = "Major Project Phase-I",
                    SubjectType = SubjectType.MajorProject,
                    Credits = 4,
                    InternalMaxMarks = 60,
                    ExternalMaxMarks = 40,
                    IsActive = true
                }
            };
            await context.SubjectOfferings.AddRangeAsync(offerings);
        }

        // 7. Student Academic Enrollments for seeded student personas
        if (!await context.StudentAcademicEnrollments.IgnoreQueryFilters().AnyAsync(e => e.CollegeId == SistecTenantId && e.StudentUserId == StudentShivanshUserId))
        {
            var studentIds = new[] { StudentShivanshUserId, StudentAaravUserId, StudentDiyaUserId, StudentRohanUserId };
            var enrollments = studentIds.Select(sid => new StudentAcademicEnrollment
            {
                CollegeId = SistecTenantId,
                StudentUserId = sid,
                CourseProgramId = SistecBTechCourseProgramId,
                DepartmentId = CseDepartmentId,
                CurrentSemesterTermId = SistecCseSem6TermId,
                AdmissionBatch = "2023-2027",
                AcademicStatus = AcademicStatus.Active
            }).ToList();

            await context.StudentAcademicEnrollments.AddRangeAsync(enrollments);
        }

        await context.SaveChangesAsync();
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
                AcademicSessionId = SistecSession2026Id,
                CourseProgramId = SistecBTechCourseProgramId,
                AllowInterdisciplinaryTeams = true,
                AllowCrossBranchTeams = true,
                ParticipationMode = ParticipationMode.Team,
                EnrolmentMode = EnrolmentMode.Hybrid,
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
        var existingMinor = await context.AcademicTracks.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == MinorTrackId);
        if (existingMinor != null)
        {
            existingMinor.AcademicSessionId = SistecSession2026Id;
            existingMinor.CourseProgramId = SistecBTechCourseProgramId;
            existingMinor.SemesterTermId = SistecCseSem6TermId;
            existingMinor.SubjectOfferingId = SistecCseMinorProjectOfferingId;
            existingMinor.CurriculumSchemeId = SistecAicteFlexSchemeId;
            existingMinor.ParticipationMode = ParticipationMode.Team;
            existingMinor.EnrolmentMode = EnrolmentMode.SelfJoin;
            existingMinor.AllowCrossBranchTeams = false;
        }
        else if (!await context.AcademicTracks.IgnoreQueryFilters().AnyAsync(t => t.CollegeId == SistecTenantId && t.Name == "Minor Project" && t.DepartmentId == CseDepartmentId))
        {
            var minorTrack = new AcademicTrack
            {
                Id = MinorTrackId,
                CollegeId = SistecTenantId,
                DepartmentId = CseDepartmentId,
                AcademicSessionId = SistecSession2026Id,
                CourseProgramId = SistecBTechCourseProgramId,
                SemesterTermId = SistecCseSem6TermId,
                SubjectOfferingId = SistecCseMinorProjectOfferingId,
                CurriculumSchemeId = SistecAicteFlexSchemeId,
                ParticipationMode = ParticipationMode.Team,
                EnrolmentMode = EnrolmentMode.SelfJoin,
                AllowInterdisciplinaryTeams = false,
                AllowCrossBranchTeams = false,
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
            Title = "IoT-Based Campus Energy Management and Machine Predictive Maintenance System",
            Abstract = "An edge-computing ESP32 telemetry pipeline streaming current, voltage, and power metrics via MQTT into an anomaly detection inference engine, driving Criterion 3 NBA-compliant sustainable facility management.",
            DomainTag = "IoT & Embedded Systems",
            SdgCode = "SDG-7",
            Status = ProjectStatus.ActiveBuild,
            GuideUserId = FacultyVermaUserId,
            RepoUrl = "https://github.com/sistec-cse/iot-energy-monitor",
            JiraBoardKey = "IOT",
            IsRosterLocked = true,
            MissedLogStreak = 0,
            SimilarityScorePct = 8.4m
        };

        await context.ProjectTeams.AddAsync(team);

        var members = new List<TeamMember>
        {
            new() { Id = Guid.CreateVersion7(), CollegeId = SistecTenantId, ProjectTeamId = Team01Id, UserId = StudentShivanshUserId, IsTeamLead = true, ModuleResponsibility = "Edge Hardware, ESP32 FreeRTOS Firmware & MQTT Broker", IsActive = true },
            new() { Id = Guid.CreateVersion7(), CollegeId = SistecTenantId, ProjectTeamId = Team01Id, UserId = StudentAaravUserId, IsTeamLead = false, ModuleResponsibility = "Inference Pipeline & Machine Learning Analytics", IsActive = true },
            new() { Id = Guid.CreateVersion7(), CollegeId = SistecTenantId, ProjectTeamId = Team01Id, UserId = StudentDiyaUserId, IsTeamLead = false, ModuleResponsibility = "Full-Stack Dashboard UI & Data Visualizations", IsActive = true }
        };

        await context.TeamMembers.AddRangeAsync(members);

        // Sprint Tasks
        var tasks = new List<SprintTask>
        {
            new() { Id = Guid.CreateVersion7(), CollegeId = SistecTenantId, ProjectTeamId = Team01Id, Title = "Calibrate CT sensor analog outputs against RMS multimeter", CategoryTag = "Hardware", AssignedToUserId = StudentShivanshUserId, Status = SprintTaskStatus.Done, DueDateUtc = DateTime.UtcNow.AddDays(-14) },
            new() { Id = Guid.CreateVersion7(), CollegeId = SistecTenantId, ProjectTeamId = Team01Id, Title = "Implement JWT authentication interceptor for telemetry API", CategoryTag = "Backend", AssignedToUserId = StudentShivanshUserId, Status = SprintTaskStatus.Done, DueDateUtc = DateTime.UtcNow.AddDays(-7) },
            new() { Id = Guid.CreateVersion7(), CollegeId = SistecTenantId, ProjectTeamId = Team01Id, Title = "Train autoencoder on benchmark industrial current anomaly dataset", CategoryTag = "ML Model", AssignedToUserId = StudentAaravUserId, Status = SprintTaskStatus.InProgress, DueDateUtc = DateTime.UtcNow.AddDays(4) },
            new() { Id = Guid.CreateVersion7(), CollegeId = SistecTenantId, ProjectTeamId = Team01Id, Title = "Assemble real-time floor plan power heatmap view", CategoryTag = "Frontend", AssignedToUserId = StudentDiyaUserId, Status = SprintTaskStatus.InProgress, DueDateUtc = DateTime.UtcNow.AddDays(6) },
            new() { Id = Guid.CreateVersion7(), CollegeId = SistecTenantId, ProjectTeamId = Team01Id, Title = "Conduct 72-hour thermal stress endurance test on controller PCB", CategoryTag = "Hardware", AssignedToUserId = StudentShivanshUserId, Status = SprintTaskStatus.Todo, DueDateUtc = DateTime.UtcNow.AddDays(12) }
        };

        await context.SprintTasks.AddRangeAsync(tasks);

        // 4-Slot Vault Artifacts
        var artifacts = new List<TeamArtifact>
        {
            new()
            {
                CollegeId = SistecTenantId,
                ProjectTeamId = Team01Id,
                SlotType = ArtifactSlotType.Synopsis,
                FileName = "IOT_Energy_Synopsis_Signed_v2.pdf",
                StorageKey = "artifacts/sistec/2026/team-01/synopsis.pdf",
                Sha256Checksum = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                FileSizeBytes = 1845120,
                Status = ArtifactStatus.Verified,
                UploadedByUserId = StudentShivanshUserId,
                VerifiedByUserId = FacultyVermaUserId,
                ReviewerNote = "Comprehensive problem statement and well-defined PO3/PO7 NBA mapping."
            },
            new()
            {
                CollegeId = SistecTenantId,
                ProjectTeamId = Team01Id,
                SlotType = ArtifactSlotType.MidTermPPT,
                FileName = "IOT_MidTerm_Evaluation_Deck.pptx",
                StorageKey = "artifacts/sistec/2026/team-01/midterm_ppt.pptx",
                Sha256Checksum = "8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4",
                FileSizeBytes = 8420100,
                Status = ArtifactStatus.Verified,
                UploadedByUserId = StudentShivanshUserId,
                VerifiedByUserId = FacultyVermaUserId,
                ReviewerNote = "Live sensor demo successfully conducted before panel. Calibration validated."
            },
            new()
            {
                CollegeId = SistecTenantId,
                ProjectTeamId = Team01Id,
                SlotType = ArtifactSlotType.PlagiarismReport,
                FileName = "Ouriginal_Similarity_Report_8_4_Pct.pdf",
                StorageKey = "artifacts/sistec/2026/team-01/plagiarism_report.pdf",
                Sha256Checksum = "cca93b7405218d867c484f29a8f4c2c7ba6475753046f53a4ae944321481d3ef",
                FileSizeBytes = 942500,
                Status = ArtifactStatus.Verified,
                UploadedByUserId = StudentShivanshUserId,
                VerifiedByUserId = FacultyVermaUserId,
                ReviewerNote = "Similarity score 8.4% is comfortably within the institutional <= 15% threshold."
            },
            new()
            {
                CollegeId = SistecTenantId,
                ProjectTeamId = Team01Id,
                SlotType = ArtifactSlotType.FinalThesis,
                FileName = string.Empty,
                StorageKey = string.Empty,
                Sha256Checksum = string.Empty,
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
        Console.WriteLine(string.Format("{0,-20} {1,-28} {2,-30} {3}", "SuperAdmin", "Collabex Super Admin", "admin@collabex.in", "Platform Administrator"));
        Console.WriteLine(string.Format("{0,-20} {1,-28} {2,-30} {3}", "SuperAdmin (Alt)", "Dev Startup Admin", "admin@projecthub.in", "Platform Administrator"));
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

    private static async Task SeedPlatformAuditLogsAsync(ProjectHubDbContext context)
    {
        if (await context.PlatformAuditLogs.IgnoreQueryFilters().AnyAsync()) return;

        var logs = new List<PlatformAuditLog>
        {
            new()
            {
                Id = Guid.NewGuid(),
                ActorUserId = SuperAdminUserId,
                ActorEmail = "admin@projecthub.in",
                Action = "Admin Login Success",
                TargetEntity = "Session: sess-01",
                IpAddress = "103.21.244.10",
                OccurredAtUtc = DateTime.UtcNow.AddMinutes(-35),
                MetadataJson = "{\"actorName\":\"Dev Startup Admin\",\"category\":\"Authentication\",\"result\":\"Success\",\"details\":\"FIDO2 hardware key WebAuthn verified. Session established.\",\"clientBrowser\":\"Chrome 131.0\",\"clientOs\":\"Windows 11\"}"
            },
            new()
            {
                Id = Guid.NewGuid(),
                ActorUserId = SuperAdminUserId,
                ActorEmail = "admin@projecthub.in",
                Action = "College Application Approved",
                TargetEntity = "IES College of Technology (IES-BPL)",
                IpAddress = "103.21.244.10",
                OccurredAtUtc = DateTime.UtcNow.AddHours(-1),
                MetadataJson = "{\"actorName\":\"Dev Startup Admin\",\"category\":\"College Management\",\"result\":\"Success\",\"details\":\"Reviewed institutional accreditation documents and approved platform onboarding application APP-2026-003.\",\"changes\":{\"before\":\"Under Review\",\"after\":\"Approved\"}}"
            },
            new()
            {
                Id = Guid.NewGuid(),
                ActorUserId = SuperAdminUserId,
                ActorEmail = "admin@projecthub.in",
                Action = "Platform Announcement Published",
                TargetEntity = "All Affiliated Colleges",
                IpAddress = "103.21.244.10",
                OccurredAtUtc = DateTime.UtcNow.AddHours(-3),
                MetadataJson = "{\"actorName\":\"Dev Startup Admin\",\"category\":\"Platform Management\",\"result\":\"Success\",\"details\":\"Broadcasted scheduled platform maintenance notification for multi-AZ database engine minor update.\",\"announcementId\":\"ann-01\",\"priority\":\"High\"}"
            },
            new()
            {
                Id = Guid.NewGuid(),
                ActorUserId = SuperAdminUserId,
                ActorEmail = "admin@projecthub.in",
                Action = "College Tenant Activated",
                TargetEntity = "University Institute of Technology, RGPV",
                IpAddress = "103.21.244.10",
                OccurredAtUtc = DateTime.UtcNow.AddHours(-5),
                MetadataJson = "{\"actorName\":\"Dev Startup Admin\",\"category\":\"College Management\",\"result\":\"Success\",\"details\":\"Tenant partition tenant_uit_rgpv_prod activated with 1,800 licensed student capacity.\",\"tenantCode\":\"UIT-RGPV\",\"seats\":1800}"
            },
            new()
            {
                Id = Guid.NewGuid(),
                ActorUserId = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0002"),
                ActorEmail = "aditi.security@collabex.in",
                Action = "Academic Reference Template Published",
                TargetEntity = "Regulation: RGPV-AICTE-FLEX-2022 (v2.4)",
                IpAddress = "103.21.244.12",
                OccurredAtUtc = DateTime.UtcNow.AddHours(-18),
                MetadataJson = "{\"actorName\":\"Aditi Trivedi\",\"category\":\"Platform Management\",\"result\":\"Success\",\"details\":\"Locked and published standardized RGPV 8-semester curriculum scheme template for affiliated colleges.\",\"version\":\"v2.4\"}"
            },
            new()
            {
                Id = Guid.NewGuid(),
                ActorUserId = SuperAdminUserId,
                ActorEmail = "admin@projecthub.in",
                Action = "Subscription Plan Renewed",
                TargetEntity = "Sagar Institute of Science and Technology (SISTec)",
                IpAddress = "103.21.244.10",
                OccurredAtUtc = DateTime.UtcNow.AddDays(-1),
                MetadataJson = "{\"actorName\":\"Dev Startup Admin\",\"category\":\"Subscription Management\",\"result\":\"Success\",\"details\":\"Annual Enterprise Academic subscription renewed for academic year 2026–2027 (GST Invoice INV-2026-001).\",\"amountInr\":566400,\"cycle\":\"Annual\"}"
            },
            new()
            {
                Id = Guid.NewGuid(),
                ActorUserId = null,
                ActorEmail = "principal@ipsacademy.org",
                Action = "Failed Login Attempts Rate-Limited",
                TargetEntity = "Account: principal@ipsacademy.org",
                IpAddress = "117.200.14.8",
                OccurredAtUtc = DateTime.UtcNow.AddHours(-14),
                MetadataJson = "{\"actorName\":\"Unknown Client\",\"category\":\"Authentication\",\"result\":\"Failure\",\"details\":\"5 consecutive incorrect password entries triggered automated 15-minute IP rate-limit lockout.\",\"failedAttempts\":5,\"lockoutDuration\":\"15 minutes\"}"
            },
            new()
            {
                Id = Guid.NewGuid(),
                ActorUserId = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0002"),
                ActorEmail = "aditi.security@collabex.in",
                Action = "Super Admin Security Settings Updated",
                TargetEntity = "Security Policy: Privileged MFA Enforcement",
                IpAddress = "103.21.244.12",
                OccurredAtUtc = DateTime.UtcNow.AddDays(-2),
                MetadataJson = "{\"actorName\":\"Aditi Trivedi\",\"category\":\"Administrator Management\",\"result\":\"Success\",\"details\":\"FIDO2 hardware security token enrolled for privileged multi-factor authentication (K27-Feitian).\",\"policy\":\"MFA_HARDWARE_KEY_ENFORCED\"}"
            },
            new()
            {
                Id = Guid.NewGuid(),
                ActorUserId = SuperAdminUserId,
                ActorEmail = "admin@projecthub.in",
                Action = "Admin Session Revoked",
                TargetEntity = "Session: sess-old-09 (Rohit Saxena)",
                IpAddress = "103.21.244.10",
                OccurredAtUtc = DateTime.UtcNow.AddDays(-3),
                MetadataJson = "{\"actorName\":\"Dev Startup Admin\",\"category\":\"Authentication\",\"result\":\"Success\",\"details\":\"Terminated idle workstation session for Support Engineer Rohit Saxena.\",\"revokedSessionId\":\"sess-old-09\"}"
            }
        };

        context.PlatformAuditLogs.AddRange(logs);
        await context.SaveChangesAsync();
    }
}

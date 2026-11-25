using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectHub.Domain.Entities;

namespace ProjectHub.Infrastructure.Persistence.Configurations;

public class ProjectTeamConfiguration : IEntityTypeConfiguration<ProjectTeam>
{
    public void Configure(EntityTypeBuilder<ProjectTeam> builder)
    {
        builder.ToTable("ProjectTeams");

        builder.HasKey(t => t.Id);

        builder.Property(t => t.TeamCode)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(t => t.Title)
            .IsRequired()
            .HasMaxLength(300);

        builder.Property(t => t.Abstract)
            .IsRequired()
            .HasMaxLength(2000);

        builder.Property(t => t.DomainTag)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(t => t.SdgCode)
            .IsRequired()
            .HasMaxLength(20);

        builder.Property(t => t.Status)
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(t => t.GuidePreferenceStatus)
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(t => t.GuidePreferenceRemarks)
            .HasMaxLength(1000);

        builder.Property(t => t.GuideAllocationRemarks)
            .HasMaxLength(1000);

        builder.Property(t => t.SimilarityScorePct)
            .HasPrecision(5, 2);

        // Composite Unique Filtered Index: (CollegeId, AcademicTrackId, TeamCode)
        builder.HasIndex(t => new { t.CollegeId, t.AcademicTrackId, t.TeamCode })
            .IsUnique()
            .HasFilter("\"IsDeleted\" = false");

        // Performance aggregation index: (CollegeId, DepartmentId, AcademicTrackId, Status)
        builder.HasIndex(t => new { t.CollegeId, t.DepartmentId, t.AcademicTrackId, t.Status });

        // Lineage index
        builder.HasIndex(t => new { t.CollegeId, t.ProjectLineageId });

        builder.HasOne(t => t.College)
            .WithMany(c => c.Teams)
            .HasForeignKey(t => t.CollegeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(t => t.Department)
            .WithMany(d => d.Teams)
            .HasForeignKey(t => t.DepartmentId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(t => t.AcademicTrack)
            .WithMany(a => a.Teams)
            .HasForeignKey(t => t.AcademicTrackId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(t => t.GuideUser)
            .WithMany(u => u.GuidedTeams)
            .HasForeignKey(t => t.GuideUserId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(t => t.PreferredGuideUser)
            .WithMany()
            .HasForeignKey(t => t.PreferredGuideUserId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(t => t.GuideAllocatedByUser)
            .WithMany()
            .HasForeignKey(t => t.GuideAllocatedByUserId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(t => t.ParentProjectTeam)
            .WithMany(p => p.ChildProjects)
            .HasForeignKey(t => t.ParentProjectTeamId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

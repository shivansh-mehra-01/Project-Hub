using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectHub.Domain.Entities;

namespace ProjectHub.Infrastructure.Persistence.Configurations;

public class ProjectClosureRecordConfiguration : IEntityTypeConfiguration<ProjectClosureRecord>
{
    public void Configure(EntityTypeBuilder<ProjectClosureRecord> builder)
    {
        builder.ToTable("ProjectClosureRecords");

        builder.HasKey(c => c.Id);

        builder.Property(c => c.Status)
            .HasConversion<string>()
            .HasMaxLength(30);

        builder.Property(c => c.ClosureCertificateHash)
            .IsRequired()
            .HasMaxLength(128);

        builder.Property(c => c.ClosureRemarks)
            .HasMaxLength(2000);

        builder.Property(c => c.ReopeningReason)
            .HasMaxLength(1000);

        builder.HasIndex(c => new { c.CollegeId, c.DepartmentId, c.AcademicTrackId });
        builder.HasIndex(c => new { c.CollegeId, c.ProjectTeamId }).IsUnique();

        builder.HasOne(c => c.ProjectTeam)
            .WithOne(t => t.ClosureRecord)
            .HasForeignKey<ProjectClosureRecord>(c => c.ProjectTeamId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(c => c.ClosedByUser)
            .WithMany()
            .HasForeignKey(c => c.ClosedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(c => c.ReopenedByUser)
            .WithMany()
            .HasForeignKey(c => c.ReopenedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

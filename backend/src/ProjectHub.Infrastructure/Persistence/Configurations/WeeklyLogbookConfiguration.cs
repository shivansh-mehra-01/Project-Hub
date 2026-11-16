using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectHub.Domain.Entities;

namespace ProjectHub.Infrastructure.Persistence.Configurations;

public class WeeklyLogbookConfiguration : IEntityTypeConfiguration<WeeklyLogbook>
{
    public void Configure(EntityTypeBuilder<WeeklyLogbook> builder)
    {
        builder.ToTable("WeeklyLogbooks");

        builder.HasKey(w => w.Id);

        builder.Property(w => w.AccomplishmentsSummary)
            .IsRequired()
            .HasMaxLength(2000);

        builder.Property(w => w.BlockersSummary)
            .HasMaxLength(2000);

        builder.Property(w => w.MentorRemarks)
            .HasMaxLength(2000);

        builder.Property(w => w.HoursLogged)
            .HasPrecision(5, 2);

        // Composite Unique Filtered Index: (CollegeId, ProjectTeamId, AuthorUserId, WeekNumber)
        builder.HasIndex(w => new { w.CollegeId, w.ProjectTeamId, w.AuthorUserId, w.WeekNumber })
            .IsUnique()
            .HasFilter("\"IsDeleted\" = false");

        builder.HasOne(w => w.ProjectTeam)
            .WithMany(t => t.WeeklyLogs)
            .HasForeignKey(w => w.ProjectTeamId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(w => w.AuthorUser)
            .WithMany()
            .HasForeignKey(w => w.AuthorUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(w => w.VerifiedByUser)
            .WithMany()
            .HasForeignKey(w => w.VerifiedByUserId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

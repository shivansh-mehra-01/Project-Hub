using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectHub.Domain.Entities;

namespace ProjectHub.Infrastructure.Persistence.Configurations;

public class TeamVivaDefenseScheduleConfiguration : IEntityTypeConfiguration<TeamVivaDefenseSchedule>
{
    public void Configure(EntityTypeBuilder<TeamVivaDefenseSchedule> builder)
    {
        builder.ToTable("TeamVivaDefenseSchedules");

        builder.HasKey(s => s.Id);

        builder.Property(s => s.VenueOrLink)
            .IsRequired()
            .HasMaxLength(250);

        builder.Property(s => s.Status)
            .HasConversion<string>()
            .HasMaxLength(30);

        builder.Property(s => s.CandidateInstructions)
            .HasMaxLength(2000);

        builder.Property(s => s.CancellationReason)
            .HasMaxLength(1000);

        builder.HasIndex(s => new { s.CollegeId, s.DepartmentId, s.AcademicTrackId });
        builder.HasIndex(s => new { s.CollegeId, s.ProjectTeamId });

        builder.HasOne(s => s.ProjectTeam)
            .WithMany()
            .HasForeignKey(s => s.ProjectTeamId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(s => s.VivaPanel)
            .WithMany()
            .HasForeignKey(s => s.VivaPanelId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(s => s.ScheduledByUser)
            .WithMany()
            .HasForeignKey(s => s.ScheduledByUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

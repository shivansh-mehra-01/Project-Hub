using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectHub.Domain.Entities;

namespace ProjectHub.Infrastructure.Persistence.Configurations;

public class CourseExitSurveyConfiguration : IEntityTypeConfiguration<CourseExitSurvey>
{
    public void Configure(EntityTypeBuilder<CourseExitSurvey> builder)
    {
        builder.ToTable("CourseExitSurveys");

        builder.HasKey(ces => ces.Id);

        builder.Property(ces => ces.PoRatingsJson)
            .HasColumnType("jsonb");

        // Composite Unique Filtered Index: (CollegeId, ProjectTeamId, StudentUserId)
        builder.HasIndex(ces => new { ces.CollegeId, ces.ProjectTeamId, ces.StudentUserId })
            .IsUnique()
            .HasFilter("\"IsDeleted\" = false");

        builder.HasOne(ces => ces.ProjectTeam)
            .WithMany(t => t.ExitSurveys)
            .HasForeignKey(ces => ces.ProjectTeamId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(ces => ces.StudentUser)
            .WithMany()
            .HasForeignKey(ces => ces.StudentUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

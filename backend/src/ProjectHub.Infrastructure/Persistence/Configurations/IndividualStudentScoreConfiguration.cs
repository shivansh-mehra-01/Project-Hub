using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectHub.Domain.Entities;

namespace ProjectHub.Infrastructure.Persistence.Configurations;

public class IndividualStudentScoreConfiguration : IEntityTypeConfiguration<IndividualStudentScore>
{
    public void Configure(EntityTypeBuilder<IndividualStudentScore> builder)
    {
        builder.ToTable("IndividualStudentScores");

        builder.HasKey(s => s.Id);

        builder.Property(s => s.ModuleOwnershipScore).HasPrecision(5, 2);
        builder.Property(s => s.VivaQaScore).HasPrecision(5, 2);
        builder.Property(s => s.LogDisciplineScore).HasPrecision(5, 2);
        builder.Property(s => s.IndividualTotalScore).HasPrecision(5, 2);
        builder.Property(s => s.FinalComputedStudentMark).HasPrecision(5, 2);

        builder.HasIndex(s => new { s.CollegeId, s.VivaEvaluationId, s.StudentUserId })
            .IsUnique()
            .HasFilter("\"IsDeleted\" = false");

        builder.HasOne(s => s.VivaEvaluation)
            .WithMany(ve => ve.IndividualScores)
            .HasForeignKey(s => s.VivaEvaluationId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(s => s.StudentUser)
            .WithMany()
            .HasForeignKey(s => s.StudentUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

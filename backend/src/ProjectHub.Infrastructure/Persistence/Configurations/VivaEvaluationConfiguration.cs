using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectHub.Domain.Entities;

namespace ProjectHub.Infrastructure.Persistence.Configurations;

public class VivaEvaluationConfiguration : IEntityTypeConfiguration<VivaEvaluation>
{
    public void Configure(EntityTypeBuilder<VivaEvaluation> builder)
    {
        builder.ToTable("VivaEvaluations");

        builder.HasKey(ve => ve.Id);

        builder.Property(ve => ve.CheckpointType)
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(ve => ve.SharedRubricScoresJson)
            .HasColumnType("jsonb");

        builder.Property(ve => ve.SharedTotalScore)
            .HasPrecision(5, 2);

        builder.Property(ve => ve.GeneralRemarks)
            .HasMaxLength(2000);

        builder.HasIndex(ve => new { ve.CollegeId, ve.ProjectTeamId, ve.CheckpointType });

        builder.HasOne(ve => ve.ProjectTeam)
            .WithMany(t => t.Evaluations)
            .HasForeignKey(ve => ve.ProjectTeamId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(ve => ve.EvaluatorUser)
            .WithMany()
            .HasForeignKey(ve => ve.EvaluatorUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

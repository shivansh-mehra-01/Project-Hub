using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectHub.Domain.Entities;

namespace ProjectHub.Infrastructure.Persistence.Configurations;

public class EvaluationRubricCriterionConfiguration : IEntityTypeConfiguration<EvaluationRubricCriterion>
{
    public void Configure(EntityTypeBuilder<EvaluationRubricCriterion> builder)
    {
        builder.ToTable("EvaluationRubricCriteria");

        builder.HasKey(c => c.Id);

        builder.Property(c => c.CriterionCode)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(c => c.Title)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(c => c.Description)
            .IsRequired()
            .HasMaxLength(2000);

        builder.Property(c => c.MaxMarks)
            .HasPrecision(5, 2);

        builder.Property(c => c.WeightPercentage)
            .HasPrecision(5, 2);

        builder.Property(c => c.BloomTaxonomyLevel)
            .HasMaxLength(100);

        builder.HasIndex(c => new { c.CollegeId, c.EvaluationRubricId });
    }
}

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectHub.Domain.Entities;

namespace ProjectHub.Infrastructure.Persistence.Configurations;

public class EvaluationRubricConfiguration : IEntityTypeConfiguration<EvaluationRubric>
{
    public void Configure(EntityTypeBuilder<EvaluationRubric> builder)
    {
        builder.ToTable("EvaluationRubrics");

        builder.HasKey(r => r.Id);

        builder.Property(r => r.Title)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(r => r.CheckpointType)
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(r => r.TotalMaxMarks)
            .HasPrecision(5, 2);

        builder.HasIndex(r => new { r.CollegeId, r.DepartmentId, r.AcademicTrackId, r.CheckpointType });

        builder.HasOne(r => r.Department)
            .WithMany()
            .HasForeignKey(r => r.DepartmentId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(r => r.AcademicTrack)
            .WithMany()
            .HasForeignKey(r => r.AcademicTrackId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(r => r.Criteria)
            .WithOne(c => c.EvaluationRubric)
            .HasForeignKey(c => c.EvaluationRubricId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

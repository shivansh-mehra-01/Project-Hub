using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectHub.Domain.Entities;

namespace ProjectHub.Infrastructure.Persistence.Configurations;

public class CurriculumSchemeConfiguration : IEntityTypeConfiguration<CurriculumScheme>
{
    public void Configure(EntityTypeBuilder<CurriculumScheme> builder)
    {
        builder.ToTable("CurriculumSchemes");

        builder.HasKey(s => s.Id);

        builder.Property(s => s.SchemeCode)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(s => s.SchemeVersion)
            .IsRequired()
            .HasMaxLength(50);

        builder.HasIndex(s => new { s.CollegeId, s.CourseProgramId, s.SchemeCode })
            .IsUnique()
            .HasFilter("\"IsDeleted\" = false");

        builder.HasOne(s => s.College)
            .WithMany(c => c.CurriculumSchemes)
            .HasForeignKey(s => s.CollegeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(s => s.CourseProgram)
            .WithMany(p => p.CurriculumSchemes)
            .HasForeignKey(s => s.CourseProgramId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

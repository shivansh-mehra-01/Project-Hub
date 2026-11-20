using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectHub.Domain.Entities;

namespace ProjectHub.Infrastructure.Persistence.Configurations;

public class SubjectOfferingConfiguration : IEntityTypeConfiguration<SubjectOffering>
{
    public void Configure(EntityTypeBuilder<SubjectOffering> builder)
    {
        builder.ToTable("SubjectOfferings");

        builder.HasKey(o => o.Id);

        builder.Property(o => o.SubjectCode)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(o => o.SubjectName)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(o => o.SubjectType)
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.HasIndex(o => new { o.CollegeId, o.SemesterTermId, o.SubjectCode })
            .IsUnique()
            .HasFilter("\"IsDeleted\" = false");

        builder.HasOne(o => o.College)
            .WithMany(c => c.SubjectOfferings)
            .HasForeignKey(o => o.CollegeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(o => o.SemesterTerm)
            .WithMany(t => t.SubjectOfferings)
            .HasForeignKey(o => o.SemesterTermId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(o => o.CurriculumScheme)
            .WithMany(s => s.SubjectOfferings)
            .HasForeignKey(o => o.CurriculumSchemeId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

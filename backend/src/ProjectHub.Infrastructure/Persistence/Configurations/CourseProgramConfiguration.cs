using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectHub.Domain.Entities;

namespace ProjectHub.Infrastructure.Persistence.Configurations;

public class CourseProgramConfiguration : IEntityTypeConfiguration<CourseProgram>
{
    public void Configure(EntityTypeBuilder<CourseProgram> builder)
    {
        builder.ToTable("CoursePrograms");

        builder.HasKey(p => p.Id);

        builder.Property(p => p.Code)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(p => p.Name)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(p => p.Level)
            .HasConversion<string>()
            .HasMaxLength(30);

        builder.HasIndex(p => new { p.CollegeId, p.Code })
            .IsUnique()
            .HasFilter("\"IsDeleted\" = false");

        builder.HasOne(p => p.College)
            .WithMany(c => c.CoursePrograms)
            .HasForeignKey(p => p.CollegeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(p => p.MasterProgram)
            .WithMany()
            .HasForeignKey(p => p.MasterProgramId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

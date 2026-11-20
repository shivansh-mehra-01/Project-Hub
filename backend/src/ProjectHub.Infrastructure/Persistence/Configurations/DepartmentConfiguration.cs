using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectHub.Domain.Entities;

namespace ProjectHub.Infrastructure.Persistence.Configurations;

public class DepartmentConfiguration : IEntityTypeConfiguration<Department>
{
    public void Configure(EntityTypeBuilder<Department> builder)
    {
        builder.ToTable("Departments");

        builder.HasKey(d => d.Id);

        builder.Property(d => d.Code)
            .IsRequired()
            .HasMaxLength(20);

        builder.Property(d => d.Name)
            .IsRequired()
            .HasMaxLength(150);

        // Composite Unique Filtered Index: (CollegeId, CourseProgramId, Code)
        builder.HasIndex(d => new { d.CollegeId, d.CourseProgramId, d.Code })
            .IsUnique()
            .HasFilter("\"IsDeleted\" = false");

        builder.HasOne(d => d.College)
            .WithMany(c => c.Departments)
            .HasForeignKey(d => d.CollegeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(d => d.CourseProgram)
            .WithMany(p => p.Departments)
            .HasForeignKey(d => d.CourseProgramId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(d => d.HodUser)
            .WithMany()
            .HasForeignKey(d => d.HodUserId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

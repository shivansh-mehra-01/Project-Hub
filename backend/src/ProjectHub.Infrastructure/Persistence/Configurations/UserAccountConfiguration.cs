using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectHub.Domain.Entities;

namespace ProjectHub.Infrastructure.Persistence.Configurations;

public class UserAccountConfiguration : IEntityTypeConfiguration<UserAccount>
{
    public void Configure(EntityTypeBuilder<UserAccount> builder)
    {
        builder.ToTable("UserAccounts");

        builder.HasKey(u => u.Id);

        builder.Property(u => u.FullName)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(u => u.Email)
            .IsRequired()
            .HasMaxLength(256);

        builder.Property(u => u.EnrollmentOrEmployeeCode)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(u => u.Role)
            .HasConversion<string>()
            .HasMaxLength(50);

        // Composite unique filtered indexes
        builder.HasIndex(u => new { u.CollegeId, u.Email })
            .IsUnique()
            .HasFilter("\"IsDeleted\" = false");

        builder.HasIndex(u => new { u.CollegeId, u.EnrollmentOrEmployeeCode })
            .IsUnique()
            .HasFilter("\"IsDeleted\" = false");

        builder.HasOne(u => u.College)
            .WithMany(c => c.Users)
            .HasForeignKey(u => u.CollegeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(u => u.Department)
            .WithMany(d => d.Users)
            .HasForeignKey(u => u.DepartmentId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

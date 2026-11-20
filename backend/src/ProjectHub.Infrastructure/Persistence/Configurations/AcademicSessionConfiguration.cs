using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectHub.Domain.Entities;

namespace ProjectHub.Infrastructure.Persistence.Configurations;

public class AcademicSessionConfiguration : IEntityTypeConfiguration<AcademicSession>
{
    public void Configure(EntityTypeBuilder<AcademicSession> builder)
    {
        builder.ToTable("AcademicSessions");

        builder.HasKey(s => s.Id);

        builder.Property(s => s.Label)
            .IsRequired()
            .HasMaxLength(50);

        builder.HasIndex(s => new { s.CollegeId, s.Label })
            .IsUnique()
            .HasFilter("\"IsDeleted\" = false");

        builder.HasOne(s => s.College)
            .WithMany(c => c.AcademicSessions)
            .HasForeignKey(s => s.CollegeId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

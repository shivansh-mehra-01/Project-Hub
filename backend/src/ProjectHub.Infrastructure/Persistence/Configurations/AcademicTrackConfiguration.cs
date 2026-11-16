using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectHub.Domain.Entities;

namespace ProjectHub.Infrastructure.Persistence.Configurations;

public class AcademicTrackConfiguration : IEntityTypeConfiguration<AcademicTrack>
{
    public void Configure(EntityTypeBuilder<AcademicTrack> builder)
    {
        builder.ToTable("AcademicTracks");

        builder.HasKey(t => t.Id);

        builder.Property(t => t.Name)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(t => t.AcademicYear)
            .IsRequired()
            .HasMaxLength(20);

        builder.HasIndex(t => new { t.CollegeId, t.AcademicYear, t.Name })
            .IsUnique()
            .HasFilter("\"IsDeleted\" = false");

        builder.HasOne(t => t.College)
            .WithMany(c => c.AcademicTracks)
            .HasForeignKey(t => t.CollegeId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

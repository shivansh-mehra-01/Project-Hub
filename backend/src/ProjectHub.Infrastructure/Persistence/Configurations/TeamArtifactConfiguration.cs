using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectHub.Domain.Entities;

namespace ProjectHub.Infrastructure.Persistence.Configurations;

public class TeamArtifactConfiguration : IEntityTypeConfiguration<TeamArtifact>
{
    public void Configure(EntityTypeBuilder<TeamArtifact> builder)
    {
        builder.ToTable("TeamArtifacts");

        builder.HasKey(a => a.Id);

        builder.Property(a => a.SlotType)
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(a => a.Status)
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(a => a.FileName)
            .IsRequired()
            .HasMaxLength(255);

        builder.Property(a => a.StorageKey)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(a => a.Sha256Checksum)
            .IsRequired()
            .HasMaxLength(64);

        // Composite Unique Filtered Index: (CollegeId, ProjectTeamId, SlotType)
        builder.HasIndex(a => new { a.CollegeId, a.ProjectTeamId, a.SlotType })
            .IsUnique()
            .HasFilter("\"IsDeleted\" = false");

        builder.HasOne(a => a.ProjectTeam)
            .WithMany(t => t.Artifacts)
            .HasForeignKey(a => a.ProjectTeamId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(a => a.UploadedByUser)
            .WithMany()
            .HasForeignKey(a => a.UploadedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(a => a.VerifiedByUser)
            .WithMany()
            .HasForeignKey(a => a.VerifiedByUserId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

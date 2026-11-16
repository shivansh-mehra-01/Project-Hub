using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectHub.Domain.Entities;

namespace ProjectHub.Infrastructure.Persistence.Configurations;

public class PlatformAuditLogConfiguration : IEntityTypeConfiguration<PlatformAuditLog>
{
    public void Configure(EntityTypeBuilder<PlatformAuditLog> builder)
    {
        builder.ToTable("PlatformAuditLogs");

        builder.HasKey(p => p.Id);

        builder.Property(p => p.ActorEmail)
            .IsRequired()
            .HasMaxLength(256);

        builder.Property(p => p.Action)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(p => p.TargetEntity)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(p => p.MetadataJson)
            .HasColumnType("jsonb");

        builder.HasIndex(p => p.OccurredAtUtc);
        builder.HasIndex(p => p.TargetTenantId);
    }
}

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectHub.Domain.Entities;

namespace ProjectHub.Infrastructure.Persistence.Configurations;

public class RefreshTokenRecordConfiguration : IEntityTypeConfiguration<RefreshTokenRecord>
{
    public void Configure(EntityTypeBuilder<RefreshTokenRecord> builder)
    {
        builder.ToTable("RefreshTokenRecords");
        builder.HasKey(r => r.Id);
        builder.Property(r => r.SessionId).HasMaxLength(64).IsRequired();
        builder.Property(r => r.TokenFamilyId).HasMaxLength(64).IsRequired();
        builder.Property(r => r.TokenHash).HasMaxLength(128).IsRequired();
        builder.Property(r => r.ReplacedByTokenHash).HasMaxLength(128);
        builder.Property(r => r.RevocationReason).HasMaxLength(200);

        builder.HasIndex(r => r.TokenHash).IsUnique();
        builder.HasIndex(r => r.TokenFamilyId);
        builder.HasIndex(r => r.SessionId);
        builder.HasIndex(r => r.UserId);
    }
}

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectHub.Domain.Entities;

namespace ProjectHub.Infrastructure.Persistence.Configurations;

public class EmailOutboxMessageConfiguration : IEntityTypeConfiguration<EmailOutboxMessage>
{
    public void Configure(EntityTypeBuilder<EmailOutboxMessage> builder)
    {
        builder.ToTable("EmailOutboxMessages");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.EmailType)
            .IsRequired()
            .HasMaxLength(64);

        builder.Property(e => e.RecipientEmail)
            .IsRequired()
            .HasMaxLength(256);

        builder.Property(e => e.RecipientName)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(e => e.Status)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(32);

        builder.Property(e => e.LockedBy)
            .HasMaxLength(128);

        builder.Property(e => e.IdempotencyKey)
            .IsRequired()
            .HasMaxLength(128);

        builder.Property(e => e.LastError)
            .HasMaxLength(500);

        builder.HasIndex(e => e.IdempotencyKey)
            .IsUnique();

        builder.HasIndex(e => new { e.Status, e.NextAttemptAtUtc, e.ExpiresAtUtc });

        builder.HasIndex(e => e.ExpiresAtUtc);
    }
}

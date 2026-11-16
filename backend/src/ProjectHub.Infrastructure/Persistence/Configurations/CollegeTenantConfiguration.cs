using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectHub.Domain.Entities;

namespace ProjectHub.Infrastructure.Persistence.Configurations;

public class CollegeTenantConfiguration : IEntityTypeConfiguration<CollegeTenant>
{
    public void Configure(EntityTypeBuilder<CollegeTenant> builder)
    {
        builder.ToTable("CollegeTenants");

        builder.HasKey(c => c.Id);

        builder.Property(c => c.Name)
            .IsRequired()
            .HasMaxLength(250);

        builder.Property(c => c.TenantCode)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(c => c.SsoDomain)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(c => c.LicenseTier)
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.HasIndex(c => c.TenantCode)
            .IsUnique()
            .HasFilter("\"IsDeleted\" = false");

        builder.HasIndex(c => c.SsoDomain)
            .IsUnique()
            .HasFilter("\"IsDeleted\" = false");
    }
}

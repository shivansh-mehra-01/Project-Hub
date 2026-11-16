using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectHub.Domain.Entities;

namespace ProjectHub.Infrastructure.Persistence.Configurations;

public class MasterSdgCatalogConfiguration : IEntityTypeConfiguration<MasterSdgCatalog>
{
    public void Configure(EntityTypeBuilder<MasterSdgCatalog> builder)
    {
        builder.ToTable("MasterSdgCatalogs");

        builder.HasKey(s => s.Id);

        builder.Property(s => s.Code)
            .IsRequired()
            .HasMaxLength(20);

        builder.Property(s => s.Title)
            .IsRequired()
            .HasMaxLength(250);

        builder.HasIndex(s => s.SdgNumber)
            .IsUnique()
            .HasFilter("\"IsDeleted\" = false");

        builder.HasIndex(s => s.Code)
            .IsUnique()
            .HasFilter("\"IsDeleted\" = false");
    }
}

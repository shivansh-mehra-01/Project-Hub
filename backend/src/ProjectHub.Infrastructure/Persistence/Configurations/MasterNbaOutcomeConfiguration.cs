using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectHub.Domain.Entities;

namespace ProjectHub.Infrastructure.Persistence.Configurations;

public class MasterNbaOutcomeConfiguration : IEntityTypeConfiguration<MasterNbaOutcome>
{
    public void Configure(EntityTypeBuilder<MasterNbaOutcome> builder)
    {
        builder.ToTable("MasterNbaOutcomes");

        builder.HasKey(no => no.Id);

        builder.Property(no => no.Code)
            .IsRequired()
            .HasMaxLength(20);

        builder.Property(no => no.Title)
            .IsRequired()
            .HasMaxLength(250);

        builder.Property(no => no.Category)
            .IsRequired()
            .HasMaxLength(50);

        builder.HasIndex(no => no.Code)
            .IsUnique()
            .HasFilter("\"IsDeleted\" = false");
    }
}

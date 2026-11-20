using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectHub.Domain.Entities.Master;

namespace ProjectHub.Infrastructure.Persistence.Configurations;

public class MasterUniversityConfiguration : IEntityTypeConfiguration<MasterUniversity>
{
    public void Configure(EntityTypeBuilder<MasterUniversity> builder)
    {
        builder.ToTable("MasterUniversities");

        builder.HasKey(u => u.Id);

        builder.Property(u => u.Code)
            .IsRequired()
            .HasMaxLength(30);

        builder.Property(u => u.Name)
            .IsRequired()
            .HasMaxLength(250);

        builder.Property(u => u.State)
            .IsRequired()
            .HasMaxLength(100);

        builder.HasIndex(u => u.Code)
            .IsUnique()
            .HasFilter("\"IsDeleted\" = false");
    }
}

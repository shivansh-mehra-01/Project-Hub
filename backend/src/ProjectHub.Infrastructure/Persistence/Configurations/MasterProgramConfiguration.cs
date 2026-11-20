using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectHub.Domain.Entities.Master;

namespace ProjectHub.Infrastructure.Persistence.Configurations;

public class MasterProgramConfiguration : IEntityTypeConfiguration<MasterProgram>
{
    public void Configure(EntityTypeBuilder<MasterProgram> builder)
    {
        builder.ToTable("MasterPrograms");

        builder.HasKey(p => p.Id);

        builder.Property(p => p.Code)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(p => p.Name)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(p => p.Level)
            .HasConversion<string>()
            .HasMaxLength(30);

        builder.HasIndex(p => new { p.UniversityId, p.Code })
            .IsUnique()
            .HasFilter("\"IsDeleted\" = false");

        builder.HasOne(p => p.University)
            .WithMany(u => u.Programs)
            .HasForeignKey(p => p.UniversityId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

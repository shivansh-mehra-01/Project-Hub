using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectHub.Domain.Entities.Master;

namespace ProjectHub.Infrastructure.Persistence.Configurations;

public class MasterCurriculumSchemeConfiguration : IEntityTypeConfiguration<MasterCurriculumScheme>
{
    public void Configure(EntityTypeBuilder<MasterCurriculumScheme> builder)
    {
        builder.ToTable("MasterCurriculumSchemes");

        builder.HasKey(s => s.Id);

        builder.Property(s => s.Code)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(s => s.Name)
            .IsRequired()
            .HasMaxLength(200);

        builder.HasIndex(s => new { s.UniversityId, s.Code })
            .IsUnique()
            .HasFilter("\"IsDeleted\" = false");

        builder.HasOne(s => s.University)
            .WithMany(u => u.CurriculumSchemes)
            .HasForeignKey(s => s.UniversityId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

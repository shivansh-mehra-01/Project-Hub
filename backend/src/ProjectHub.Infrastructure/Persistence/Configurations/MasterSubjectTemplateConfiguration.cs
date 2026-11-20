using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectHub.Domain.Entities.Master;

namespace ProjectHub.Infrastructure.Persistence.Configurations;

public class MasterSubjectTemplateConfiguration : IEntityTypeConfiguration<MasterSubjectTemplate>
{
    public void Configure(EntityTypeBuilder<MasterSubjectTemplate> builder)
    {
        builder.ToTable("MasterSubjectTemplates");

        builder.HasKey(t => t.Id);

        builder.Property(t => t.SubjectCode)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(t => t.SubjectName)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(t => t.SubjectType)
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(t => t.DefaultParticipationMode)
            .HasConversion<string>()
            .HasMaxLength(30);

        builder.HasIndex(t => new { t.MasterBranchId, t.SemesterNumber, t.SubjectCode })
            .IsUnique()
            .HasFilter("\"IsDeleted\" = false");

        builder.HasOne(t => t.MasterBranch)
            .WithMany(b => b.SubjectTemplates)
            .HasForeignKey(t => t.MasterBranchId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(t => t.Scheme)
            .WithMany(s => s.SubjectTemplates)
            .HasForeignKey(t => t.SchemeId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

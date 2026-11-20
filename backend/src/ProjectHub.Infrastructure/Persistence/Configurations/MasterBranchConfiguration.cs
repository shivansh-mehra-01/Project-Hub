using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectHub.Domain.Entities.Master;

namespace ProjectHub.Infrastructure.Persistence.Configurations;

public class MasterBranchConfiguration : IEntityTypeConfiguration<MasterBranch>
{
    public void Configure(EntityTypeBuilder<MasterBranch> builder)
    {
        builder.ToTable("MasterBranches");

        builder.HasKey(b => b.Id);

        builder.Property(b => b.Code)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(b => b.Name)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(b => b.Category)
            .IsRequired()
            .HasMaxLength(50);

        builder.HasIndex(b => new { b.MasterProgramId, b.Code })
            .IsUnique()
            .HasFilter("\"IsDeleted\" = false");

        builder.HasOne(b => b.MasterProgram)
            .WithMany(p => p.Branches)
            .HasForeignKey(b => b.MasterProgramId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

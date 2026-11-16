using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectHub.Domain.Entities;

namespace ProjectHub.Infrastructure.Persistence.Configurations;

public class VivaPanelEvaluatorConfiguration : IEntityTypeConfiguration<VivaPanelEvaluator>
{
    public void Configure(EntityTypeBuilder<VivaPanelEvaluator> builder)
    {
        builder.ToTable("VivaPanelEvaluators");

        builder.HasKey(pe => pe.Id);

        builder.HasIndex(pe => new { pe.CollegeId, pe.VivaPanelId, pe.EvaluatorUserId })
            .IsUnique()
            .HasFilter("\"IsDeleted\" = false");

        builder.HasOne(pe => pe.VivaPanel)
            .WithMany(p => p.Evaluators)
            .HasForeignKey(pe => pe.VivaPanelId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(pe => pe.EvaluatorUser)
            .WithMany()
            .HasForeignKey(pe => pe.EvaluatorUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

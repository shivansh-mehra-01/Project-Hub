using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectHub.Domain.Entities;

namespace ProjectHub.Infrastructure.Persistence.Configurations;

public class VivaPanelConfiguration : IEntityTypeConfiguration<VivaPanel>
{
    public void Configure(EntityTypeBuilder<VivaPanel> builder)
    {
        builder.ToTable("VivaPanels");

        builder.HasKey(p => p.Id);

        builder.Property(p => p.PanelName)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(p => p.RoomOrLink)
            .IsRequired()
            .HasMaxLength(250);

        builder.HasIndex(p => new { p.CollegeId, p.DepartmentId, p.AcademicTrackId });

        builder.HasOne(p => p.Department)
            .WithMany()
            .HasForeignKey(p => p.DepartmentId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(p => p.AcademicTrack)
            .WithMany()
            .HasForeignKey(p => p.AcademicTrackId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

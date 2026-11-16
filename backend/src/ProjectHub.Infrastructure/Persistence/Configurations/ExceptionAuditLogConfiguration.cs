using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectHub.Domain.Entities;

namespace ProjectHub.Infrastructure.Persistence.Configurations;

public class ExceptionAuditLogConfiguration : IEntityTypeConfiguration<ExceptionAuditLog>
{
    public void Configure(EntityTypeBuilder<ExceptionAuditLog> builder)
    {
        builder.ToTable("ExceptionAuditLogs");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.ActionType)
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(e => e.PreviousValueJson)
            .HasColumnType("jsonb");

        builder.Property(e => e.NewValueJson)
            .HasColumnType("jsonb");

        builder.Property(e => e.Reason)
            .IsRequired()
            .HasMaxLength(1000);

        builder.HasIndex(e => new { e.CollegeId, e.DepartmentId, e.ProjectTeamId, e.ActionType });

        builder.HasOne(e => e.ProjectTeam)
            .WithMany(t => t.ExceptionLogs)
            .HasForeignKey(e => e.ProjectTeamId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.RequestedByUser)
            .WithMany()
            .HasForeignKey(e => e.RequestedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(e => e.ApprovedByUser)
            .WithMany()
            .HasForeignKey(e => e.ApprovedByUserId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(e => e.TargetUser)
            .WithMany()
            .HasForeignKey(e => e.TargetUserId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

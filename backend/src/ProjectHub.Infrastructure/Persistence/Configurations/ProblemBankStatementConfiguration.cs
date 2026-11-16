using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectHub.Domain.Entities;

namespace ProjectHub.Infrastructure.Persistence.Configurations;

public class ProblemBankStatementConfiguration : IEntityTypeConfiguration<ProblemBankStatement>
{
    public void Configure(EntityTypeBuilder<ProblemBankStatement> builder)
    {
        builder.ToTable("ProblemBankStatements");

        builder.HasKey(pbs => pbs.Id);

        builder.Property(pbs => pbs.Title)
            .IsRequired()
            .HasMaxLength(300);

        builder.Property(pbs => pbs.Abstract)
            .IsRequired()
            .HasMaxLength(2000);

        builder.Property(pbs => pbs.SdgCode)
            .IsRequired()
            .HasMaxLength(20);

        builder.HasIndex(pbs => new { pbs.CollegeId, pbs.DepartmentId, pbs.AcademicTrackId });

        builder.HasOne(pbs => pbs.College)
            .WithMany()
            .HasForeignKey(pbs => pbs.CollegeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(pbs => pbs.Department)
            .WithMany()
            .HasForeignKey(pbs => pbs.DepartmentId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(pbs => pbs.AcademicTrack)
            .WithMany(a => a.ProblemStatements)
            .HasForeignKey(pbs => pbs.AcademicTrackId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(pbs => pbs.ProposedByFaculty)
            .WithMany()
            .HasForeignKey(pbs => pbs.ProposedByFacultyId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(pbs => pbs.AllocatedTeam)
            .WithMany()
            .HasForeignKey(pbs => pbs.AllocatedTeamId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

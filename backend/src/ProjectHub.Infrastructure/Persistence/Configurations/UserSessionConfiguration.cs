using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProjectHub.Domain.Entities;

namespace ProjectHub.Infrastructure.Persistence.Configurations;

public class UserSessionConfiguration : IEntityTypeConfiguration<UserSession>
{
    public void Configure(EntityTypeBuilder<UserSession> builder)
    {
        builder.ToTable("UserSessions");
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).HasMaxLength(64);
        builder.Property(s => s.AccountEmail).HasMaxLength(256).IsRequired();
        builder.Property(s => s.AccountName).HasMaxLength(150).IsRequired();
        builder.Property(s => s.Role).HasMaxLength(50).IsRequired();
        builder.Property(s => s.Device).HasMaxLength(150);
        builder.Property(s => s.Browser).HasMaxLength(100);
        builder.Property(s => s.IpAddress).HasMaxLength(50);
        builder.Property(s => s.Location).HasMaxLength(150);
    }
}

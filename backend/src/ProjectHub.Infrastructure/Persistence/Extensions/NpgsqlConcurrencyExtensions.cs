using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ProjectHub.Infrastructure.Persistence.Extensions;

/// <summary>
/// PostgreSQL xmin optimistic concurrency token configuration extension.
/// Maps PostgreSQL's built-in hidden system column "xmin" (xid transaction ID)
/// as a row version concurrency token across high-concurrency entities.
/// </summary>
public static class NpgsqlConcurrencyExtensions
{
    public static EntityTypeBuilder<TEntity> UseXminAsConcurrencyToken<TEntity>(this EntityTypeBuilder<TEntity> builder)
        where TEntity : class
    {
        builder.Property<uint>("xmin")
               .HasColumnType("xid")
               .ValueGeneratedOnAddOrUpdate()
               .IsConcurrencyToken();

        return builder;
    }
}

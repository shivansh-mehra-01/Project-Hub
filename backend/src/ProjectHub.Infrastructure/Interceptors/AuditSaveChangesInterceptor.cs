using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using ProjectHub.Application.Interfaces;
using ProjectHub.Core.Common;
using ProjectHub.Core.Entities;

namespace ProjectHub.Infrastructure.Interceptors;

/// <summary>
/// Immutable audit logging interceptor for Entity Framework Core.
/// Captures all insert, update, and delete mutations and updates audit metadata.
/// </summary>
public class AuditSaveChangesInterceptor : SaveChangesInterceptor
{
    private readonly ITenantContext _tenantContext;
    private readonly ICurrentUser _currentUser;

    public AuditSaveChangesInterceptor(ITenantContext tenantContext, ICurrentUser currentUser)
    {
        _tenantContext = tenantContext;
        _currentUser = currentUser;
    }

    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        ApplyAuditMetadataAndLogs(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        ApplyAuditMetadataAndLogs(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private void ApplyAuditMetadataAndLogs(DbContext? context)
    {
        if (context == null) return;

        var utcNow = DateTime.UtcNow;
        var userEmail = _currentUser.Email ?? "system";
        var auditEntries = new List<AuditLog>();

        foreach (var entry in context.ChangeTracker.Entries().ToList())
        {
            if (entry.Entity is AuditLog) continue;

            // Handle auditable timestamps & actors
            if (entry.Entity is IAuditableEntity auditable)
            {
                if (entry.State == EntityState.Added)
                {
                    auditable.CreatedAtUtc = utcNow;
                    auditable.CreatedBy ??= userEmail;
                }
                else if (entry.State == EntityState.Modified)
                {
                    auditable.UpdatedAtUtc = utcNow;
                    auditable.UpdatedBy = userEmail;
                }
            }

            // Create immutable audit log records for tracked actions
            if (entry.State is EntityState.Added or EntityState.Modified or EntityState.Deleted)
            {
                var action = entry.State.ToString();
                var entityName = entry.Entity.GetType().Name;

                // Resolve primary key or fallback
                var primaryKey = entry.Properties.FirstOrDefault(p => p.Metadata.IsPrimaryKey())?.CurrentValue?.ToString() 
                                 ?? Guid.NewGuid().ToString();

                // Resolve CollegeId
                Guid? collegeId = null;
                if (entry.Entity is ITenantEntity tenantEntity && tenantEntity.CollegeId != Guid.Empty)
                {
                    collegeId = tenantEntity.CollegeId;
                }
                else if (_tenantContext.CollegeId.HasValue)
                {
                    collegeId = _tenantContext.CollegeId;
                }

                var propertyValues = new Dictionary<string, object?>();
                foreach (var prop in entry.Properties)
                {
                    if (prop.Metadata.IsPrimaryKey()) continue;

                    if (entry.State == EntityState.Modified && !prop.IsModified)
                        continue;

                    propertyValues[prop.Metadata.Name] = prop.CurrentValue;
                }

                auditEntries.Add(new AuditLog
                {
                    CollegeId = collegeId,
                    UserId = _currentUser.UserId,
                    UserEmail = userEmail,
                    EntityName = entityName,
                    EntityId = primaryKey,
                    Action = action,
                    ChangesJson = JsonSerializer.Serialize(propertyValues),
                    TimestampUtc = utcNow
                });
            }
        }

        if (auditEntries.Count > 0)
        {
            context.Set<AuditLog>().AddRange(auditEntries);
        }
    }
}


using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using ProjectHub.Application.Interfaces;
using ProjectHub.Domain.Common;
using ProjectHub.Domain.Entities;

namespace ProjectHub.Infrastructure.Interceptors;

/// <summary>
/// Immutable audit logging interceptor for Entity Framework Core.
/// Captures significant platform and tenant mutations into PlatformAuditLog.
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
        ApplyPlatformAuditLogs(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        ApplyPlatformAuditLogs(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private void ApplyPlatformAuditLogs(DbContext? context)
    {
        if (context == null) return;

        var utcNow = DateTime.UtcNow;
        var userEmail = _currentUser.Email ?? "system";
        var auditEntries = new List<PlatformAuditLog>();

        foreach (var entry in context.ChangeTracker.Entries().ToList())
        {
            if (entry.Entity is PlatformAuditLog or ExceptionAuditLog) continue;

            if (entry.State is EntityState.Added or EntityState.Modified or EntityState.Deleted)
            {
                // Only create platform audit logs for significant entities (e.g. CollegeTenant, Department, UserAccount, ProjectTeam)
                var entityType = entry.Entity.GetType();
                var entityName = entityType.Name;

                if (entry.Entity is CollegeTenant or Department or UserAccount or ProjectTeam or AcademicTrack)
                {
                    Guid? targetTenantId = null;
                    if (entry.Entity is ITenantEntity tenantEntity)
                    {
                        targetTenantId = tenantEntity.CollegeId;
                    }
                    else if (entry.Entity is CollegeTenant collegeTenant)
                    {
                        targetTenantId = collegeTenant.Id;
                    }

                    var propertyValues = new Dictionary<string, object?>();
                    foreach (var prop in entry.Properties)
                    {
                        if (prop.Metadata.IsPrimaryKey()) continue;
                        if (entry.State == EntityState.Modified && !prop.IsModified) continue;
                        propertyValues[prop.Metadata.Name] = prop.CurrentValue;
                    }

                    auditEntries.Add(new PlatformAuditLog
                    {
                        ActorUserId = _currentUser.UserId,
                        ActorEmail = userEmail,
                        Action = $"{entry.State}_{entityName}",
                        TargetTenantId = targetTenantId,
                        TargetEntity = entityName,
                        MetadataJson = JsonSerializer.Serialize(propertyValues),
                        OccurredAtUtc = utcNow
                    });
                }
            }
        }

        if (auditEntries.Count > 0)
        {
            context.Set<PlatformAuditLog>().AddRange(auditEntries);
        }
    }
}

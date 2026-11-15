namespace ProjectHub.Core.Common;

/// <summary>
/// Marker interface enforcing multi-tenant isolation by CollegeId.
/// All entities implementing this interface are automatically scoped via EF Core Global Query Filters.
/// </summary>
public interface ITenantEntity
{
    Guid CollegeId { get; set; }
}


namespace ProjectHub.Domain.Common;

/// <summary>
/// Mandatory partition contract for all tenant-isolated campus entities.
/// CollegeId is non-nullable and serves as the primary tenant partition key.
/// </summary>
public interface ITenantEntity
{
    Guid CollegeId { get; set; }
}

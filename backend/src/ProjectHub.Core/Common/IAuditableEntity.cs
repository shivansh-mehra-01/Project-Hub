namespace ProjectHub.Core.Common;

/// <summary>
/// Enforces tracking of creation and modification timestamps and actors.
/// Automatically populated by the EF Core AuditSaveChangesInterceptor.
/// </summary>
public interface IAuditableEntity
{
    DateTime CreatedAtUtc { get; set; }
    string? CreatedBy { get; set; }
    DateTime? UpdatedAtUtc { get; set; }
    string? UpdatedBy { get; set; }
}


using ProjectHub.Domain.Common;

namespace ProjectHub.Domain.Entities;

/// <summary>
/// United Nations Sustainable Development Goals catalog (SDG-1 through SDG-17).
/// Platform-level catalog utilized for multi-dimensional sustainability tagging.
/// </summary>
public class MasterSdgCatalog : BaseEntity
{
    public int SdgNumber { get; set; } // 1 - 17
    public string Code { get; set; } = string.Empty; // SDG-1 - SDG-17
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}

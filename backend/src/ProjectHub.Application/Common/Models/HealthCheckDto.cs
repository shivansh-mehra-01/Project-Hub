namespace ProjectHub.Application.Common.Models;

public class HealthCheckDto
{
    public string Status { get; set; } = "Healthy";
    public string Environment { get; set; } = string.Empty;
    public string Version { get; set; } = "1.0.0";
    public DateTime TimestampUtc { get; set; } = DateTime.UtcNow;
    public DatabaseHealthDto Database { get; set; } = new();
    public RedisHealthDto Redis { get; set; } = new();
    public TenantStatusDto Tenant { get; set; } = new();
}

public class DatabaseHealthDto
{
    public string Status { get; set; } = "Operational";
    public string Provider { get; set; } = "PostgreSQL 17 (Npgsql)";
}

public class RedisHealthDto
{
    public string Status { get; set; } = "Operational";
    public string Engine { get; set; } = "Redis 7";
}

public class TenantStatusDto
{
    public bool Resolved { get; set; }
    public Guid? CollegeId { get; set; }
    public string Mode { get; set; } = "Global";
}


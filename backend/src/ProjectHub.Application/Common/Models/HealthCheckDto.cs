namespace ProjectHub.Application.Common.Models;

public class HealthCheckDto
{
    public string Status { get; set; } = "Unknown";
    public string Environment { get; set; } = string.Empty;
    public string Version { get; set; } = "1.0.0";
    public DateTime TimestampUtc { get; set; } = DateTime.UtcNow;
    public double UptimeSeconds { get; set; }
    public DatabaseHealthDto Database { get; set; } = new();
    public RedisHealthDto Redis { get; set; } = new();
    public ComponentHealthDto Email { get; set; } = new();
    public ComponentHealthDto Storage { get; set; } = new();
    public TenantStatusDto Tenant { get; set; } = new();
    public RuntimeTelemetryDto Telemetry { get; set; } = new();
}

public class DatabaseHealthDto
{
    public string Status { get; set; } = "Unknown";
    public string Provider { get; set; } = "PostgreSQL (Npgsql)";
    public double? LatencyMs { get; set; }
    public int? PendingMigrations { get; set; }
    public string? Details { get; set; }
}

public class RedisHealthDto
{
    public string Status { get; set; } = "Unknown";
    public string Engine { get; set; } = "Redis";
    public double? LatencyMs { get; set; }
    public string? Details { get; set; }
}

public class ComponentHealthDto
{
    public string Status { get; set; } = "Unknown";
    public string Provider { get; set; } = string.Empty;
    public double? LatencyMs { get; set; }
    public string? Details { get; set; }
}

public class TenantStatusDto
{
    public bool Resolved { get; set; }
    public Guid? CollegeId { get; set; }
    public string Mode { get; set; } = "Global";
}

public class RuntimeTelemetryDto
{
    public int ActiveSessionsCount { get; set; }
    public int ActiveTenantsCount { get; set; }
    public int FailedLoginsLast24h { get; set; }
    public int PendingMigrationsCount { get; set; }
}

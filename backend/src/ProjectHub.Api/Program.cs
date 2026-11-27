using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using ProjectHub.Api.Endpoints;
using ProjectHub.Api.Extensions;
using ProjectHub.Api.Middleware;
using ProjectHub.Application;
using ProjectHub.Application.Interfaces;
using ProjectHub.Infrastructure;
using ProjectHub.Infrastructure.Persistence;
using Scalar.AspNetCore;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// 1. Serilog Structured Logging
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj} {Properties:j}{NewLine}{Exception}")
    .CreateLogger();

builder.Host.UseSerilog();

// 2. Global Json String Enum Converter (Refinement 2)
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

// 3. Application & Infrastructure Layers
builder.Services.AddMemoryCache();
var configuredDpPath = builder.Configuration["DataProtection:KeysPath"];
var effectiveDpPath = !string.IsNullOrWhiteSpace(configuredDpPath)
    ? configuredDpPath
    : Path.Combine(builder.Environment.ContentRootPath, ".dpkeys");
Directory.CreateDirectory(effectiveDpPath);
builder.Services.AddDataProtection()
    .SetApplicationName("Colabex.ProjectHub")
    .PersistKeysToFileSystem(new DirectoryInfo(effectiveDpPath));
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

// 4. Fail-Fast Production Configuration Validation & JWT Authentication
var isDev = builder.Environment.IsDevelopment();
var jwtSecret = builder.Configuration["Jwt:Secret"];
var jwtIssuer = builder.Configuration["Jwt:Issuer"];
var jwtAudience = builder.Configuration["Jwt:Audience"];

if (!isDev)
{
    const string devPlaceholder = "ProjectHubSuperSecretDevKeyMinLength32CharactersRequired!";
    if (string.IsNullOrWhiteSpace(jwtSecret) || Encoding.UTF8.GetByteCount(jwtSecret) < 32 || jwtSecret == devPlaceholder)
    {
        throw new InvalidOperationException("Production configuration error: Jwt:Secret must be configured with at least 32 bytes and cannot use the development placeholder.");
    }
    if (string.IsNullOrWhiteSpace(jwtIssuer) || string.IsNullOrWhiteSpace(jwtAudience))
    {
        throw new InvalidOperationException("Production configuration error: Jwt:Issuer and Jwt:Audience must be configured.");
    }
    var connStr = builder.Configuration.GetConnectionString("DefaultConnection");
    if (string.IsNullOrWhiteSpace(connStr) || connStr.Contains("Password=postgres;", StringComparison.OrdinalIgnoreCase))
    {
        throw new InvalidOperationException("Production configuration error: ConnectionStrings:DefaultConnection must use production credentials.");
    }
    if (!string.Equals(builder.Configuration["Email:Provider"], "Smtp", StringComparison.OrdinalIgnoreCase) ||
        string.IsNullOrWhiteSpace(builder.Configuration["Email:SmtpHost"]) ||
        string.IsNullOrWhiteSpace(builder.Configuration["Email:FromAddress"]))
    {
        throw new InvalidOperationException("Production configuration error: Email:Provider must be 'Smtp' with Email:SmtpHost and Email:FromAddress configured.");
    }
    var prodFrontendUrl = builder.Configuration["Frontend:BaseUrl"]?.Trim();
    if (string.IsNullOrWhiteSpace(prodFrontendUrl) ||
        !Uri.TryCreate(prodFrontendUrl, UriKind.Absolute, out var parsedFrontendUri) ||
        parsedFrontendUri.Scheme != Uri.UriSchemeHttps)
    {
        throw new InvalidOperationException("Production configuration error: Frontend:BaseUrl must be a valid absolute HTTPS URL.");
    }
    var smtpPort = builder.Configuration.GetValue<int?>("Email:SmtpPort") ?? 0;
    if (smtpPort <= 0 || smtpPort > 65535)
    {
        throw new InvalidOperationException("Production configuration error: Email:SmtpPort must be between 1 and 65535.");
    }
    var dpKeysPath = builder.Configuration["DataProtection:KeysPath"];
    if (string.IsNullOrWhiteSpace(dpKeysPath))
    {
        throw new InvalidOperationException("Production configuration error: DataProtection:KeysPath must be configured for persistent encryption keys.");
    }
}
else
{
    if (string.IsNullOrWhiteSpace(jwtSecret) || Encoding.UTF8.GetByteCount(jwtSecret) < 32)
    {
        throw new InvalidOperationException("Development configuration error: Jwt:Secret must be configured in appsettings.Development.json or user-secrets.");
    }
    jwtIssuer ??= "https://api.projecthub.local";
    jwtAudience ??= "https://app.projecthub.local";
}

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = !isDev;
        options.SaveToken = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,
            ValidateAudience = true,
            ValidAudience = jwtAudience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30)
        };
        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = async context =>
            {
                if (context.Principal == null)
                {
                    context.Fail("Missing principal.");
                    return;
                }
                var sessionSecurity = context.HttpContext.RequestServices.GetRequiredService<ISessionSecurityService>();
                var (isValid, reason) = await sessionSecurity.ValidateAccessTokenAsync(context.Principal, context.HttpContext.RequestAborted);
                if (!isValid)
                {
                    context.Fail(reason ?? "Session is invalid or revoked.");
                }
            }
        };
    });

// 5. Policy-Based Authorization
builder.Services.AddProjectHubAuthorization();

// 6. OpenAPI & Documentation
builder.Services.AddOpenApi("v1");

// 7. Forwarded Headers & Rate Limiting for Security Endpoints
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.ForwardLimit = 1;

    var knownProxies = builder.Configuration.GetSection("ForwardedHeaders:KnownProxies").Get<string[]>() ?? Array.Empty<string>();
    foreach (var proxy in knownProxies)
    {
        if (IPAddress.TryParse(proxy, out var ip))
        {
            options.KnownProxies.Add(ip);
        }
    }

    var knownNetworks = builder.Configuration.GetSection("ForwardedHeaders:KnownNetworks").Get<string[]>() ?? Array.Empty<string>();
    foreach (var cidr in knownNetworks)
    {
        if (System.Net.IPNetwork.TryParse(cidr, out var network))
        {
            options.KnownIPNetworks.Add(network);
        }
    }
});

var rateLimitWindow = TimeSpan.FromSeconds(
    Math.Max(1, builder.Configuration.GetValue<int?>("RateLimiting:WindowSeconds") ?? 60));
var loginIpLimit = builder.Configuration.GetValue<int?>("RateLimiting:LoginIpPermitLimit")
    ?? (builder.Environment.IsDevelopment() ? 200 : 60);
var loginAccountLimit = builder.Configuration.GetValue<int?>("RateLimiting:LoginAccountPermitLimit")
    ?? (builder.Environment.IsDevelopment() ? 200 : 10);
var passwordResetLimit = builder.Configuration.GetValue<int?>("RateLimiting:PasswordResetPermitLimit") ?? 10;
var rosterSignupLimit = builder.Configuration.GetValue<int?>("RateLimiting:RosterSignupPermitLimit") ?? 10;

var loginAccountLimiter = PartitionedRateLimiter.Create<string, string>(emailKey =>
    RateLimitPartition.GetFixedWindowLimiter(
        partitionKey: emailKey,
        factory: _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = loginAccountLimit,
            Window = rateLimitWindow,
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            QueueLimit = 0
        }));

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("LoginLimit", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = loginIpLimit,
                Window = rateLimitWindow,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            }));
    options.AddPolicy("PasswordResetLimit", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = passwordResetLimit,
                Window = rateLimitWindow,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            }));
    options.AddPolicy("RosterSignupLimit", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = rosterSignupLimit,
                Window = rateLimitWindow,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            }));
    options.AddPolicy("EmailChangeLimit", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.User?.FindFirst("user_id")?.Value
                          ?? httpContext.Connection.RemoteIpAddress?.ToString()
                          ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = rateLimitWindow,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            }));
});

// 8. CORS Configuration
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() 
                     ?? new[] { "http://localhost:3000" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        if (builder.Environment.IsDevelopment())
        {
            policy.SetIsOriginAllowed(origin =>
            {
                if (string.IsNullOrEmpty(origin)) return false;
                if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri)) return false;
                if (uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase) ||
                    uri.Host.Equals("127.0.0.1", StringComparison.OrdinalIgnoreCase) ||
                    uri.Host.Equals("::1", StringComparison.OrdinalIgnoreCase)) return true;
                if (uri.Host.StartsWith("192.168.", StringComparison.OrdinalIgnoreCase) ||
                    uri.Host.StartsWith("10.", StringComparison.OrdinalIgnoreCase)) return true;
                if (System.Net.IPAddress.TryParse(uri.Host, out var ip))
                {
                    var bytes = ip.GetAddressBytes();
                    if (bytes.Length == 4 && bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31) return true;
                }
                return allowedOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase);
            })
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
        }
        else
        {
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        }
    });
});

var app = builder.Build();

// Global Exception Handling Middleware - Production Safe Error Formatting
app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (UnauthorizedAccessException ex)
    {
        Log.Warning("Authorization boundary blocked access to {Path}: {Message}", context.Request.Path, ex.Message);
        if (!context.Response.HasStarted)
        {
            context.Response.Clear();
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(new
            {
                message = ex.Message
            });
        }
    }
    catch (BadHttpRequestException ex)
    {
        Log.Warning("Bad HTTP request processing {Method} {Path}: {Message}", context.Request.Method, context.Request.Path, ex.Message);
        if (!context.Response.HasStarted)
        {
            context.Response.Clear();
            context.Response.StatusCode = ex.StatusCode;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(new
            {
                message = ex.Message
            });
        }
    }
    catch (Exception ex)
    {
        Log.Error(ex, "Unhandled server error processing {Method} {Path}", context.Request.Method, context.Request.Path);
        if (!context.Response.HasStarted)
        {
            context.Response.Clear();
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(new
            {
                message = "An unexpected server error occurred. Please try again."
            });
        }
    }
});

// 8. Middleware Pipeline
app.UseForwardedHeaders();

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
    app.UseHttpsRedirection();
}

app.UseSerilogRequestLogging();

app.UseCors("AllowFrontend");

app.UseRateLimiter();

// Per-account login rate limiting (chained alongside IP-based LoginLimit)
app.Use(async (context, next) =>
{
    if (HttpMethods.IsPost(context.Request.Method) &&
        context.Request.Path.Equals("/api/auth/login", StringComparison.OrdinalIgnoreCase) &&
        context.Request.ContentType?.Contains("application/json", StringComparison.OrdinalIgnoreCase) == true)
    {
        context.Request.EnableBuffering();
        string? normalizedEmail = null;
        try
        {
            using var doc = await JsonDocument.ParseAsync(context.Request.Body);
            if (doc.RootElement.TryGetProperty("email", out var emailProp) && emailProp.ValueKind == JsonValueKind.String)
            {
                normalizedEmail = emailProp.GetString()?.Trim().ToLowerInvariant();
            }
        }
        catch
        {
            // Ignore malformed JSON; controller will return 400
        }
        finally
        {
            context.Request.Body.Position = 0;
        }

        if (!string.IsNullOrEmpty(normalizedEmail))
        {
            using var lease = await loginAccountLimiter.AcquireAsync(normalizedEmail, 1, context.RequestAborted);
            if (!lease.IsAcquired)
            {
                context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                return;
            }
        }
    }

    await next();
});

app.UseAuthentication();
app.UseTenantResolution();
app.UseAuthorization();

// OpenAPI Spec & Scalar UI (Development or explicit Docs:Enabled=true only)
var docsEnabled = app.Environment.IsDevelopment() || app.Configuration.GetValue<bool>("Docs:Enabled");
if (docsEnabled)
{
    app.MapOpenApi("/openapi/v1.json");
    app.MapScalarApiReference("/scalar/v1", options =>
    {
        options.WithTitle("Collabex API Documentation");
        options.WithTheme(ScalarTheme.Default);
    });
}

// System Endpoints
app.MapHealthEndpoints();
app.MapControllers();

// Root endpoint
if (docsEnabled)
{
    app.MapGet("/", () => Results.Redirect("/scalar/v1"))
       .ExcludeFromDescription();
}
else
{
    app.MapGet("/", () => Results.NotFound())
       .ExcludeFromDescription();
}

// CLI Mode: Database Migration (`dotnet run -- migrate`)
if (args.Contains("migrate", StringComparer.OrdinalIgnoreCase) ||
    args.Contains("--migrate", StringComparer.OrdinalIgnoreCase))
{
    var migrationConnStr = builder.Configuration.GetConnectionString("Migrations")
        ?? builder.Configuration.GetConnectionString("DefaultConnection");
    if (string.IsNullOrWhiteSpace(migrationConnStr))
    {
        Console.Error.WriteLine("Migration failed: ConnectionStrings:Migrations or ConnectionStrings:DefaultConnection is required.");
        Environment.ExitCode = 1;
        return;
    }

    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
    if (db.Database.IsRelational())
    {
        db.Database.SetConnectionString(migrationConnStr);
        await db.Database.MigrateAsync();
    }
    await DbInitializer.SeedMasterCatalogsAsync(db);
    Console.WriteLine("Database migrations and master catalog seeding completed successfully.");
    Environment.ExitCode = 0;
    return;
}

// CLI Mode: One-Time SuperAdmin Bootstrap (`dotnet run -- bootstrap-superadmin`)
if (args.Contains("bootstrap-superadmin", StringComparer.OrdinalIgnoreCase) ||
    args.Contains("--bootstrap-superadmin", StringComparer.OrdinalIgnoreCase))
{
    var migrationConnStr = builder.Configuration.GetConnectionString("Migrations")
        ?? builder.Configuration.GetConnectionString("DefaultConnection");

    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
    var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
    if (db.Database.IsRelational())
    {
        if (!string.IsNullOrWhiteSpace(migrationConnStr))
        {
            db.Database.SetConnectionString(migrationConnStr);
        }
        await db.Database.MigrateAsync();
    }
    await DbInitializer.SeedMasterCatalogsAsync(db);

    var email = Environment.GetEnvironmentVariable("COLABEX_BOOTSTRAP_EMAIL");
    var password = Environment.GetEnvironmentVariable("COLABEX_BOOTSTRAP_PASSWORD");
    var fullName = Environment.GetEnvironmentVariable("COLABEX_BOOTSTRAP_NAME");

    var (success, message) = await ProjectHub.Infrastructure.Security.SuperAdminBootstrapper.BootstrapAsync(
        db, tenantContext, email, password, fullName);

    Console.WriteLine(message);
    Environment.ExitCode = success ? 0 : 1;
    return;
}

// Fail-fast PostgreSQL RLS role check in non-Development environments
if (!app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
    if (db.Database.IsNpgsql())
    {
        var conn = db.Database.GetDbConnection();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user";
        await using var reader = await cmd.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            var isSuper = reader.GetBoolean(0);
            var bypassRls = reader.GetBoolean(1);
            if (isSuper || bypassRls)
            {
                throw new InvalidOperationException(
                    "Security configuration error: Runtime PostgreSQL role must have NOSUPERUSER and NOBYPASSRLS so Row-Level Security (RLS) cannot be bypassed.");
            }
        }
    }
}

// Database Migration & Master Reference Catalog Initialization (zero demo tenants/users)
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
    try
    {
        if (db.Database.IsRelational())
        {
            await db.Database.MigrateAsync();
        }
        else
        {
            await db.Database.EnsureCreatedAsync();
        }
        await DbInitializer.SeedMasterCatalogsAsync(db);
    }
    catch (Exception ex)
    {
        Log.Warning(ex, "Database migration/catalog initialization encountered an issue during startup.");
    }
}

if (app.Environment.IsDevelopment())
{
    app.Lifetime.ApplicationStarted.Register(() =>
    {
        foreach (var addr in app.Urls)
        {
            if (Uri.TryCreate(addr.Replace("://*", "://0.0.0.0").Replace("://+", "://0.0.0.0"), UriKind.Absolute, out var uri))
            {
                var host = uri.Host;
                var isLoopback = string.Equals(host, "localhost", StringComparison.OrdinalIgnoreCase)
                                 || (IPAddress.TryParse(host, out var ip) && IPAddress.IsLoopback(ip));
                if (!isLoopback)
                {
                    Log.Warning(
                        "SECURITY WARNING: Application is running in Development environment while listening on non-loopback address {Address}. Set ASPNETCORE_ENVIRONMENT=Production before exposing to any network.",
                        addr);
                }
            }
        }
    });
}

try
{
    Log.Information("Starting Collabex API (.NET 10 LTS)");
    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Project Hub API terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}

public partial class Program { }

using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
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
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

// 4. JWT Authentication
var jwtSecret = builder.Configuration["Jwt:Secret"] ?? "ProjectHubSuperSecretDevKeyMinLength32CharactersRequired!";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "https://api.projecthub.local";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "https://app.projecthub.local";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = false; // Dev environment
        options.SaveToken = true;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,
            ValidateAudience = true,
            ValidAudience = jwtAudience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });

// 5. Policy-Based Authorization
builder.Services.AddProjectHubAuthorization();

// 6. OpenAPI & Documentation
builder.Services.AddOpenApi("v1");

// 7. CORS Configuration
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() 
                     ?? new[] { "http://localhost:3000" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
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
app.UseSerilogRequestLogging();

app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseTenantResolution();
app.UseAuthorization();

// OpenAPI Spec & Scalar UI
app.MapOpenApi("/openapi/v1.json");
app.MapScalarApiReference("/scalar/v1", options =>
{
    options.WithTitle("Collabex API Documentation");
    options.WithTheme(ScalarTheme.Default);
});

// System Endpoints
app.MapHealthEndpoints();
app.MapControllers();

// Root Redirect to Scalar UI
app.MapGet("/", () => Results.Redirect("/scalar/v1"))
   .ExcludeFromDescription();

// Database Initialization & Seed in Development
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
    var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
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
        await DbInitializer.SeedAsync(db, tenantContext, isDevelopment: true);
    }
    catch (Exception ex)
    {
        Log.Warning(ex, "Database migration/seed skipped or encountered an issue during startup.");
    }
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

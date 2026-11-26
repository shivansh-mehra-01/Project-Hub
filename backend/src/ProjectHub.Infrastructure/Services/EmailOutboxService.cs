using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using ProjectHub.Application.Interfaces;
using ProjectHub.Domain.Entities;
using ProjectHub.Domain.Enums;

namespace ProjectHub.Infrastructure.Services;

public sealed class EmailOutboxService : IEmailOutboxService
{
    private const string ProtectorPurpose = "Colabex.EmailOutbox.SensitivePayload.v1";

    private readonly IAppDbContext _context;
    private readonly IDataProtector _protector;
    private readonly IConfiguration _configuration;
    private readonly EmailOutboxMetrics _metrics;
    private readonly ILogger<EmailOutboxService> _logger;

    private sealed record SensitiveEmailPayload(string Secret);

    public EmailOutboxService(
        IAppDbContext context,
        IDataProtectionProvider dataProtectionProvider,
        IConfiguration configuration,
        EmailOutboxMetrics metrics,
        ILogger<EmailOutboxService> logger)
    {
        _context = context;
        _protector = dataProtectionProvider.CreateProtector(ProtectorPurpose);
        _configuration = configuration;
        _metrics = metrics;
        _logger = logger;
    }

    public void QueuePasswordResetOtp(
        string recipientEmail,
        string recipientName,
        string otp,
        DateTime expiresAtUtc,
        Guid? collegeId,
        string? idempotencyKey = null)
    {
        Enqueue(EmailOutboxTypes.PasswordResetOtp, recipientEmail, recipientName, otp, expiresAtUtc, collegeId, idempotencyKey);
    }

    public void QueueAccountActivation(
        string recipientEmail,
        string recipientName,
        string activationToken,
        DateTime expiresAtUtc,
        Guid? collegeId,
        string? idempotencyKey = null)
    {
        Enqueue(EmailOutboxTypes.AccountActivation, recipientEmail, recipientName, activationToken, expiresAtUtc, collegeId, idempotencyKey);
    }

    public void QueueEmailChangeVerification(
        string recipientEmail,
        string recipientName,
        string otp,
        DateTime expiresAtUtc,
        Guid? collegeId,
        string? idempotencyKey = null)
    {
        Enqueue(EmailOutboxTypes.EmailChangeVerification, recipientEmail, recipientName, otp, expiresAtUtc, collegeId, idempotencyKey);
    }

    public string DecryptSecret(string encryptedPayload)
    {
        if (string.IsNullOrWhiteSpace(encryptedPayload))
        {
            throw new InvalidOperationException("Encrypted email payload is missing.");
        }

        var json = _protector.Unprotect(encryptedPayload);
        var payload = JsonSerializer.Deserialize<SensitiveEmailPayload>(json);
        if (payload == null || string.IsNullOrWhiteSpace(payload.Secret))
        {
            throw new InvalidOperationException("Decrypted email payload is empty or invalid.");
        }

        return payload.Secret;
    }

    private void Enqueue(
        string emailType,
        string recipientEmail,
        string recipientName,
        string secret,
        DateTime expiresAtUtc,
        Guid? collegeId,
        string? idempotencyKey)
    {
        var normalizedEmail = recipientEmail.Trim().ToLowerInvariant();
        var maxAttempts = Math.Clamp(_configuration.GetValue<int?>("Email:Worker:MaxAttempts") ?? 5, 1, 20);
        var key = string.IsNullOrWhiteSpace(idempotencyKey)
            ? $"{emailType}:{Guid.NewGuid():N}"
            : idempotencyKey.Trim();

        var json = JsonSerializer.Serialize(new SensitiveEmailPayload(secret));
        var encrypted = _protector.Protect(json);

        var record = new EmailOutboxMessage
        {
            Id = Guid.NewGuid(),
            EmailType = emailType,
            RecipientEmail = normalizedEmail,
            RecipientName = string.IsNullOrWhiteSpace(recipientName) ? normalizedEmail : recipientName.Trim(),
            CollegeId = collegeId,
            EncryptedPayload = encrypted,
            Status = EmailOutboxStatus.Pending,
            AttemptCount = 0,
            MaxAttempts = maxAttempts,
            NextAttemptAtUtc = DateTime.UtcNow,
            ExpiresAtUtc = expiresAtUtc,
            IdempotencyKey = key
        };

        _context.EmailOutboxMessages.Add(record);
        _metrics.RecordQueued();

        _logger.LogInformation(
            "Enqueued {EmailType} outbox message {OutboxId} for {RecipientEmail} (CollegeId={CollegeId}, ExpiresAtUtc={ExpiresAtUtc})",
            emailType,
            record.Id,
            normalizedEmail,
            collegeId,
            expiresAtUtc);
    }

    public static string SanitizeError(Exception ex)
    {
        var raw = $"{ex.GetType().Name}: {ex.Message}";
        // Strip query tokens, URLs with query parameters, or 6+ digit codes
        raw = Regex.Replace(raw, @"token=[^&\s]+", "token=[REDACTED]", RegexOptions.IgnoreCase);
        raw = Regex.Replace(raw, @"\b\d{6}\b", "[OTP_REDACTED]");
        return raw.Length > 450 ? raw[..450] : raw;
    }
}

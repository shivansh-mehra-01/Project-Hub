using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using ProjectHub.Application.Interfaces;
using ProjectHub.Domain.Entities;
using ProjectHub.Domain.Enums;
using ProjectHub.Infrastructure.Persistence;

namespace ProjectHub.Infrastructure.Services;

/// <summary>
/// Hosted background worker that durably delivers queued transactional emails
/// with lease-based claiming, bounded concurrency, expiry enforcement, and exponential backoff with jitter.
/// </summary>
public sealed class EmailOutboxWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IConfiguration _configuration;
    private readonly EmailOutboxMetrics _metrics;
    private readonly ILogger<EmailOutboxWorker> _logger;
    private readonly string _workerId = $"{Environment.MachineName}-{Guid.NewGuid():N}"[..Math.Min(64, Environment.MachineName.Length + 33)];

    public EmailOutboxWorker(
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration,
        EmailOutboxMetrics metrics,
        ILogger<EmailOutboxWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _configuration = configuration;
        _metrics = metrics;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _metrics.SetRunning(true);
        _logger.LogInformation("EmailOutboxWorker {WorkerId} started.", _workerId);

        var pollSeconds = Math.Clamp(_configuration.GetValue<int?>("Email:Worker:PollIntervalSeconds") ?? 5, 1, 300);

        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessPendingBatchAsync(stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _metrics.RecordWorkerError();
                    _logger.LogError(ex, "EmailOutboxWorker {WorkerId} encountered an unhandled polling error.", _workerId);
                }

                await Task.Delay(TimeSpan.FromSeconds(pollSeconds), stoppingToken);
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Graceful shutdown
        }
        finally
        {
            _metrics.SetRunning(false);
            _logger.LogInformation("EmailOutboxWorker {WorkerId} stopped.", _workerId);
        }
    }

    public async Task<int> ProcessPendingBatchAsync(CancellationToken cancellationToken)
    {
        _metrics.RecordPoll();

        var batchSize = Math.Clamp(_configuration.GetValue<int?>("Email:Worker:BatchSize") ?? 20, 1, 200);
        var maxConcurrency = Math.Clamp(_configuration.GetValue<int?>("Email:Worker:MaxConcurrency") ?? 4, 1, 20);
        var leaseSeconds = Math.Clamp(_configuration.GetValue<int?>("Email:Worker:LeaseSeconds") ?? 60, 10, 600);

        List<Guid> claimedIds;
        using (var claimScope = _scopeFactory.CreateScope())
        {
            var db = claimScope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var utcNow = DateTime.UtcNow;

            // 1. Expire any pending or stale-processing messages past their ExpiresAtUtc
            var expiredMessages = await db.EmailOutboxMessages
                .IgnoreQueryFilters()
                .Where(m => !m.IsDeleted &&
                            (m.Status == EmailOutboxStatus.Pending ||
                             (m.Status == EmailOutboxStatus.Processing && m.LockedUntilUtc < utcNow)) &&
                            m.ExpiresAtUtc <= utcNow)
                .Take(batchSize)
                .ToListAsync(cancellationToken);

            if (expiredMessages.Count > 0)
            {
                foreach (var exp in expiredMessages)
                {
                    exp.Status = EmailOutboxStatus.Expired;
                    exp.EncryptedPayload = null;
                    exp.LockedBy = null;
                    exp.LockedUntilUtc = null;
                    exp.LastError = "Message expired before delivery.";
                }
                await db.SaveChangesAsync(cancellationToken);
                _metrics.RecordExpired(expiredMessages.Count);
            }

            // 2. Claim eligible Pending or lease-expired Processing messages
            var candidates = await db.EmailOutboxMessages
                .IgnoreQueryFilters()
                .Where(m => !m.IsDeleted &&
                            m.ExpiresAtUtc > utcNow &&
                            m.AttemptCount < m.MaxAttempts &&
                            ((m.Status == EmailOutboxStatus.Pending && m.NextAttemptAtUtc <= utcNow) ||
                             (m.Status == EmailOutboxStatus.Processing && m.LockedUntilUtc != null && m.LockedUntilUtc < utcNow)))
                .OrderBy(m => m.NextAttemptAtUtc)
                .Take(batchSize)
                .ToListAsync(cancellationToken);

            if (candidates.Count == 0)
            {
                return 0;
            }

            foreach (var msg in candidates)
            {
                msg.Status = EmailOutboxStatus.Processing;
                msg.LockedBy = _workerId;
                msg.LockedUntilUtc = utcNow.AddSeconds(leaseSeconds);
                msg.LastAttemptAtUtc = utcNow;
            }

            try
            {
                await db.SaveChangesAsync(cancellationToken);
                claimedIds = candidates.Select(c => c.Id).ToList();
            }
            catch (DbUpdateConcurrencyException)
            {
                // Another worker instance claimed one or more rows concurrently; next poll will pick remaining rows safely.
                return 0;
            }
        }

        // 3. Process claimed messages with bounded concurrency outside any DB transaction
        using var semaphore = new SemaphoreSlim(maxConcurrency);
        var tasks = claimedIds.Select(async id =>
        {
            await semaphore.WaitAsync(cancellationToken);
            try
            {
                await DeliverSingleMessageAsync(id, cancellationToken);
            }
            finally
            {
                semaphore.Release();
            }
        });

        await Task.WhenAll(tasks);
        return claimedIds.Count;
    }

    private async Task DeliverSingleMessageAsync(Guid outboxId, CancellationToken cancellationToken)
    {
        EmailOutboxMessage? message;
        string secret;

        using (var readScope = _scopeFactory.CreateScope())
        {
            var db = readScope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
            var outboxService = readScope.ServiceProvider.GetRequiredService<IEmailOutboxService>();

            message = await db.EmailOutboxMessages
                .IgnoreQueryFilters()
                .AsNoTracking()
                .FirstOrDefaultAsync(m => m.Id == outboxId && !m.IsDeleted, cancellationToken);

            if (message == null || message.Status != EmailOutboxStatus.Processing || message.LockedBy != _workerId)
            {
                return;
            }

            if (message.ExpiresAtUtc <= DateTime.UtcNow)
            {
                await MarkExpiredAsync(outboxId, cancellationToken);
                return;
            }

            try
            {
                secret = outboxService.DecryptSecret(message.EncryptedPayload ?? string.Empty);
            }
            catch (Exception ex)
            {
                await RecordFailureAsync(outboxId, EmailOutboxService.SanitizeError(ex), forceTerminal: true, cancellationToken);
                return;
            }
        }

        try
        {
            using var sendScope = _scopeFactory.CreateScope();
            var emailSender = sendScope.ServiceProvider.GetRequiredService<IEmailSender>();

            switch (message.EmailType)
            {
                case EmailOutboxTypes.PasswordResetOtp:
                    await emailSender.SendPasswordResetOtpAsync(message.RecipientEmail, message.RecipientName, secret, cancellationToken);
                    break;
                case EmailOutboxTypes.AccountActivation:
                    await emailSender.SendAccountActivationAsync(message.RecipientEmail, message.RecipientName, secret, cancellationToken);
                    break;
                case EmailOutboxTypes.EmailChangeVerification:
                    await emailSender.SendEmailChangeVerificationAsync(message.RecipientEmail, message.RecipientName, secret, cancellationToken);
                    break;
                default:
                    throw new InvalidOperationException($"Unsupported email outbox type '{message.EmailType}'.");
            }

            await MarkSentAsync(outboxId, cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            // Leave lease to expire or next shutdown-safe poll
            throw;
        }
        catch (Exception ex)
        {
            var sanitized = EmailOutboxService.SanitizeError(ex);
            _logger.LogWarning(
                "EmailOutboxWorker failed attempt for {OutboxId} ({EmailType}) to {RecipientEmail}: {Error}",
                outboxId,
                message.EmailType,
                message.RecipientEmail,
                sanitized);
            await RecordFailureAsync(outboxId, sanitized, forceTerminal: false, cancellationToken);
        }
    }

    private async Task MarkSentAsync(Guid outboxId, CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
        var entity = await db.EmailOutboxMessages.IgnoreQueryFilters().FirstOrDefaultAsync(m => m.Id == outboxId, cancellationToken);
        if (entity == null) return;

        entity.Status = EmailOutboxStatus.Sent;
        entity.SentAtUtc = DateTime.UtcNow;
        entity.AttemptCount += 1;
        entity.EncryptedPayload = null;
        entity.LockedBy = null;
        entity.LockedUntilUtc = null;
        entity.LastError = null;
        await db.SaveChangesAsync(cancellationToken);

        _metrics.RecordSent();
        _logger.LogInformation("Outbox email {OutboxId} ({EmailType}) sent to {RecipientEmail}.", entity.Id, entity.EmailType, entity.RecipientEmail);
    }

    private async Task MarkExpiredAsync(Guid outboxId, CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
        var entity = await db.EmailOutboxMessages.IgnoreQueryFilters().FirstOrDefaultAsync(m => m.Id == outboxId, cancellationToken);
        if (entity == null) return;

        entity.Status = EmailOutboxStatus.Expired;
        entity.EncryptedPayload = null;
        entity.LockedBy = null;
        entity.LockedUntilUtc = null;
        entity.LastError = "Message expired before delivery.";
        await db.SaveChangesAsync(cancellationToken);
        _metrics.RecordExpired();
    }

    private async Task RecordFailureAsync(Guid outboxId, string sanitizedError, bool forceTerminal, CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ProjectHubDbContext>();
        var entity = await db.EmailOutboxMessages.IgnoreQueryFilters().FirstOrDefaultAsync(m => m.Id == outboxId, cancellationToken);
        if (entity == null) return;

        var utcNow = DateTime.UtcNow;
        entity.AttemptCount += 1;
        entity.LastAttemptAtUtc = utcNow;
        entity.LastError = sanitizedError;
        entity.LockedBy = null;
        entity.LockedUntilUtc = null;

        if (entity.ExpiresAtUtc <= utcNow)
        {
            entity.Status = EmailOutboxStatus.Expired;
            entity.EncryptedPayload = null;
            _metrics.RecordExpired();
        }
        else if (forceTerminal || entity.AttemptCount >= entity.MaxAttempts)
        {
            entity.Status = EmailOutboxStatus.Failed;
            _metrics.RecordFailed();
        }
        else
        {
            entity.Status = EmailOutboxStatus.Pending;
            entity.NextAttemptAtUtc = utcNow + ComputeBackoffWithJitter(entity.AttemptCount);
            _metrics.RecordRetry();
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    public TimeSpan ComputeBackoffWithJitter(int attemptCount)
    {
        var baseSeconds = Math.Clamp(_configuration.GetValue<int?>("Email:Worker:BaseRetryDelaySeconds") ?? 5, 1, 300);
        var maxSeconds = Math.Clamp(_configuration.GetValue<int?>("Email:Worker:MaxRetryDelaySeconds") ?? 300, baseSeconds, 3600);

        var expSeconds = Math.Min(maxSeconds, baseSeconds * Math.Pow(2, Math.Max(0, attemptCount - 1)));
        var jitterFraction = RandomNumberGenerator.GetInt32(0, 250) / 1000.0;
        var totalSeconds = Math.Min(maxSeconds, expSeconds * (1.0 + jitterFraction));
        return TimeSpan.FromSeconds(totalSeconds);
    }
}

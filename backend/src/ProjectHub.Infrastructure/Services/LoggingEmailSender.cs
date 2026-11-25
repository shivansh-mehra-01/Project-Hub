using Microsoft.Extensions.Logging;
using ProjectHub.Application.Interfaces;

namespace ProjectHub.Infrastructure.Services;

/// <summary>
/// Development-only email sender stub. Never logs OTPs, tokens, or credentials.
/// </summary>
public class LoggingEmailSender : IEmailSender
{
    private readonly ILogger<LoggingEmailSender> _logger;

    public LoggingEmailSender(ILogger<LoggingEmailSender> logger)
    {
        _logger = logger;
    }

    public Task SendPasswordResetOtpAsync(string recipientEmail, string recipientName, string otp, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("[DEV EMAIL] Password reset verification queued for {Email} (content redacted).", recipientEmail);
        return Task.CompletedTask;
    }

    public Task SendAccountActivationAsync(string recipientEmail, string recipientName, string activationToken, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("[DEV EMAIL] Account activation email queued for {Email} (token redacted).", recipientEmail);
        return Task.CompletedTask;
    }

    public Task SendEmailChangeVerificationAsync(string recipientEmail, string recipientName, string otp, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("[DEV EMAIL] Email change verification queued for {Email} (content redacted).", recipientEmail);
        return Task.CompletedTask;
    }
}

using Microsoft.Extensions.Logging;
using ProjectHub.Application.Interfaces;

namespace ProjectHub.Infrastructure.Services;

/// <summary>
/// Development/Production logging email sender. Dispatches OTP to logger and campus console.
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
        _logger.LogInformation("======================================================================");
        _logger.LogInformation("[CAMPUS NOTIFICATION] Dispatched 6-digit Password Reset OTP to {Email} ({Name}): {Otp}", recipientEmail, recipientName, otp);
        _logger.LogInformation("======================================================================");
        return Task.CompletedTask;
    }
}

using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using ProjectHub.Application.Interfaces;

namespace ProjectHub.Infrastructure.Services;

/// <summary>
/// Configurable SMTP email sender for production transactional security emails.
/// Never logs OTPs, activation tokens, or SMTP credentials.
/// </summary>
public class SmtpEmailSender : IEmailSender
{
    private readonly IConfiguration _configuration;
    private readonly IHostEnvironment _environment;
    private readonly ILogger<SmtpEmailSender> _logger;

    public SmtpEmailSender(
        IConfiguration configuration,
        IHostEnvironment environment,
        ILogger<SmtpEmailSender> logger)
    {
        _configuration = configuration;
        _environment = environment;
        _logger = logger;
    }

    public Task SendPasswordResetOtpAsync(string recipientEmail, string recipientName, string otp, CancellationToken cancellationToken = default)
    {
        var subject = "Colabex — Password Reset Verification Code";
        var body = $"""
            Hello {recipientName},

            A password reset or account activation verification code was requested for your Colabex account.
            Your 6-digit verification code is: {otp}

            This code expires in 15 minutes. If you did not request this code, please ignore this email and contact your institutional administrator.
            """;

        return SendAsync(recipientEmail, subject, body, cancellationToken);
    }

    public static string ResolveValidatedFrontendBaseUrl(IConfiguration configuration, bool requireHttps)
    {
        var raw = configuration["Frontend:BaseUrl"]?.Trim();
        if (string.IsNullOrWhiteSpace(raw))
        {
            throw new InvalidOperationException("Frontend:BaseUrl configuration is missing or empty.");
        }

        if (!Uri.TryCreate(raw, UriKind.Absolute, out var uri) ||
            string.IsNullOrWhiteSpace(uri.Host) ||
            (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
        {
            throw new InvalidOperationException("Frontend:BaseUrl must be a valid absolute HTTP/HTTPS URL.");
        }

        if (requireHttps && uri.Scheme != Uri.UriSchemeHttps)
        {
            throw new InvalidOperationException("Production configuration error: Frontend:BaseUrl must use HTTPS.");
        }

        return raw.TrimEnd('/');
    }

    public Task SendAccountActivationAsync(string recipientEmail, string recipientName, string activationToken, CancellationToken cancellationToken = default)
    {
        var frontendBaseUrl = ResolveValidatedFrontendBaseUrl(_configuration, requireHttps: !_environment.IsDevelopment());
        var activationUrl = $"{frontendBaseUrl}/activate?email={Uri.EscapeDataString(recipientEmail)}&token={Uri.EscapeDataString(activationToken)}";

        var subject = "Colabex — Activate Your Institutional Account";
        var body = $"""
            Hello {recipientName},

            Your institutional Colabex account has been provisioned.
            Activate your account and set your password using the link below (valid for 24 hours):

            {activationUrl}

            If you did not expect this invitation, please contact your college administrator.
            """;

        return SendAsync(recipientEmail, subject, body, cancellationToken);
    }

    public Task SendEmailChangeVerificationAsync(string recipientEmail, string recipientName, string otp, CancellationToken cancellationToken = default)
    {
        var subject = "Colabex — Verify Your New Email Address";
        var body = $"""
            Hello {recipientName},

            Use the following 6-digit code to verify your new Colabex email address: {otp}

            This code expires in 10 minutes.
            """;

        return SendAsync(recipientEmail, subject, body, cancellationToken);
    }

    private async Task SendAsync(string recipientEmail, string subject, string body, CancellationToken cancellationToken)
    {
        var host = _configuration["Email:SmtpHost"];
        var port = _configuration.GetValue<int?>("Email:SmtpPort") ?? 587;
        var user = _configuration["Email:SmtpUser"];
        var password = _configuration["Email:SmtpPassword"];
        var fromAddress = _configuration["Email:FromAddress"];
        var fromName = _configuration["Email:FromName"] ?? "Colabex Security";
        var enableSsl = _configuration.GetValue<bool?>("Email:EnableSsl") ?? true;
        var timeoutSeconds = Math.Clamp(_configuration.GetValue<int?>("Email:TimeoutSeconds") ?? 15, 2, 120);

        if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(fromAddress))
        {
            throw new InvalidOperationException("SMTP email configuration (Email:SmtpHost, Email:FromAddress) is missing.");
        }

        using var message = new MailMessage
        {
            From = new MailAddress(fromAddress, fromName),
            Subject = subject,
            Body = body,
            IsBodyHtml = false
        };
        message.To.Add(new MailAddress(recipientEmail));

        using var client = new SmtpClient(host, port)
        {
            EnableSsl = enableSsl,
            DeliveryMethod = SmtpDeliveryMethod.Network,
            Timeout = timeoutSeconds * 1000
        };

        if (!string.IsNullOrWhiteSpace(user) && !string.IsNullOrWhiteSpace(password))
        {
            client.Credentials = new NetworkCredential(user, password);
        }

        await client.SendMailAsync(message, cancellationToken);
        _logger.LogInformation("Security email '{Subject}' dispatched via SMTP to {Email}", subject, recipientEmail);
    }
}

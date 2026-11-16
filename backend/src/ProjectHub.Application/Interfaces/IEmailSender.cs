namespace ProjectHub.Application.Interfaces;

/// <summary>
/// Institutional email and notification dispatcher.
/// </summary>
public interface IEmailSender
{
    Task SendPasswordResetOtpAsync(string recipientEmail, string recipientName, string otp, CancellationToken cancellationToken = default);
}

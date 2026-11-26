namespace ProjectHub.Application.Interfaces;

public static class EmailOutboxTypes
{
    public const string PasswordResetOtp = "PasswordResetOtp";
    public const string AccountActivation = "AccountActivation";
    public const string EmailChangeVerification = "EmailChangeVerification";
}

/// <summary>
/// Enqueues encrypted email delivery records into the current EF Core unit of work
/// so business state changes and email intents commit atomically.
/// </summary>
public interface IEmailOutboxService
{
    void QueuePasswordResetOtp(
        string recipientEmail,
        string recipientName,
        string otp,
        DateTime expiresAtUtc,
        Guid? collegeId,
        string? idempotencyKey = null);

    void QueueAccountActivation(
        string recipientEmail,
        string recipientName,
        string activationToken,
        DateTime expiresAtUtc,
        Guid? collegeId,
        string? idempotencyKey = null);

    void QueueEmailChangeVerification(
        string recipientEmail,
        string recipientName,
        string otp,
        DateTime expiresAtUtc,
        Guid? collegeId,
        string? idempotencyKey = null);

    string DecryptSecret(string encryptedPayload);
}

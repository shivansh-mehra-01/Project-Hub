namespace ProjectHub.Infrastructure.Services;

public sealed class EmailOutboxMetrics
{
    private long _queuedCount;
    private long _sentCount;
    private long _retryCount;
    private long _failedCount;
    private long _expiredCount;
    private long _workerErrorCount;
    private long _lastPollTicks;
    private long _lastSuccessTicks;
    private int _isRunning;

    public long QueuedCount => Interlocked.Read(ref _queuedCount);
    public long SentCount => Interlocked.Read(ref _sentCount);
    public long RetryCount => Interlocked.Read(ref _retryCount);
    public long FailedCount => Interlocked.Read(ref _failedCount);
    public long ExpiredCount => Interlocked.Read(ref _expiredCount);
    public long WorkerErrorCount => Interlocked.Read(ref _workerErrorCount);
    public bool IsRunning => Volatile.Read(ref _isRunning) == 1;

    public DateTime? LastPollAtUtc
    {
        get
        {
            var ticks = Interlocked.Read(ref _lastPollTicks);
            return ticks > 0 ? new DateTime(ticks, DateTimeKind.Utc) : null;
        }
    }

    public DateTime? LastSuccessAtUtc
    {
        get
        {
            var ticks = Interlocked.Read(ref _lastSuccessTicks);
            return ticks > 0 ? new DateTime(ticks, DateTimeKind.Utc) : null;
        }
    }

    public void RecordQueued(int count = 1) => Interlocked.Add(ref _queuedCount, count);
    public void RecordSent()
    {
        Interlocked.Increment(ref _sentCount);
        Interlocked.Exchange(ref _lastSuccessTicks, DateTime.UtcNow.Ticks);
    }
    public void RecordRetry() => Interlocked.Increment(ref _retryCount);
    public void RecordFailed() => Interlocked.Increment(ref _failedCount);
    public void RecordExpired(int count = 1) => Interlocked.Add(ref _expiredCount, count);
    public void RecordWorkerError() => Interlocked.Increment(ref _workerErrorCount);
    public void RecordPoll() => Interlocked.Exchange(ref _lastPollTicks, DateTime.UtcNow.Ticks);
    public void SetRunning(bool running) => Interlocked.Exchange(ref _isRunning, running ? 1 : 0);
}

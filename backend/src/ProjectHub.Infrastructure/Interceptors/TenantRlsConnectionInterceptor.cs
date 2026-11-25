using System.Data.Common;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging;
using ProjectHub.Application.Interfaces;

namespace ProjectHub.Infrastructure.Interceptors;

/// <summary>
/// PostgreSQL Row-Level Security (RLS) Connection Interceptor (Lock 2 of Double-Lock Isolation).
/// Injects session variables into the PostgreSQL connection and transaction to enforce tenant isolation at the database engine level:
/// SET LOCAL app.current_tenant = '{CollegeId}'; SET LOCAL app.is_super_admin = '{IsSuperAdmin}';
/// </summary>
public class TenantRlsConnectionInterceptor : DbConnectionInterceptor, IDbTransactionInterceptor
{
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<TenantRlsConnectionInterceptor> _logger;

    public TenantRlsConnectionInterceptor(
        ITenantContext tenantContext,
        ILogger<TenantRlsConnectionInterceptor> logger)
    {
        _tenantContext = tenantContext;
        _logger = logger;
    }

    public override void ConnectionOpened(DbConnection connection, ConnectionEndEventData eventData)
    {
        SetRlsSessionVariables(connection, transaction: null, isLocal: false);
        base.ConnectionOpened(connection, eventData);
    }

    public override async Task ConnectionOpenedAsync(
        DbConnection connection,
        ConnectionEndEventData eventData,
        CancellationToken cancellationToken = default)
    {
        await SetRlsSessionVariablesAsync(connection, transaction: null, isLocal: false, cancellationToken);
        await base.ConnectionOpenedAsync(connection, eventData, cancellationToken);
    }

    // IDbTransactionInterceptor implementation
    public void TransactionStarted(DbTransaction transaction, TransactionEndEventData eventData)
    {
        if (transaction.Connection != null)
        {
            SetRlsSessionVariables(transaction.Connection, transaction, isLocal: true);
        }
    }

    public async Task TransactionStartedAsync(
        DbTransaction transaction,
        TransactionEndEventData eventData,
        CancellationToken cancellationToken = default)
    {
        if (transaction.Connection != null)
        {
            await SetRlsSessionVariablesAsync(transaction.Connection, transaction, isLocal: true, cancellationToken);
        }
    }

    public InterceptionResult<DbTransaction> TransactionStarting(
        DbConnection connection,
        TransactionStartingEventData eventData,
        InterceptionResult<DbTransaction> result) => result;

    public ValueTask<InterceptionResult<DbTransaction>> TransactionStartingAsync(
        DbConnection connection,
        TransactionStartingEventData eventData,
        InterceptionResult<DbTransaction> result,
        CancellationToken cancellationToken = default) => ValueTask.FromResult(result);

    public void TransactionCommitted(DbTransaction transaction, TransactionEndEventData eventData) { }
    public Task TransactionCommittedAsync(DbTransaction transaction, TransactionEndEventData eventData, CancellationToken cancellationToken = default) => Task.CompletedTask;

    public void TransactionRolledBack(DbTransaction transaction, TransactionEndEventData eventData) { }
    public Task TransactionRolledBackAsync(DbTransaction transaction, TransactionEndEventData eventData, CancellationToken cancellationToken = default) => Task.CompletedTask;

    public void TransactionFailed(DbTransaction transaction, TransactionErrorEventData eventData) { }
    public Task TransactionFailedAsync(DbTransaction transaction, TransactionErrorEventData eventData, CancellationToken cancellationToken = default) => Task.CompletedTask;

    private void SetRlsSessionVariables(DbConnection connection, DbTransaction? transaction, bool isLocal)
    {
        if (!IsPostgreSqlConnection(connection))
            return;

        try
        {
            var sql = BuildSetRlsSql(isLocal);
            using var command = connection.CreateCommand();
            command.CommandText = sql;
            if (transaction != null)
            {
                command.Transaction = transaction;
            }
            command.ExecuteNonQuery();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to set PostgreSQL RLS session variables on connection.");
        }
    }

    private async Task SetRlsSessionVariablesAsync(
        DbConnection connection,
        DbTransaction? transaction,
        bool isLocal,
        CancellationToken cancellationToken)
    {
        if (!IsPostgreSqlConnection(connection))
            return;

        try
        {
            var sql = BuildSetRlsSql(isLocal);
            await using var command = connection.CreateCommand();
            command.CommandText = sql;
            if (transaction != null)
            {
                command.Transaction = transaction;
            }
            await command.ExecuteNonQueryAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to asynchronously set PostgreSQL RLS session variables on connection.");
        }
    }

    public override void ConnectionClosed(DbConnection connection, ConnectionEndEventData eventData)
    {
        ResetRlsSessionVariables(connection);
        base.ConnectionClosed(connection, eventData);
    }

    public override async Task ConnectionClosedAsync(DbConnection connection, ConnectionEndEventData eventData)
    {
        await ResetRlsSessionVariablesAsync(connection);
        await base.ConnectionClosedAsync(connection, eventData);
    }

    private void ResetRlsSessionVariables(DbConnection connection)
    {
        if (!IsPostgreSqlConnection(connection)) return;
        try
        {
            using var command = connection.CreateCommand();
            command.CommandText = "RESET app.current_tenant; RESET app.is_super_admin; RESET app.auth_lookup;";
            command.ExecuteNonQuery();
        }
        catch { }
    }

    private async Task ResetRlsSessionVariablesAsync(DbConnection connection)
    {
        if (!IsPostgreSqlConnection(connection)) return;
        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = "RESET app.current_tenant; RESET app.is_super_admin; RESET app.auth_lookup;";
            await command.ExecuteNonQueryAsync();
        }
        catch { }
    }

    private string BuildSetRlsSql(bool isLocal)
    {
        var localKeyword = isLocal ? "LOCAL " : "";
        var tenantId = _tenantContext.CollegeId?.ToString("D") ?? string.Empty;
        var isSuperAdmin = _tenantContext.IsSuperAdmin ? "true" : "false";
        var isAuthLookup = _tenantContext.IsAuthLookup ? "true" : "false";

        return $"SET {localKeyword}app.current_tenant = '{tenantId}'; SET {localKeyword}app.is_super_admin = '{isSuperAdmin}'; SET {localKeyword}app.auth_lookup = '{isAuthLookup}';";
    }

    private static bool IsPostgreSqlConnection(DbConnection connection)
    {
        var typeName = connection.GetType().FullName ?? string.Empty;
        return typeName.Contains("Npgsql", StringComparison.OrdinalIgnoreCase);
    }
}

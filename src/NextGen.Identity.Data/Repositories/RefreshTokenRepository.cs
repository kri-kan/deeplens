using Dapper;
using NextGen.Identity.Core.Entities;
using NextGen.Identity.Core.Interfaces;
using System.Diagnostics;

namespace NextGen.Identity.Data.Repositories;

public class RefreshTokenRepository : IRefreshTokenRepository
{
    private readonly DbConnectionFactory _connectionFactory;

    public RefreshTokenRepository(DbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<RefreshToken?> GetByTokenAsync(string token)
    {
        using var activity = Telemetry.ActivitySource.StartActivity(Telemetry.Operations.DatabaseQuery);
        activity?.SetTag(Telemetry.Tags.DbTable, "refresh_tokens");
        activity?.SetTag(Telemetry.Tags.DbOperation, "select");
        activity?.SetTag(Telemetry.Tags.TokenType, "refresh");

        const string sql = @"
            SELECT id, user_id AS userid, token, expires_at AS expiresat, 
                   created_at AS createdat, is_revoked AS isrevoked, 
                   revoked_at AS revokedat, revoked_reason AS revokedreason,
                   ip_address AS ipaddress, user_agent AS useragent
            FROM refresh_tokens
            WHERE token = @Token";

        try
        {
            using var connection = _connectionFactory.CreateConnection();
            return await connection.QuerySingleOrDefaultAsync<RefreshToken>(sql, new { Token = token });
        }
        catch (Exception ex)
        {
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            activity?.SetTag(Telemetry.Tags.ErrorMessage, ex.Message);
            throw;
        }
    }

    public async Task<RefreshToken> CreateAsync(RefreshToken refreshToken)
    {
        using var activity = Telemetry.ActivitySource.StartActivity(Telemetry.Operations.DatabaseCommand);
        activity?.SetTag(Telemetry.Tags.DbTable, "refresh_tokens");
        activity?.SetTag(Telemetry.Tags.DbOperation, "insert");
        activity?.SetTag(Telemetry.Tags.UserId, refreshToken.UserId);
        activity?.SetTag(Telemetry.Tags.TokenType, "refresh");

        const string sql = @"
            INSERT INTO refresh_tokens (id, user_id, token, expires_at, created_at,
                                      is_revoked, ip_address, user_agent)
            VALUES (@Id, @UserId, @Token, @ExpiresAt, @CreatedAt,
                    @IsRevoked, @IpAddress, @UserAgent)
            RETURNING id";

        try
        {
            using var connection = _connectionFactory.CreateConnection();
            refreshToken.Id = await connection.ExecuteScalarAsync<Guid>(sql, refreshToken);
            return refreshToken;
        }
        catch (Exception ex)
        {
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            activity?.SetTag(Telemetry.Tags.ErrorMessage, ex.Message);
            throw;
        }
    }

    public async Task UpdateAsync(RefreshToken refreshToken)
    {
        using var activity = Telemetry.ActivitySource.StartActivity(Telemetry.Operations.DatabaseCommand);
        activity?.SetTag(Telemetry.Tags.DbTable, "refresh_tokens");
        activity?.SetTag(Telemetry.Tags.DbOperation, "update");
        activity?.SetTag(Telemetry.Tags.TokenType, "refresh");

        const string sql = @"
            UPDATE refresh_tokens
            SET is_revoked = @IsRevoked,
                revoked_at = @RevokedAt,
                revoked_reason = @RevokedReason
            WHERE id = @Id";

        try
        {
            using var connection = _connectionFactory.CreateConnection();
            await connection.ExecuteAsync(sql, refreshToken);
        }
        catch (Exception ex)
        {
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            activity?.SetTag(Telemetry.Tags.ErrorMessage, ex.Message);
            throw;
        }
    }

    public async Task RevokeAllForUserAsync(Guid userId)
    {
        using var activity = Telemetry.ActivitySource.StartActivity(Telemetry.Operations.DatabaseCommand);
        activity?.SetTag(Telemetry.Tags.DbTable, "refresh_tokens");
        activity?.SetTag(Telemetry.Tags.DbOperation, "update");
        activity?.SetTag(Telemetry.Tags.UserId, userId);
        activity?.SetTag(Telemetry.Tags.TokenType, "refresh");

        const string sql = @"
            UPDATE refresh_tokens
            SET is_revoked = TRUE,
                revoked_at = @RevokedAt,
                revoked_reason = 'All tokens revoked'
            WHERE user_id = @UserId AND is_revoked = FALSE";

        try
        {
            using var connection = _connectionFactory.CreateConnection();
            await connection.ExecuteAsync(sql, new { UserId = userId, RevokedAt = DateTime.UtcNow });
        }
        catch (Exception ex)
        {
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            activity?.SetTag(Telemetry.Tags.ErrorMessage, ex.Message);
            throw;
        }
    }
}

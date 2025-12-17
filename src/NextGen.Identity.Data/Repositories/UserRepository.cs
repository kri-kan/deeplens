using Dapper;
using NextGen.Identity.Core.Entities;
using NextGen.Identity.Core.Interfaces;
using System.Diagnostics;

namespace NextGen.Identity.Data.Repositories;

public class UserRepository : IUserRepository
{
    private readonly DbConnectionFactory _connectionFactory;

    public UserRepository(DbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<User?> GetByIdAsync(Guid id)
    {
        using var activity = Telemetry.ActivitySource.StartActivity(Telemetry.Operations.DatabaseQuery);
        activity?.SetTag(Telemetry.Tags.DbTable, "users");
        activity?.SetTag(Telemetry.Tags.DbOperation, "select");
        activity?.SetTag(Telemetry.Tags.UserId, id);

        const string sql = @"
            SELECT id, tenant_id AS tenantid, email, password_hash AS passwordhash, 
                   first_name AS firstname, last_name AS lastname, email_confirmed AS emailconfirmed,
                   email_confirmation_token AS emailconfirmationtoken, 
                   email_confirmation_token_expiry AS emailconfirmationtokenexpiry,
                   password_reset_token AS passwordresettoken, 
                   password_reset_token_expiry AS passwordresettokenexpiry,
                   role, is_active AS isactive, created_at AS createdat, 
                   last_login_at AS lastloginat, updated_at AS updatedat, deleted_at AS deletedat
            FROM users
            WHERE id = @Id AND deleted_at IS NULL";

        try
        {
            using var connection = _connectionFactory.CreateConnection();
            return await connection.QuerySingleOrDefaultAsync<User>(sql, new { Id = id });
        }
        catch (Exception ex)
        {
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            activity?.SetTag(Telemetry.Tags.ErrorMessage, ex.Message);
            throw;
        }
    }

    public async Task<User?> GetByEmailAsync(string email)
    {
        using var activity = Telemetry.ActivitySource.StartActivity(Telemetry.Operations.DatabaseQuery);
        activity?.SetTag(Telemetry.Tags.DbTable, "users");
        activity?.SetTag(Telemetry.Tags.DbOperation, "select");
        activity?.SetTag(Telemetry.Tags.UserEmail, email);

        const string sql = @"
            SELECT id, tenant_id AS tenantid, email, password_hash AS passwordhash, 
                   first_name AS firstname, last_name AS lastname, email_confirmed AS emailconfirmed,
                   email_confirmation_token AS emailconfirmationtoken, 
                   email_confirmation_token_expiry AS emailconfirmationtokenexpiry,
                   password_reset_token AS passwordresettoken, 
                   password_reset_token_expiry AS passwordresettokenexpiry,
                   role, is_active AS isactive, created_at AS createdat, 
                   last_login_at AS lastloginat, updated_at AS updatedat, deleted_at AS deletedat
            FROM users
            WHERE LOWER(email) = LOWER(@Email) AND deleted_at IS NULL";

        try
        {
            using var connection = _connectionFactory.CreateConnection();
            return await connection.QuerySingleOrDefaultAsync<User>(sql, new { Email = email });
        }
        catch (Exception ex)
        {
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            activity?.SetTag(Telemetry.Tags.ErrorMessage, ex.Message);
            throw;
        }
    }

    public async Task<User> CreateAsync(User user)
    {
        using var activity = Telemetry.ActivitySource.StartActivity(Telemetry.Operations.DatabaseCommand);
        activity?.SetTag(Telemetry.Tags.DbTable, "users");
        activity?.SetTag(Telemetry.Tags.DbOperation, "insert");
        activity?.SetTag(Telemetry.Tags.TenantId, user.TenantId);
        activity?.SetTag(Telemetry.Tags.UserEmail, user.Email);

        const string sql = @"
            INSERT INTO users (id, tenant_id, email, password_hash, first_name, last_name, 
                             email_confirmed, role, is_active, created_at)
            VALUES (@Id, @TenantId, @Email, @PasswordHash, @FirstName, @LastName, 
                    @EmailConfirmed, @Role, @IsActive, @CreatedAt)
            RETURNING id";

        try
        {
            using var connection = _connectionFactory.CreateConnection();
            user.Id = await connection.ExecuteScalarAsync<Guid>(sql, user);
            return user;
        }
        catch (Exception ex)
        {
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            activity?.SetTag(Telemetry.Tags.ErrorMessage, ex.Message);
            throw;
        }
    }

    public async Task UpdateAsync(User user)
    {
        using var activity = Telemetry.ActivitySource.StartActivity(Telemetry.Operations.DatabaseCommand);
        activity?.SetTag(Telemetry.Tags.DbTable, "users");
        activity?.SetTag(Telemetry.Tags.DbOperation, "update");
        activity?.SetTag(Telemetry.Tags.UserId, user.Id);
        activity?.SetTag(Telemetry.Tags.TenantId, user.TenantId);

        const string sql = @"
            UPDATE users
            SET email = @Email,
                password_hash = @PasswordHash,
                first_name = @FirstName,
                last_name = @LastName,
                email_confirmed = @EmailConfirmed,
                email_confirmation_token = @EmailConfirmationToken,
                email_confirmation_token_expiry = @EmailConfirmationTokenExpiry,
                password_reset_token = @PasswordResetToken,
                password_reset_token_expiry = @PasswordResetTokenExpiry,
                role = @Role,
                is_active = @IsActive,
                last_login_at = @LastLoginAt,
                updated_at = @UpdatedAt
            WHERE id = @Id";

        try
        {
            using var connection = _connectionFactory.CreateConnection();
            await connection.ExecuteAsync(sql, user);
        }
        catch (Exception ex)
        {
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            activity?.SetTag(Telemetry.Tags.ErrorMessage, ex.Message);
            throw;
        }
    }
}

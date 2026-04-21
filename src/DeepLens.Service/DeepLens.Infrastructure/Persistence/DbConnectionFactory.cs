using System.Data;
using DeepLens.Application.Abstractions.Data;
using Microsoft.Extensions.Configuration;
using Npgsql;

namespace DeepLens.Infrastructure.Persistence;

public class DbConnectionFactory : IDbConnectionFactory
{
    private readonly string _connectionString;

    public DbConnectionFactory(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection") 
                         ?? throw new InvalidOperationException("DefaultConnection string not found");
    }

    public IDbConnection CreateConnection()
    {
        var connection = new NpgsqlConnection(_connectionString);
        connection.Open();
        return connection;
    }

    public async Task<IDbConnection> CreateConnectionAsync()
    {
        var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();
        return connection;
    }
}

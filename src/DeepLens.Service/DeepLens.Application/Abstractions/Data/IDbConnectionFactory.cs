using System.Data;

namespace DeepLens.Application.Abstractions.Data;

public interface IDbConnectionFactory
{
    IDbConnection CreateConnection();
    Task<IDbConnection> CreateConnectionAsync();
}

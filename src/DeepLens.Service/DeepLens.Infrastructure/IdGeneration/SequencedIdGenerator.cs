using Dapper;
using DeepLens.Application.Abstractions.Data;
using DeepLens.Application.Abstractions.IdGeneration;

namespace DeepLens.Infrastructure.IdGeneration;

public class SequencedIdGenerator : ISequencedIdGenerator
{
    private readonly IDbConnectionFactory _dbConnectionFactory;

    public SequencedIdGenerator(IDbConnectionFactory dbConnectionFactory)
    {
        _dbConnectionFactory = dbConnectionFactory;
    }

    public async Task<string> GetNextOrderIdAsync()
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        var nextValue = await connection.QuerySingleAsync<long>("SELECT nextval('\"orderId_id_seq\"')");
        return ToBase36(nextValue, 5);
    }

    public async Task<string> GetNextProductIdAsync()
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        var nextValue = await connection.QuerySingleAsync<long>("SELECT nextval('\"productId_id_seq\"')");
        
        return nextValue.ToString("X3");
    }

    public async Task<long> GetNextCustomerDummyIdAsync()
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        return await connection.QuerySingleAsync<long>("SELECT nextval('customer_dummy_id_seq')");
    }

    private static string ToBase36(long value, int minLength)
    {
        const string chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        if (value == 0) return "0".PadLeft(minLength, '0');

        var result = new System.Collections.Generic.List<char>();
        while (value > 0)
        {
            result.Add(chars[(int)(value % 36)]);
            value /= 36;
        }
        result.Reverse();
        
        string s = new string(result.ToArray());
        return s.Length < minLength ? s.PadLeft(minLength, '0') : s;
    }
}

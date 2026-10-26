using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Dapper;
using DeepLens.SearchApi.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Npgsql;

namespace DeepLens.SearchApi.Services;

public class DapperCatalogProductRepository : ICatalogProductRepository
{
    private readonly string _connectionString;
    private readonly ILogger<DapperCatalogProductRepository>? _logger;

    public DapperCatalogProductRepository(IConfiguration configuration, ILogger<DapperCatalogProductRepository>? logger = null)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("DefaultConnection string not found");
        _logger = logger;
    }

    private async Task<NpgsqlConnection> GetConnectionAsync()
    {
        var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();
        return conn;
    }

    public async Task<IReadOnlyList<CatalogProduct>> GetProductsByIdsAsync(IEnumerable<Guid> ids, CancellationToken ct = default)
    {
        var idList = ids.ToArray();
        if (idList.Length == 0) return Array.Empty<CatalogProduct>();

        using var conn = await GetConnectionAsync();
        const string sql = @"
            SELECT 
                p.id AS Id,
                COALESCE(p.base_sku, '') AS Sku,
                COALESCE(p.title, '') AS Title,
                COALESCE(p.is_published, FALSE) AS IsPublished,
                COALESCE(p.created_at, NOW()) AS CreatedAt,
                p.store_publish_updated_at AS StorePublishUpdatedAt,
                p.media_updated_at AS MediaUpdatedAt
            FROM products p
            WHERE p.id = ANY(@Ids) AND (p.is_deleted IS NULL OR p.is_deleted = FALSE)";

        var results = await conn.QueryAsync<CatalogProduct>(new CommandDefinition(sql, new { Ids = idList }, cancellationToken: ct));
        return results.ToList();
    }

    public async Task<CatalogProduct> UpdateProductAsync(CatalogProduct product, CancellationToken ct = default)
    {
        using var conn = await GetConnectionAsync();
        const string sql = @"
            UPDATE products
            SET media_updated_at = @MediaUpdatedAt,
                updated_at = NOW()
            WHERE id = @Id";

        await conn.ExecuteAsync(new CommandDefinition(sql, new { product.Id, product.MediaUpdatedAt }, cancellationToken: ct));
        return product;
    }

    public async Task RecordMergeAuditAsync(Guid winnerId, IEnumerable<Guid> loserIds, bool isAnchored, CancellationToken ct = default)
    {
        var losers = loserIds.ToArray();
        if (losers.Length == 0) return;

        using var conn = await GetConnectionAsync();
        using var trans = await conn.BeginTransactionAsync(ct);

        try
        {
            // 1. Soft-delete losers
            const string updateLosersSql = @"
                UPDATE products
                SET is_deleted = TRUE,
                    updated_at = NOW()
                WHERE id = ANY(@Losers)";

            await conn.ExecuteAsync(new CommandDefinition(updateLosersSql, new { Losers = losers }, transaction: trans, cancellationToken: ct));

            // 2. Record merge relationship audit in product_merges
            const string auditSql = @"
                INSERT INTO product_merges (source_id, target_id, merged_at, metadata)
                SELECT unnest(@Losers), @WinnerId, NOW(), jsonb_build_object('is_anchored', @IsAnchored, 'source', 'ProductMergeService')
                ON CONFLICT (source_id) DO UPDATE 
                SET target_id = EXCLUDED.target_id, 
                    merged_at = EXCLUDED.merged_at, 
                    metadata = EXCLUDED.metadata";

            await conn.ExecuteAsync(new CommandDefinition(auditSql, new { Losers = losers, WinnerId = winnerId, IsAnchored = isAnchored }, transaction: trans, cancellationToken: ct));

            await trans.CommitAsync(ct);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to record merge audit for winner {WinnerId} and losers {Losers}", winnerId, string.Join(",", losers));
            await trans.RollbackAsync(ct);
            throw;
        }
    }
}

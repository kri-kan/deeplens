using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Npgsql;
using Dapper;

namespace DeepLens.WorkerService.Workers;

public class PerceptualHashCache
{
    private readonly string _connectionString;
    private readonly ILogger<PerceptualHashCache> _logger;
    private readonly List<CacheEntry> _cache = new();
    private readonly object _lock = new();
    private int _isInitialized = 0;

    public PerceptualHashCache(string connectionString, ILogger<PerceptualHashCache> logger)
    {
        _connectionString = connectionString;
        _logger = logger;
    }

    public class CacheEntry
    {
        public Guid MediaId { get; set; }
        public Guid ProductId { get; set; }
        public required string Phash { get; set; }
        public required string Category { get; set; }
    }

    public async Task InitializeAsync(CancellationToken cancellationToken)
    {
        if (Interlocked.CompareExchange(ref _isInitialized, 1, 0) != 0)
        {
            return;
        }

        _logger.LogInformation("Initializing PerceptualHashCache from database...");

        try
        {
            using var conn = new NpgsqlConnection(_connectionString);
            await conn.OpenAsync(cancellationToken);

            // Select all media with phash that are linked to a non-deleted product.
            // Exclude image/webp (stickers) — they appear in every group and would
            // produce false-positive duplicate matches across unrelated products.
            const string sql = @"
                SELECT m.id AS MediaId, ml.entity_id AS ProductId, m.phash AS Phash, COALESCE(c.name, m.category, 'Others') AS Category
                FROM public.media m
                INNER JOIN public.media_links ml ON m.id = ml.media_id
                INNER JOIN public.products p ON ml.entity_id = p.id
                LEFT JOIN public.categories c ON p.category_id = c.id
                WHERE m.phash IS NOT NULL
                  AND ml.entity_type = 'product'
                  AND p.is_deleted = false
                  AND LOWER(m.mime_type) != 'image/webp'";

            var entries = await conn.QueryAsync<CacheEntry>(sql);
            int count = 0;
            lock (_lock)
            {
                _cache.Clear();
                foreach (var entry in entries)
                {
                    _cache.Add(entry);
                    count++;
                }
            }

            _logger.LogInformation("PerceptualHashCache initialized with {Count} entries from database.", count);
        }
        catch (Exception ex)
        {
            _isInitialized = 0; // Allow retry on failure
            _logger.LogError(ex, "Failed to initialize PerceptualHashCache from database.");
            throw;
        }
    }

    public IEnumerable<CacheEntry> GetAll()
    {
        lock (_lock)
        {
            return _cache.ToList(); // Return a copy to avoid concurrent modification issues during enumeration
        }
    }

    public void Add(Guid mediaId, Guid productId, string phash, string category)
    {
        lock (_lock)
        {
            var existing = _cache.FirstOrDefault(e => e.MediaId == mediaId);
            if (existing != null)
            {
                existing.ProductId = productId;
                existing.Phash = phash;
                existing.Category = category;
            }
            else
            {
                _cache.Add(new CacheEntry
                {
                    MediaId = mediaId,
                    ProductId = productId,
                    Phash = phash,
                    Category = category
                });
            }
        }
    }

    public void UpdateCategory(Guid productId, string newCategory)
    {
        lock (_lock)
        {
            foreach (var entry in _cache)
            {
                if (entry.ProductId == productId)
                {
                    entry.Category = newCategory;
                }
            }
        }
    }

    public void RemoveProduct(Guid productId)
    {
        lock (_lock)
        {
            _cache.RemoveAll(e => e.ProductId == productId);
        }
    }

    public void MergeProducts(Guid sourceProductId, Guid targetProductId)
    {
        lock (_lock)
        {
            foreach (var entry in _cache)
            {
                if (entry.ProductId == sourceProductId)
                {
                    entry.ProductId = targetProductId;
                }
            }
        }
    }
}

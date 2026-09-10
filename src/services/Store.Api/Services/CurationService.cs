using System.Collections.Concurrent;
using System.Text.Json;
using Store.Api.Models;

namespace Store.Api.Services;

public class CurationService : ICurationService
{
    private static readonly ConcurrentDictionary<Guid, StoreProductDto> _products = new();
    private static readonly ConcurrentDictionary<Guid, List<StoreProductAuditDto>> _auditLogs = new();
    private readonly ILogger<CurationService> _logger;

    public CurationService(ILogger<CurationService> logger)
    {
        _logger = logger;
        try
        {
            if (_products.IsEmpty)
            {
                var candidatePaths = new[]
                {
                    Path.Combine(AppContext.BaseDirectory, "data", "in_store_curations.json"),
                    Path.Combine(Directory.GetCurrentDirectory(), "data", "in_store_curations.json"),
                    "/home/krikan/productivity/deeplens/src/services/Store.Api/data/in_store_curations.json"
                };

                foreach (var path in candidatePaths)
                {
                    if (File.Exists(path))
                    {
                        var json = File.ReadAllText(path);
                        var loaded = JsonSerializer.Deserialize<List<StoreProductDto>>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                        if (loaded != null && loaded.Count > 0)
                        {
                            foreach (var p in loaded)
                            {
                                _products[p.Id] = p;
                            }
                            _logger.LogInformation("Loaded {Count} curations from {Path}", loaded.Count, path);
                            break;
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not load persisted curations from disk");
        }
    }

    private void SaveToDisk()
    {
        try
        {
            var dir = "/home/krikan/productivity/deeplens/src/services/Store.Api/data";
            Directory.CreateDirectory(dir);
            var file = Path.Combine(dir, "in_store_curations.json");
            var json = JsonSerializer.Serialize(_products.Values.ToList(), new JsonSerializerOptions { WriteIndented = true });
            File.WriteAllText(file, json);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not persist curations to disk");
        }
    }

    public Task<int> BatchPublishProductsAsync(List<PublishProductRequest> requests, string authorEmail)
    {
        var count = 0;
        foreach (var req in requests)
        {
            var existing = _products.Values.FirstOrDefault(p => p.VayyariProductId == req.VayyariProductId);
            var id = existing?.Id ?? Guid.NewGuid();

            var mediaList = req.MediaUrls.Select((url, idx) => new StoreMediaItemDto(
                Id: $"m_{idx + 1}_{id:N}"[..12],
                Url: url,
                MediaType: 1,
                Order: idx + 1,
                DwellSeconds: 0.0,
                IsCover: idx == 0
            )).ToList();

            var mrp = req.BaseCost > 0 ? Math.Round(req.BaseCost * 1.6m, 0) : 9999m;
            var salePrice = req.BaseCost > 0 ? Math.Round(req.BaseCost * 1.3m, 0) : 7999m;

            var product = new StoreProductDto(
                Id: id,
                VayyariProductId: req.VayyariProductId,
                ProductCode: req.ProductCode,
                Title: req.Title,
                Description: req.Description,
                CategoryName: req.CategoryName,
                Fabric: req.Fabric,
                BaseCost: req.BaseCost,
                Mrp: mrp,
                SalePrice: salePrice,
                LifecycleStatus: "available",
                StockQuantity: 10,
                ColorGroupId: null,
                ColorwayName: "Standard",
                ColorHex: "#1B4D3E",
                MediaOrder: mediaList,
                Tags: new List<string> { req.CategoryName, req.Fabric ?? "Ethnic" }.Where(t => !string.IsNullOrEmpty(t)).ToList(),
                IsPublished: true,
                PublishedAt: DateTime.UtcNow
            );

            _products[id] = product;

            var auditList = _auditLogs.GetOrAdd(id, _ => new List<StoreProductAuditDto>());
            auditList.Add(new StoreProductAuditDto(
                Id: Guid.NewGuid(),
                StoreProductId: id,
                ActionType: existing == null ? "created" : "re_synced",
                FieldName: "publish",
                OldValue: existing == null ? null : "synced",
                NewValue: "published_in_store",
                AuthorEmail: authorEmail,
                CreatedAt: DateTime.UtcNow
            ));

            count++;
        }

        SaveToDisk();
        _logger.LogInformation("Batch published {Count} products into Store by {Author}", count, authorEmail);
        return Task.FromResult(count);
    }

    public Task<List<StoreProductDto>> GetInStoreProductsAsync(string? category = null, string? search = null, string? lifecycle = null)
    {
        var query = _products.Values.AsEnumerable();

        if (!string.IsNullOrWhiteSpace(category) && !category.Equals("All", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(p => p.CategoryName.Equals(category, StringComparison.OrdinalIgnoreCase));
        }

        if (!string.IsNullOrWhiteSpace(lifecycle) && !lifecycle.Equals("All", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(p => p.LifecycleStatus.Equals(lifecycle, StringComparison.OrdinalIgnoreCase));
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            query = query.Where(p =>
                p.ProductCode.Contains(s, StringComparison.OrdinalIgnoreCase) ||
                p.Title.Contains(s, StringComparison.OrdinalIgnoreCase) ||
                p.CategoryName.Contains(s, StringComparison.OrdinalIgnoreCase)
            );
        }

        return Task.FromResult(query.OrderByDescending(p => p.PublishedAt).ToList());
    }

    public Task<StoreProductCurationDto?> GetProductCurationAsync(Guid id)
    {
        if (!_products.TryGetValue(id, out var product))
        {
            // Also search by VayyariProductId
            product = _products.Values.FirstOrDefault(p => p.VayyariProductId == id);
            if (product == null) return Task.FromResult<StoreProductCurationDto?>(null);
        }

        _auditLogs.TryGetValue(product.Id, out var logs);
        var auditHistory = logs ?? new List<StoreProductAuditDto>();

        // Find smart dwell suggestions (e.g. if a non-cover image has higher dwell than cover)
        var suggestions = new List<string>();
        var highestDwell = product.MediaOrder.OrderByDescending(m => m.DwellSeconds).FirstOrDefault();
        if (highestDwell != null && !highestDwell.IsCover && highestDwell.DwellSeconds > 3.0)
        {
            suggestions.Add($"Media Slide #{highestDwell.Order} has the highest dwell time ({highestDwell.DwellSeconds:F1}s). Suggest promoting to Cover Hero.");
        }

        var dto = new StoreProductCurationDto(
            Product: product,
            AuditHistory: auditHistory.OrderByDescending(a => a.CreatedAt).ToList(),
            SmartDwellSuggestions: suggestions
        );

        return Task.FromResult<StoreProductCurationDto?>(dto);
    }

    public Task<bool> UpdateProductCurationAsync(Guid id, UpdateCurationRequest req, string authorEmail)
    {
        if (!_products.TryGetValue(id, out var current))
        {
            current = _products.Values.FirstOrDefault(p => p.VayyariProductId == id);
            if (current == null) return Task.FromResult(false);
            id = current.Id;
        }

        var auditList = _auditLogs.GetOrAdd(id, _ => new List<StoreProductAuditDto>());

        // Log field level diffs
        if (req.LifecycleStatus != null && req.LifecycleStatus != current.LifecycleStatus)
        {
            auditList.Add(new(Guid.NewGuid(), id, "lifecycle_changed", "lifecycleStatus", current.LifecycleStatus, req.LifecycleStatus, authorEmail, DateTime.UtcNow));
        }
        if (req.SalePrice.HasValue && req.SalePrice.Value != current.SalePrice)
        {
            auditList.Add(new(Guid.NewGuid(), id, "price_updated", "salePrice", $"₹{current.SalePrice:N0}", $"₹{req.SalePrice.Value:N0}", authorEmail, DateTime.UtcNow));
        }
        if (req.Mrp.HasValue && req.Mrp.Value != current.Mrp)
        {
            auditList.Add(new(Guid.NewGuid(), id, "price_updated", "mrp", $"₹{current.Mrp:N0}", $"₹{req.Mrp.Value:N0}", authorEmail, DateTime.UtcNow));
        }
        if (req.ColorwayName != null && req.ColorwayName != current.ColorwayName)
        {
            auditList.Add(new(Guid.NewGuid(), id, "colorway_updated", "colorwayName", current.ColorwayName, req.ColorwayName, authorEmail, DateTime.UtcNow));
        }

        var updated = current with
        {
            LifecycleStatus = req.LifecycleStatus ?? current.LifecycleStatus,
            StockQuantity = req.StockQuantity ?? current.StockQuantity,
            Mrp = req.Mrp ?? current.Mrp,
            SalePrice = req.SalePrice ?? current.SalePrice,
            ColorGroupId = req.ColorGroupId ?? current.ColorGroupId,
            ColorwayName = req.ColorwayName ?? current.ColorwayName,
            ColorHex = req.ColorHex ?? current.ColorHex,
            MediaOrder = req.MediaOrder ?? current.MediaOrder,
            Tags = req.Tags ?? current.Tags,
        };

        _products[id] = updated;
        SaveToDisk();
        _logger.LogInformation("Updated curation for product {Id} ({Code}) by {Author}", id, updated.ProductCode, authorEmail);
        return Task.FromResult(true);
    }
}

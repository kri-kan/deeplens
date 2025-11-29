using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using System.Net.Http.Headers;

namespace DeepLens.Infrastructure.Services;

/// <summary>
/// Handles all Qdrant vector database operations for multi-tenant image similarity search.
/// Provides collection management, vector indexing, and similarity search with proper isolation.
/// </summary>
public interface IVectorStoreService
{
    // Collection Management
    Task<bool> CreateCollectionAsync(string tenantId, string modelName, int vectorDimension, CancellationToken cancellationToken = default);
    Task<bool> DeleteCollectionAsync(string tenantId, string modelName, CancellationToken cancellationToken = default);
    Task<bool> CollectionExistsAsync(string tenantId, string modelName, CancellationToken cancellationToken = default);
    Task<CollectionInfo> GetCollectionInfoAsync(string tenantId, string modelName, CancellationToken cancellationToken = default);
    
    // Vector Operations
    Task<bool> IndexVectorAsync(string tenantId, string modelName, string imageId, float[] vector, 
        Dictionary<string, object>? metadata = null, CancellationToken cancellationToken = default);
    Task<bool> IndexVectorsBatchAsync(string tenantId, string modelName, 
        IEnumerable<VectorDocument> vectors, CancellationToken cancellationToken = default);
    
    // Search Operations  
    Task<SimilaritySearchResult> SearchSimilarAsync(string tenantId, string modelName, float[] queryVector,
        int limit = 10, float threshold = 0.7f, Dictionary<string, object>? filter = null,
        CancellationToken cancellationToken = default);
    
    // Maintenance Operations
    Task<bool> DeleteVectorAsync(string tenantId, string modelName, string imageId, CancellationToken cancellationToken = default);
    Task<CollectionStats> GetCollectionStatsAsync(string tenantId, string modelName, CancellationToken cancellationToken = default);
    Task OptimizeCollectionAsync(string tenantId, string modelName, CancellationToken cancellationToken = default);
}

public class VectorStoreService : IVectorStoreService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<VectorStoreService> _logger;
    private readonly string _qdrantUrl;
    private readonly string _defaultVectorSize;

    public VectorStoreService(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<VectorStoreService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _qdrantUrl = configuration.GetConnectionString("Qdrant") ?? "http://localhost:6333";
        _defaultVectorSize = configuration["Qdrant:DefaultVectorSize"] ?? "2048"; // ResNet50 Phase 1
        
        _httpClient.BaseAddress = new Uri(_qdrantUrl);
        _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
    }

    public async Task<bool> CreateCollectionAsync(string tenantId, string modelName, int vectorDimension, 
        CancellationToken cancellationToken = default)
    {
        try
        {
            var collectionName = GetCollectionName(tenantId, modelName);
            
            var createRequest = new
            {
                vectors = new
                {
                    size = vectorDimension,
                    distance = "Cosine"  // Best for image similarity
                },
                optimizers_config = new
                {
                    default_segment_number = 2,
                    max_segment_size = 20000,
                    memmap_threshold = 20000,
                    indexing_threshold = 20000
                },
                replication_factor = 1,  // Single node for Phase 1
                write_consistency_factor = 1,
                shard_number = 1
            };

            var json = JsonSerializer.Serialize(createRequest);
            var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");
            
            var response = await _httpClient.PutAsync($"/collections/{collectionName}", content, cancellationToken);
            
            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Successfully created Qdrant collection {CollectionName} for tenant {TenantId} with model {ModelName}",
                    collectionName, tenantId, modelName);
                return true;
            }
            
            var errorContent = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogError("Failed to create Qdrant collection {CollectionName}: {StatusCode} - {Error}",
                collectionName, response.StatusCode, errorContent);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception creating Qdrant collection for tenant {TenantId} model {ModelName}",
                tenantId, modelName);
            return false;
        }
    }

    public async Task<bool> IndexVectorAsync(string tenantId, string modelName, string imageId, float[] vector,
        Dictionary<string, object>? metadata = null, CancellationToken cancellationToken = default)
    {
        try
        {
            var collectionName = GetCollectionName(tenantId, modelName);
            
            var payload = new Dictionary<string, object>
            {
                ["image_id"] = imageId,
                ["tenant_id"] = tenantId,
                ["model_name"] = modelName,
                ["indexed_at"] = DateTime.UtcNow.ToString("O")
            };
            
            if (metadata != null)
            {
                foreach (var kvp in metadata)
                    payload[kvp.Key] = kvp.Value;
            }

            var indexRequest = new
            {
                points = new[]
                {
                    new
                    {
                        id = Guid.NewGuid().ToString(),
                        vector = vector,
                        payload = payload
                    }
                }
            };

            var json = JsonSerializer.Serialize(indexRequest);
            var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");
            
            var response = await _httpClient.PutAsync($"/collections/{collectionName}/points", content, cancellationToken);
            
            if (response.IsSuccessStatusCode)
            {
                _logger.LogDebug("Successfully indexed vector for image {ImageId} in collection {CollectionName}",
                    imageId, collectionName);
                return true;
            }
            
            var errorContent = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogError("Failed to index vector for image {ImageId}: {StatusCode} - {Error}",
                imageId, response.StatusCode, errorContent);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception indexing vector for image {ImageId} in tenant {TenantId}",
                imageId, tenantId);
            return false;
        }
    }

    public async Task<SimilaritySearchResult> SearchSimilarAsync(string tenantId, string modelName, float[] queryVector,
        int limit = 10, float threshold = 0.7f, Dictionary<string, object>? filter = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var collectionName = GetCollectionName(tenantId, modelName);
            
            var searchRequest = new
            {
                vector = queryVector,
                limit = limit,
                score_threshold = threshold,
                with_payload = true,
                with_vector = false,  // Don't return vectors to save bandwidth
                filter = filter != null ? new { must = new[] { filter } } : null
            };

            var json = JsonSerializer.Serialize(searchRequest);
            var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");
            
            var response = await _httpClient.PostAsync($"/collections/{collectionName}/points/search", content, cancellationToken);
            
            if (response.IsSuccessStatusCode)
            {
                var responseContent = await response.Content.ReadAsStringAsync(cancellationToken);
                var qdrantResponse = JsonSerializer.Deserialize<QdrantSearchResponse>(responseContent);
                
                var results = qdrantResponse?.result?.Select(r => new SimilarityMatch
                {
                    ImageId = r.payload?["image_id"]?.ToString() ?? "",
                    Score = r.score,
                    Metadata = r.payload ?? new Dictionary<string, object>()
                }).ToList() ?? new List<SimilarityMatch>();
                
                return new SimilaritySearchResult
                {
                    Matches = results,
                    QueryTime = TimeSpan.FromMilliseconds(100), // Approximate
                    TotalMatches = results.Count
                };
            }
            
            var errorContent = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogError("Failed to search similar vectors in collection {CollectionName}: {StatusCode} - {Error}",
                collectionName, response.StatusCode, errorContent);
            
            return new SimilaritySearchResult { Matches = new List<SimilarityMatch>() };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception searching similar vectors for tenant {TenantId} model {ModelName}",
                tenantId, modelName);
            return new SimilaritySearchResult { Matches = new List<SimilarityMatch>() };
        }
    }

    public async Task<bool> CollectionExistsAsync(string tenantId, string modelName, CancellationToken cancellationToken = default)
    {
        try
        {
            var collectionName = GetCollectionName(tenantId, modelName);
            var response = await _httpClient.GetAsync($"/collections/{collectionName}", cancellationToken);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception checking collection existence for tenant {TenantId} model {ModelName}",
                tenantId, modelName);
            return false;
        }
    }

    public async Task<CollectionInfo> GetCollectionInfoAsync(string tenantId, string modelName, CancellationToken cancellationToken = default)
    {
        try
        {
            var collectionName = GetCollectionName(tenantId, modelName);
            var response = await _httpClient.GetAsync($"/collections/{collectionName}", cancellationToken);
            
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync(cancellationToken);
                var qdrantInfo = JsonSerializer.Deserialize<QdrantCollectionResponse>(content);
                
                return new CollectionInfo
                {
                    Name = collectionName,
                    VectorCount = qdrantInfo?.result?.points_count ?? 0,
                    VectorDimension = qdrantInfo?.result?.config?.params?.vectors?.size ?? 0,
                    Status = qdrantInfo?.result?.status ?? "unknown"
                };
            }
            
            return new CollectionInfo { Name = collectionName, Status = "not_found" };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception getting collection info for tenant {TenantId} model {ModelName}",
                tenantId, modelName);
            return new CollectionInfo { Name = GetCollectionName(tenantId, modelName), Status = "error" };
        }
    }

    public async Task<bool> DeleteCollectionAsync(string tenantId, string modelName, CancellationToken cancellationToken = default)
    {
        try
        {
            var collectionName = GetCollectionName(tenantId, modelName);
            var response = await _httpClient.DeleteAsync($"/collections/{collectionName}", cancellationToken);
            
            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Successfully deleted Qdrant collection {CollectionName} for tenant {TenantId}",
                    collectionName, tenantId);
                return true;
            }
            
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception deleting collection for tenant {TenantId} model {ModelName}",
                tenantId, modelName);
            return false;
        }
    }

    public async Task<bool> IndexVectorsBatchAsync(string tenantId, string modelName, 
        IEnumerable<VectorDocument> vectors, CancellationToken cancellationToken = default)
    {
        try
        {
            var collectionName = GetCollectionName(tenantId, modelName);
            
            var points = vectors.Select(v => new
            {
                id = Guid.NewGuid().ToString(),
                vector = v.Vector,
                payload = new Dictionary<string, object>(v.Metadata ?? new Dictionary<string, object>())
                {
                    ["image_id"] = v.ImageId,
                    ["tenant_id"] = tenantId,
                    ["model_name"] = modelName,
                    ["indexed_at"] = DateTime.UtcNow.ToString("O")
                }
            }).ToArray();

            var batchRequest = new { points = points };
            var json = JsonSerializer.Serialize(batchRequest);
            var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");
            
            var response = await _httpClient.PutAsync($"/collections/{collectionName}/points", content, cancellationToken);
            
            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Successfully indexed {Count} vectors in batch for collection {CollectionName}",
                    points.Length, collectionName);
                return true;
            }
            
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception batch indexing vectors for tenant {TenantId} model {ModelName}",
                tenantId, modelName);
            return false;
        }
    }

    public async Task<bool> DeleteVectorAsync(string tenantId, string modelName, string imageId, CancellationToken cancellationToken = default)
    {
        try
        {
            var collectionName = GetCollectionName(tenantId, modelName);
            
            // Search for points with matching image_id to get their IDs
            var searchRequest = new
            {
                filter = new
                {
                    must = new[]
                    {
                        new { key = "image_id", match = new { value = imageId } }
                    }
                },
                limit = 100,
                with_payload = false,
                with_vector = false
            };

            var json = JsonSerializer.Serialize(searchRequest);
            var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");
            
            var searchResponse = await _httpClient.PostAsync($"/collections/{collectionName}/points/scroll", content, cancellationToken);
            
            if (searchResponse.IsSuccessStatusCode)
            {
                var searchContent = await searchResponse.Content.ReadAsStringAsync(cancellationToken);
                var scrollResult = JsonSerializer.Deserialize<QdrantScrollResponse>(searchContent);
                
                if (scrollResult?.result?.points?.Any() == true)
                {
                    var pointIds = scrollResult.result.points.Select(p => p.id).ToArray();
                    
                    var deleteRequest = new { points = pointIds };
                    var deleteJson = JsonSerializer.Serialize(deleteRequest);
                    var deleteContent = new StringContent(deleteJson, System.Text.Encoding.UTF8, "application/json");
                    
                    var deleteResponse = await _httpClient.PostAsync($"/collections/{collectionName}/points/delete", deleteContent, cancellationToken);
                    return deleteResponse.IsSuccessStatusCode;
                }
            }
            
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception deleting vector for image {ImageId} in tenant {TenantId}",
                imageId, tenantId);
            return false;
        }
    }

    public async Task<CollectionStats> GetCollectionStatsAsync(string tenantId, string modelName, CancellationToken cancellationToken = default)
    {
        try
        {
            var collectionName = GetCollectionName(tenantId, modelName);
            var response = await _httpClient.GetAsync($"/collections/{collectionName}", cancellationToken);
            
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync(cancellationToken);
                var qdrantInfo = JsonSerializer.Deserialize<QdrantCollectionResponse>(content);
                
                return new CollectionStats
                {
                    VectorCount = qdrantInfo?.result?.points_count ?? 0,
                    IndexedVectorCount = qdrantInfo?.result?.indexed_vectors_count ?? 0,
                    MemoryUsageMB = (qdrantInfo?.result?.segments_count ?? 0) * 50, // Rough estimate
                    Status = qdrantInfo?.result?.status ?? "unknown"
                };
            }
            
            return new CollectionStats();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception getting collection stats for tenant {TenantId} model {ModelName}",
                tenantId, modelName);
            return new CollectionStats();
        }
    }

    public async Task OptimizeCollectionAsync(string tenantId, string modelName, CancellationToken cancellationToken = default)
    {
        try
        {
            var collectionName = GetCollectionName(tenantId, modelName);
            var response = await _httpClient.PostAsync($"/collections/{collectionName}/index", null, cancellationToken);
            
            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Successfully triggered optimization for collection {CollectionName}", collectionName);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception optimizing collection for tenant {TenantId} model {ModelName}",
                tenantId, modelName);
        }
    }

    /// <summary>
    /// Generates consistent collection names for tenant isolation.
    /// Format: tenant_{tenantId}_{modelName}_vectors
    /// </summary>
    private static string GetCollectionName(string tenantId, string modelName)
    {
        var sanitizedTenantId = tenantId.Replace("-", "").ToLowerInvariant();
        var sanitizedModelName = modelName.Replace("-", "_").Replace(" ", "_").ToLowerInvariant();
        return $"tenant_{sanitizedTenantId}_{sanitizedModelName}_vectors";
    }
}

// DTOs for Qdrant API responses
public class QdrantSearchResponse
{
    public QdrantSearchPoint[]? result { get; set; }
    public string? status { get; set; }
    public double time { get; set; }
}

public class QdrantSearchPoint  
{
    public string? id { get; set; }
    public float score { get; set; }
    public Dictionary<string, object>? payload { get; set; }
}

public class QdrantCollectionResponse
{
    public QdrantCollectionResult? result { get; set; }
    public string? status { get; set; }
}

public class QdrantCollectionResult
{
    public string? status { get; set; }
    public int points_count { get; set; }
    public int indexed_vectors_count { get; set; }
    public int segments_count { get; set; }
    public QdrantCollectionConfig? config { get; set; }
}

public class QdrantCollectionConfig
{
    public QdrantCollectionParams? @params { get; set; }
}

public class QdrantCollectionParams
{
    public QdrantVectorConfig? vectors { get; set; }
}

public class QdrantVectorConfig
{
    public int size { get; set; }
    public string? distance { get; set; }
}

public class QdrantScrollResponse
{
    public QdrantScrollResult? result { get; set; }
    public string? status { get; set; }
}

public class QdrantScrollResult
{
    public QdrantScrollPoint[]? points { get; set; }
    public string? next_page_offset { get; set; }
}

public class QdrantScrollPoint
{
    public string? id { get; set; }
    public Dictionary<string, object>? payload { get; set; }
}

// Domain models
public class VectorDocument
{
    public required string ImageId { get; set; }
    public required float[] Vector { get; set; }
    public Dictionary<string, object>? Metadata { get; set; }
}

public class SimilaritySearchResult
{
    public required List<SimilarityMatch> Matches { get; set; }
    public TimeSpan QueryTime { get; set; }
    public int TotalMatches { get; set; }
}

public class SimilarityMatch
{
    public required string ImageId { get; set; }
    public float Score { get; set; }
    public Dictionary<string, object> Metadata { get; set; } = new();
}

public class CollectionInfo
{
    public required string Name { get; set; }
    public int VectorCount { get; set; }
    public int VectorDimension { get; set; }
    public string Status { get; set; } = "unknown";
}

public class CollectionStats
{
    public int VectorCount { get; set; }
    public int IndexedVectorCount { get; set; }
    public long MemoryUsageMB { get; set; }
    public string Status { get; set; } = "unknown";
}
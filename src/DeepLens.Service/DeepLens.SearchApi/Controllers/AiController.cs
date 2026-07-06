using DeepLens.Application.Abstractions.Services;
using DeepLens.Contracts.Ai;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using Dapper;
using System.Text.RegularExpressions;
using System.Numerics;
using System.Threading;
using System.Text.Json.Serialization;

namespace DeepLens.SearchApi.Controllers;

[ApiController]
[Route("api/v1/ai")]
[Authorize(Policy = "IngestPolicy")]
public class AiController : ControllerBase
{
    private readonly IAiService _aiService;
    private readonly ILogger<AiController> _logger;
    private readonly IConfiguration _configuration;

    public AiController(IAiService aiService, ILogger<AiController> logger, IConfiguration configuration)
    {
        _aiService = aiService;
        _logger = logger;
        _configuration = configuration;
    }

    [HttpPost("generate-title")]
    public async Task<ActionResult<GenerateTitleResponse>> GenerateTitle([FromBody] GenerateTitleRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Description))
        {
            return BadRequest(new { message = "Description is required for title generation." });
        }

        try
        {
            var title = await _aiService.GenerateYoutubeShortTitleAsync(request.Description);
            
            return Ok(new GenerateTitleResponse
            {
                Title = title,
                Model = _configuration["Ollama:Model"] ?? "phi3"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in AI title generation");
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpPost("extract-product")]
    public async Task<ActionResult> ExtractProduct([FromBody] TestCategorizationRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Description))
        {
            return BadRequest(new { message = "Description is required." });
        }

        try
        {
            var result = await _aiService.ExtractProductInfoAsync(request.Description);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in AI product extraction");
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpPost("test-categorization")]
    public async Task<ActionResult> TestCategorization([FromBody] TestCategorizationRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Description))
        {
            return BadRequest(new { message = "Description is required." });
        }

        string descNorm = CleanDescriptionForTokenization(request.Description);
        
        List<(string Name, string Slug, string[] Keywords)> dbCategories;
        var connStr = _configuration.GetConnectionString("DefaultConnection");
        using (var catConn = new NpgsqlConnection(connStr))
        {
            await catConn.OpenAsync();
            dbCategories = (await catConn.QueryAsync<(string Name, string Slug, string[] Keywords)>(
                new CommandDefinition("SELECT name, slug, classification_keywords FROM public.categories", cancellationToken: ct))).ToList();
        }

        var tokens = Regex.Matches(descNorm, @"[a-zA-Z]+")
            .Cast<Match>()
            .Select(m => m.Value)
            .Where(v => v.Length >= 2)
            .Distinct()
            .ToList();

        string category = "Others";
        bool matched = false;
        string? matchedToken = null;
        string? matchedKeyword = null;
        int allowedDist = 0;
        int actualDist = 0;

        var priorityOrder = new[] { "Kids", "Lehanga", "Saree", "Dress", "Others" };
        foreach (var categoryName in priorityOrder)
        {
            var dbCat = dbCategories.FirstOrDefault(c => c.Name.Equals(categoryName, StringComparison.OrdinalIgnoreCase));
            if (dbCat.Keywords == null || dbCat.Keywords.Length == 0) continue;

            foreach (var token in tokens)
            {
                foreach (var kw in dbCat.Keywords)
                {
                    string kwNorm = kw.Trim().ToLowerInvariant();
                    int dist = LevenshteinDistance(token, kwNorm);
                    int allowed = kwNorm.Length <= 4 ? 0 : (kwNorm.Length <= 6 ? 1 : 2);
                    
                    if (dist <= allowed)
                    {
                        category = dbCat.Name;
                        matched = true;
                        matchedToken = token;
                        matchedKeyword = kw;
                        allowedDist = allowed;
                        actualDist = dist;
                        break;
                    }
                }
                if (matched) break;
            }
            if (matched) break;
        }

        if (matched)
        {
            return Ok(new TestCategorizationResponse
            {
                Category = category,
                Method = "static",
                MatchedToken = matchedToken,
                MatchedKeyword = matchedKeyword,
                AllowedDistance = allowedDist,
                ActualDistance = actualDist,
                CleanedDescription = descNorm
            });
        }

        try
        {
            var aiResult = await _aiService.ExtractProductInfoAsync(request.Description);
            var remappedCategory = RemapToTaxonomy(aiResult.Category);
            return Ok(new TestCategorizationResponse
            {
                Category = remappedCategory,
                Method = "ai",
                CleanedDescription = descNorm,
                AiResult = aiResult
            });
        }
        catch (Exception ex)
        {
            return Ok(new TestCategorizationResponse
            {
                Category = "Others",
                Method = "ai_failed",
                CleanedDescription = descNorm,
                AiResult = new { error = ex.Message }
            });
        }
    }

    [HttpGet("test-similarity")]
    public async Task<ActionResult> TestSimilarity([FromQuery] string query, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return BadRequest(new { message = "Query parameter (SKU or ID) is required." });
        }

        var connStr = _configuration.GetConnectionString("DefaultConnection");
        using var conn = new NpgsqlConnection(connStr);
        await conn.OpenAsync();

        Guid productId = Guid.Empty;
        string baseSku = "";

        if (Guid.TryParse(query, out var parsedId))
        {
            productId = parsedId;
            var prodInfo = await conn.QuerySingleOrDefaultAsync<dynamic>(
                new CommandDefinition("SELECT base_sku FROM public.products WHERE id = @Id", new { Id = productId }, cancellationToken: ct));
            if (prodInfo != null) baseSku = prodInfo.base_sku;
        }
        else
        {
            var prodInfo = await conn.QuerySingleOrDefaultAsync<dynamic>(
                new CommandDefinition("SELECT id, base_sku FROM public.products WHERE base_sku = @Sku", new { Sku = query.Trim().ToUpperInvariant() }, cancellationToken: ct));
            if (prodInfo != null)
            {
                productId = prodInfo.id;
                baseSku = prodInfo.base_sku;
            }
        }

        if (productId == Guid.Empty)
        {
            return NotFound(new { message = "Product not found." });
        }

        var refPhash = await conn.QueryFirstOrDefaultAsync<string>(
            new CommandDefinition(@"SELECT m.phash 
              FROM media m 
              JOIN media_links ml ON m.id = ml.media_id 
              WHERE ml.entity_id = @ProductId AND ml.entity_type = 'product' AND m.phash IS NOT NULL 
              LIMIT 1",
            new { ProductId = productId }, cancellationToken: ct)
        );

        if (string.IsNullOrEmpty(refPhash))
        {
            return BadRequest(new { message = "Reference product does not have a perceptual hash (phash)." });
        }

        var candidates = await conn.QueryAsync<dynamic>(
            new CommandDefinition(@"SELECT p.id as ProductId, p.base_sku as Sku, p.title as Title, m.phash as Phash, m.storage_path as StoragePath
              FROM public.products p
              JOIN public.media_links ml ON p.id = ml.entity_id
              JOIN public.media m ON m.id = ml.media_id
              WHERE ml.entity_type = 'product' AND p.is_deleted = false AND m.phash IS NOT NULL AND p.id != @ProductId",
            new { ProductId = productId }, cancellationToken: ct)
        );

        var matches = new List<TestSimilarityMatch>();
        foreach (var c in candidates)
        {
            string candPhash = c.phash;
            int dist = GetHammingDistance(refPhash, candPhash);
            int pct = Math.Max(0, Math.Min(100, (int)Math.Round((1 - (dist / 64.0)) * 100)));

            matches.Add(new TestSimilarityMatch
            {
                ProductId = c.productid,
                Sku = c.sku,
                Title = c.title ?? "Untitled",
                Phash = candPhash,
                Distance = dist,
                SimilarityPercentage = pct,
                StoragePath = c.storagepath
            });
        }

        var topMatches = matches
            .OrderBy(m => m.Distance)
            .Take(10)
            .ToList();

        return Ok(new {
            referenceProduct = new { id = productId, sku = baseSku, phash = refPhash },
            matches = topMatches
        });
    }

    private static int GetHammingDistance(string hash1, string hash2)
    {
        if (string.IsNullOrEmpty(hash1) || string.IsNullOrEmpty(hash2)) return int.MaxValue;
        if (hash1.Length != 16 || hash2.Length != 16)
        {
            int dist = 0;
            for (int i = 0; i < Math.Min(hash1.Length, hash2.Length); i++)
            {
                if (hash1[i] != hash2[i]) dist++;
            }
            return dist + Math.Abs(hash1.Length - hash2.Length);
        }

        if (ulong.TryParse(hash1, System.Globalization.NumberStyles.HexNumber, null, out ulong val1) &&
            ulong.TryParse(hash2, System.Globalization.NumberStyles.HexNumber, null, out ulong val2))
        {
            return BitOperations.PopCount(val1 ^ val2);
        }
        return int.MaxValue;
    }

    private static readonly Regex _emojiRegex = new Regex(
        @"[\uD800-\uDFFF]" +
        @"|[\u2600-\u27BF]" +
        @"|[\u2300-\u23FF]" +
        @"|[\u2B50-\u2B55]" +
        @"|[\u1F004]|[\u1F0CF]" +
        @"|[\u1F300-\u1F9FF]" +
        @"|[\u200D\uFE0F\u20E3]" +
        @"|\p{So}|\p{Sm}|\p{Sk}",
        RegexOptions.Compiled);

    private static string StripEmojis(string text)
    {
        if (string.IsNullOrEmpty(text)) return text;
        var stripped = _emojiRegex.Replace(text, " ");
        return Regex.Replace(stripped, @"\s{2,}", " ").Trim();
    }

    private static string CleanDescriptionForTokenization(string text)
    {
        if (string.IsNullOrEmpty(text)) return "";
        var lines = text.Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.None);
        var cleanLines = new List<string>();
        foreach (var line in lines)
        {
            var lowerLine = line.ToLowerInvariant();
            if (lowerLine.Contains("http://") || 
                lowerLine.Contains("https://") || 
                lowerLine.Contains("chat.whatsapp.com") || 
                lowerLine.Contains("instagram.com") || 
                lowerLine.Contains("t.me"))
            {
                continue;
            }
            cleanLines.Add(line);
        }
        var cleanedText = string.Join(" ", cleanLines);
        return StripEmojis(cleanedText).ToLowerInvariant();
    }

    private static int LevenshteinDistance(string s, string t)
    {
        if (string.IsNullOrEmpty(s)) return t?.Length ?? 0;
        if (string.IsNullOrEmpty(t)) return s?.Length ?? 0;
        int n = s.Length;
        int m = t.Length;
        int[,] d = new int[n + 1, m + 1];
        for (int i = 0; i <= n; i++) d[i, 0] = i;
        for (int j = 0; j <= m; j++) d[0, j] = j;
        for (int i = 1; i <= n; i++)
        {
            for (int j = 1; j <= m; j++)
            {
                int cost = (t[j - 1] == s[i - 1]) ? 0 : 1;
                d[i, j] = Math.Min(
                    Math.Min(d[i - 1, j] + 1, d[i, j - 1] + 1),
                    d[i - 1, j - 1] + cost);
            }
        }
        return d[n, m];
    }

    private static string RemapToTaxonomy(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return "Others";
        var s = raw.Trim().ToLowerInvariant();

        if (s.Contains("kid") || s.Contains("child") || s.Contains("baby") ||
            s.Contains("toddler") || s.Contains("infant"))
            return "Kids";

        if (s.Contains("lehenga") || s.Contains("lehnga") || s.Contains("lahenga") ||
            s.Contains("ghagra") || s.Contains("chaniya") || s.Contains("half saree"))
            return "Lehanga";

        if (s.Contains("saree") || s.Contains("sari") || s.Contains("banarasi") ||
            s.Contains("kanjivaram") || s.Contains("kanchipuram") || s.Contains("patola"))
            return "Saree";

        if (s.Contains("kurti") || s.Contains("kurthi") || s.Contains("kurta") ||
            s.Contains("anarkali") || s.Contains("gown") || s.Contains("dress") ||
            s.Contains("frock") || s.Contains("salwar") || s.Contains("churidar") ||
            s.Contains("palazzo") || s.Contains("plazo") || s.Contains("sharara") ||
            s.Contains("suit") || s.Contains("ethnic") || s.Contains("traditional") ||
            s.Contains("festive") || s.Contains("party wear") || s.Contains("partywear") ||
            s.Contains("bridal") || s.Contains("wedding wear") || s.Contains("skirt") ||
            s.Contains("coord"))
            return "Dress";

        return "Others";
    }
}

public class TestCategorizationRequest
{
    [JsonPropertyName("description")]
    public string Description { get; set; } = "";
}

public class TestCategorizationResponse
{
    [JsonPropertyName("category")]
    public string Category { get; set; } = "Others";
    
    [JsonPropertyName("method")]
    public string Method { get; set; } = "static";
    
    [JsonPropertyName("matchedToken")]
    public string? MatchedToken { get; set; }
    
    [JsonPropertyName("matchedKeyword")]
    public string? MatchedKeyword { get; set; }
    
    [JsonPropertyName("allowedDistance")]
    public int AllowedDistance { get; set; }
    
    [JsonPropertyName("actualDistance")]
    public int ActualDistance { get; set; }
    
    [JsonPropertyName("cleanedDescription")]
    public string CleanedDescription { get; set; } = "";
    
    [JsonPropertyName("aiResult")]
    public object? AiResult { get; set; }
}

public class TestSimilarityMatch
{
    [JsonPropertyName("productId")]
    public Guid ProductId { get; set; }
    
    [JsonPropertyName("sku")]
    public string Sku { get; set; } = "";
    
    [JsonPropertyName("title")]
    public string Title { get; set; } = "";
    
    [JsonPropertyName("phash")]
    public string Phash { get; set; } = "";
    
    [JsonPropertyName("distance")]
    public int Distance { get; set; }
    
    [JsonPropertyName("similarityPercentage")]
    public int SimilarityPercentage { get; set; }
    
    [JsonPropertyName("storagePath")]
    public string? StoragePath { get; set; }
}

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using DeepLens.Application.Abstractions.Services;
using DeepLens.Contracts.Instagram;
using Microsoft.Extensions.Logging;

namespace DeepLens.Infrastructure.Services;

public class ProfileClassifierService : IProfileClassifierService
{
    private readonly ILiteLlmService _liteLlm;
    private readonly ILogger<ProfileClassifierService> _logger;

    // Supplier patterns
    private static readonly string[] SupplierKeywords = new[]
    {
        "wholesale", "wholesaler", "wholesalers", "weaver", "weavers", "textile mill", 
        "textile mills", "manufacturer", "manufacturers", "b2b", "bulk order", "bulk orders",
        "surat mill", "handloom weaver", "factory price", "reseller welcome", "resellers welcome",
        "weavers direct", "weaving unit", "manufacturing unit", "direct manufacturer", "mill price"
    };

    // Influencer / Inspiration patterns
    private static readonly string[] InspirationKeywords = new[]
    {
        "blogger", "fashion blogger", "content creator", "digital creator", "influencer",
        "model", "public figure", "stylist", "fashion stylist", "vlogger", "fashion enthusiast",
        "creator", "lifestyle creator", "personal blog"
    };

    // Commercial retail / Competitor selling cues
    private static readonly string[] RetailSellingKeywords = new[]
    {
        "dm to order", "dm for price", "dm for orders", "dm to buy", "order via dm",
        "whatsapp to order", "whatsapp booking", "book on whatsapp", "to order whatsapp",
        "shop now", "ships worldwide", "worldwide shipping", "store location", "retail store",
        "visit our store", "order on website", "website bookings", "free shipping", "cod available",
        "no returns", "booking number", "boutique", "clothing store", "saree", "sarees",
        "lehenga", "lehengas", "kurti", "kurtis", "jewellery", "jewelry", "ethnic wear",
        "women clothing", "fashion store", "designer studio", "collections", "fashion house"
    };

    // Niche dictionary for Tier 2 Regex Scoring
    private static readonly Dictionary<string, string[]> NicheKeywords = new(StringComparer.OrdinalIgnoreCase)
    {
        [CompetitorNicheConstants.BridalSarees] = new[]
        {
            "bridal saree", "bridal sarees", "wedding saree", "wedding sarees", "bridal collection",
            "bridal wear", "trousseau", "muhurtham", "muhurtham saree", "pattu saree bridal",
            "wedding silk", "bride saree", "bridal silk", "marriage saree", "reception saree"
        },
        [CompetitorNicheConstants.KanchipuramSilkSarees] = new[]
        {
            "kanchipuram", "kanjivaram", "kanchi", "silk saree", "silk sarees", "pure silk",
            "pattu", "pattu saree", "pattu sarees", "banarasi", "banarasi silk", "chanderi",
            "tussar", "handloom silk", "handloom saree", "handloom sarees", "gadwal", "paithani",
            "kuppadam", "venkatagiri", "soft silk", "uppada", "pochampally", "patola",
            "organza silk", "raw silk", "pure zari", "zari saree", "georgette saree", "chiffon saree"
        },
        [CompetitorNicheConstants.Lehengas] = new[]
        {
            "lehenga", "lehengas", "ghagra", "chaniya choli", "choli", "bridal lehenga",
            "designer lehenga", "crop top skirt", "crop top lehenga", "party wear lehenga",
            "semi stitched lehenga", "skirt top"
        },
        [CompetitorNicheConstants.KurtisSalwars] = new[]
        {
            "kurti", "kurtis", "salwar", "salwars", "anarkali", "suit set", "suit sets",
            "kurta", "kurtas", "coord set", "co-ord", "coords", "cord set", "unstitched suit",
            "dupatta set", "plazo set", "palazzo set", "straight cut kurti", "aliacut",
            "nayracut", "georgette suit", "cotton suit", "daily wear suit"
        },
        [CompetitorNicheConstants.DressesWestern] = new[]
        {
            "western", "dress", "dresses", "gown", "gowns", "jumpsuit", "jumpsuits", "tops",
            "midi dress", "maxi dress", "indo western", "party dress", "bodycon", "casual wear",
            "western wear", "korean fashion", "formal dress"
        },
        [CompetitorNicheConstants.Jewellery] = new[]
        {
            "jewellery", "jewelry", "necklace", "earrings", "bangles", "temple jewellery",
            "1 gram gold", "one gram gold", "silver jewellery", "925 silver", "kundan",
            "choker", "jhumka", "jhumkas", "haram", "pendant", "matte jewellery",
            "victorian jewellery", "cz jewellery", "accessories", "bridal jewellery"
        }
    };

    public ProfileClassifierService(ILiteLlmService liteLlm, ILogger<ProfileClassifierService> logger)
    {
        _liteLlm = liteLlm;
        _logger = logger;
    }

    public async Task<ProfileClassificationResult> ClassifyProfileAsync(ProfileClassificationRequest request, CancellationToken cancellationToken = default)
    {
        if (request == null) throw new ArgumentNullException(nameof(request));

        var username = (request.Username ?? string.Empty).Trim().ToLowerInvariant();
        var displayName = (request.DisplayName ?? string.Empty).Trim();
        var bio = (request.Biography ?? string.Empty).Trim();
        var categoryName = (request.CategoryName ?? string.Empty).Trim();
        var businessCategory = (request.BusinessCategoryName ?? string.Empty).Trim();
        var captions = request.RecentCaptions ?? new List<string>();

        _logger.LogInformation("Starting auto-classification for profile @{Username} ({DisplayName}) with {CaptionCount} captions",
            username, displayName, captions.Count);

        // ────────────────────────────────────────────────────────────────────────
        // Tier 1: Fast Rule-based Heuristics
        // ────────────────────────────────────────────────────────────────────────

        // 1. My Business check (Matches 'vayyari')
        if (IsMyBusiness(username, displayName, bio))
        {
            return new ProfileClassificationResult
            {
                ProfileCategory = ProfileCategoryConstants.MyBusiness,
                IsCompetitor = false,
                CompetitorNiche = null,
                Confidence = 0.99,
                ClassificationSource = "RuleEngine",
                Reasoning = "Matches owned business handle/brand keyword ('vayyari')"
            };
        }

        var combinedMeta = $"{username} {displayName} {bio} {categoryName} {businessCategory}".ToLowerInvariant();

        // 2. Suppliers check (Wholesale / Manufacturer / Mill / Weaver)
        if (IsSupplier(combinedMeta))
        {
            return new ProfileClassificationResult
            {
                ProfileCategory = ProfileCategoryConstants.Suppliers,
                IsCompetitor = false,
                CompetitorNiche = null,
                Confidence = 0.90,
                ClassificationSource = "RuleEngine",
                Reasoning = "Wholesale/manufacturer/weaver supplier keywords detected"
            };
        }

        // 3. Inspirations check (Influencer / Blogger / Creator without retail selling cues)
        if (IsInspiration(combinedMeta, captions))
        {
            return new ProfileClassificationResult
            {
                ProfileCategory = ProfileCategoryConstants.Inspirations,
                IsCompetitor = false,
                CompetitorNiche = null,
                Confidence = 0.85,
                ClassificationSource = "RuleEngine",
                Reasoning = "Influencer/blogger/content creator profile detected without direct sales cues"
            };
        }

        // 4. Competitors check (Commercial apparel / jewelry retail selling cues)
        bool isCompetitorCandidate = IsCompetitor(combinedMeta, captions);

        // ────────────────────────────────────────────────────────────────────────
        // Tier 2: Regex Niche Scorer
        // ────────────────────────────────────────────────────────────────────────
        var (topNiche, topScore, isAmbiguous) = ScoreNiches(bio, displayName, username, captions);

        if (isCompetitorCandidate && topScore >= 2 && !isAmbiguous && !string.IsNullOrEmpty(topNiche))
        {
            double confidence = Math.Min(0.95, 0.75 + (topScore * 0.04));
            return new ProfileClassificationResult
            {
                ProfileCategory = ProfileCategoryConstants.Competitors,
                IsCompetitor = true,
                CompetitorNiche = topNiche,
                Confidence = confidence,
                ClassificationSource = "RuleEngine",
                Reasoning = $"Classified as Competitor ({topNiche}) based on high niche keyword match (score: {topScore})"
            };
        }

        // ────────────────────────────────────────────────────────────────────────
        // Tier 3: LLM Fallback (LiteLLM Gateway deeplens-llm / Ollama)
        // ────────────────────────────────────────────────────────────────────────
        try
        {
            _logger.LogInformation("Profile @{Username} fell through to Tier 3 LLM classification (CompetitorCandidate={IsComp}, TopScore={Score}, Ambiguous={Ambiguous})",
                username, isCompetitorCandidate, topScore, isAmbiguous);

            var llmResult = await ClassifyWithLlmAsync(request, cancellationToken);
            if (llmResult != null)
            {
                return llmResult;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Tier 3 LLM classification failed for @{Username}. Using heuristic fallback.", username);
        }

        // Fallback if LLM is unavailable
        if (isCompetitorCandidate || topScore >= 1)
        {
            return new ProfileClassificationResult
            {
                ProfileCategory = ProfileCategoryConstants.Competitors,
                IsCompetitor = true,
                CompetitorNiche = !string.IsNullOrEmpty(topNiche) ? topNiche : CompetitorNicheConstants.Other,
                Confidence = 0.65,
                ClassificationSource = "Fallback",
                Reasoning = $"Fallback classification as Competitor ({topNiche ?? "Other"})"
            };
        }

        return new ProfileClassificationResult
        {
            ProfileCategory = ProfileCategoryConstants.MyGeneral,
            IsCompetitor = false,
            CompetitorNiche = null,
            Confidence = 0.50,
            ClassificationSource = "Fallback",
            Reasoning = "Unclassified profile defaulted to My General"
        };
    }

    private static bool IsMyBusiness(string username, string displayName, string bio)
    {
        return username.Contains("vayyari", StringComparison.OrdinalIgnoreCase) ||
               displayName.Contains("vayyari", StringComparison.OrdinalIgnoreCase) ||
               bio.Contains("vayyari", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsSupplier(string combinedMeta)
    {
        return SupplierKeywords.Any(k => ContainsWordOrPhrase(combinedMeta, k));
    }

    private static bool IsInspiration(string combinedMeta, List<string> captions)
    {
        bool hasCreatorKeyword = InspirationKeywords.Any(k => ContainsWordOrPhrase(combinedMeta, k));
        if (!hasCreatorKeyword) return false;

        // Check if there are strong commercial retail selling cues
        var allText = combinedMeta + " " + string.Join(" ", captions).ToLowerInvariant();
        int sellingCues = RetailSellingKeywords.Count(k => ContainsWordOrPhrase(allText, k));

        return sellingCues <= 1; // 0 or 1 incidental match (e.g. tag) -> Inspiration
    }

    private static bool IsCompetitor(string combinedMeta, List<string> captions)
    {
        var allText = combinedMeta + " " + string.Join(" ", captions).ToLowerInvariant();
        int sellingCues = RetailSellingKeywords.Count(k => ContainsWordOrPhrase(allText, k));
        return sellingCues >= 2;
    }

    private static (string? TopNiche, int TopScore, bool IsAmbiguous) ScoreNiches(string bio, string displayName, string username, List<string> captions)
    {
        var scores = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var metaText = $"{username} {displayName} {bio}".ToLowerInvariant();

        foreach (var (niche, keywords) in NicheKeywords)
        {
            int score = 0;

            // Score in metadata (Bio, Name, Username) - 3 points per match
            foreach (var kw in keywords)
            {
                if (ContainsWordOrPhrase(metaText, kw))
                {
                    score += 3;
                }
            }

            // Score in recent captions - 1 point per caption containing keyword
            foreach (var caption in captions)
            {
                var lowerCaption = caption.ToLowerInvariant();
                if (keywords.Any(kw => ContainsWordOrPhrase(lowerCaption, kw)))
                {
                    score += 1;
                }
            }

            scores[niche] = score;
        }

        var sorted = scores.OrderByDescending(kv => kv.Value).ToList();
        var top = sorted.First();
        var second = sorted.Count > 1 ? sorted[1] : (KeyValuePair<string, int>?)null;

        if (top.Value == 0)
        {
            return (null, 0, true);
        }

        // Check if ambiguous (e.g. tie or very close top scores)
        bool isAmbiguous = second.HasValue && second.Value.Value > 0 && (top.Value - second.Value.Value <= 1) && top.Value < 4;

        return (top.Key, top.Value, isAmbiguous);
    }

    private async Task<ProfileClassificationResult?> ClassifyWithLlmAsync(ProfileClassificationRequest request, CancellationToken ct)
    {
        const string systemPrompt = @"You are an expert fashion e-commerce retail AI classifier for Indian ethnic wear and global apparel brands.
Classify the given Instagram profile into exactly one ProfileCategory and (if Competitor) one CompetitorNiche.

Allowed ProfileCategory values:
- ""My Business"" (Owned brand accounts, e.g. Vayyari)
- ""Competitors"" (Retailers, boutiques, e-commerce stores, saree/ethnic sellers selling to consumers)
- ""Suppliers"" (B2B manufacturers, textile mills, weavers, wholesale suppliers)
- ""Inspirations"" (Fashion influencers, models, bloggers, styling creators who do not sell directly)
- ""My General"" (Personal/internal non-business accounts)

Allowed CompetitorNiche values (only if isCompetitor is true, otherwise null):
- ""Bridal Sarees""
- ""Kanchipuram / Silk Sarees""
- ""Lehengas""
- ""Kurtis / Salwars""
- ""Dresses / Western""
- ""Jewellery""
- ""Other""

Return a strictly valid JSON object matching this schema:
{
  ""profileCategory"": ""<ProfileCategory>"",
  ""isCompetitor"": <true|false>,
  ""competitorNiche"": ""<CompetitorNiche or null>"",
  ""confidence"": <number between 0.0 and 1.0>,
  ""reasoning"": ""<short concise 1-sentence reasoning>""
}";

        var captionsSummary = request.RecentCaptions != null && request.RecentCaptions.Any()
            ? string.Join("\n- ", request.RecentCaptions.Take(10).Select(c => c.Length > 200 ? c.Substring(0, 200) + "..." : c))
            : "No recent post captions available.";

        var userPrompt = $@"Please classify this Instagram profile:
Username: @{request.Username}
Display Name: {request.DisplayName ?? "N/A"}
Bio: {request.Biography ?? "N/A"}
Category: {request.CategoryName ?? "N/A"} / {request.BusinessCategoryName ?? "N/A"}

Recent Post Captions:
- {captionsSummary}";

        var responseJson = await _liteLlm.GetChatCompletionAsync(userPrompt, systemPrompt, jsonMode: true, cancellationToken: ct);
        if (string.IsNullOrWhiteSpace(responseJson))
        {
            return null;
        }

        var parsed = JsonSerializer.Deserialize<LlmClassificationResponse>(responseJson, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        if (parsed == null || string.IsNullOrWhiteSpace(parsed.ProfileCategory))
        {
            return null;
        }

        var normalizedCategory = NormalizeProfileCategory(parsed.ProfileCategory);
        var isCompetitor = parsed.IsCompetitor || string.Equals(normalizedCategory, ProfileCategoryConstants.Competitors, StringComparison.OrdinalIgnoreCase);
        var normalizedNiche = isCompetitor ? NormalizeCompetitorNiche(parsed.CompetitorNiche) : null;
        var confidence = Math.Clamp(parsed.Confidence > 0 ? parsed.Confidence : 0.85, 0.50, 0.99);

        return new ProfileClassificationResult
        {
            ProfileCategory = normalizedCategory,
            IsCompetitor = isCompetitor,
            CompetitorNiche = normalizedNiche,
            Confidence = confidence,
            ClassificationSource = "LLM",
            Reasoning = parsed.Reasoning ?? "Classified by DeepLens LLM Gateway"
        };
    }

    private static string NormalizeProfileCategory(string raw)
    {
        var clean = (raw ?? string.Empty).Trim();
        if (clean.Contains("business", StringComparison.OrdinalIgnoreCase) && !clean.Contains("general", StringComparison.OrdinalIgnoreCase))
            return ProfileCategoryConstants.MyBusiness;
        if (clean.Contains("competitor", StringComparison.OrdinalIgnoreCase))
            return ProfileCategoryConstants.Competitors;
        if (clean.Contains("supplier", StringComparison.OrdinalIgnoreCase) || clean.Contains("wholesale", StringComparison.OrdinalIgnoreCase))
            return ProfileCategoryConstants.Suppliers;
        if (clean.Contains("inspiration", StringComparison.OrdinalIgnoreCase) || clean.Contains("influencer", StringComparison.OrdinalIgnoreCase) || clean.Contains("creator", StringComparison.OrdinalIgnoreCase))
            return ProfileCategoryConstants.Inspirations;
        if (clean.Contains("general", StringComparison.OrdinalIgnoreCase) || clean.Contains("personal", StringComparison.OrdinalIgnoreCase))
            return ProfileCategoryConstants.MyGeneral;

        return ProfileCategoryConstants.Competitors;
    }

    private static string NormalizeCompetitorNiche(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return CompetitorNicheConstants.Other;
        var clean = raw.Trim();

        if (clean.Contains("bridal", StringComparison.OrdinalIgnoreCase))
            return CompetitorNicheConstants.BridalSarees;
        if (clean.Contains("silk", StringComparison.OrdinalIgnoreCase) || clean.Contains("kanchi", StringComparison.OrdinalIgnoreCase) || clean.Contains("pattu", StringComparison.OrdinalIgnoreCase))
            return CompetitorNicheConstants.KanchipuramSilkSarees;
        if (clean.Contains("lehenga", StringComparison.OrdinalIgnoreCase) || clean.Contains("ghagra", StringComparison.OrdinalIgnoreCase))
            return CompetitorNicheConstants.Lehengas;
        if (clean.Contains("kurti", StringComparison.OrdinalIgnoreCase) || clean.Contains("salwar", StringComparison.OrdinalIgnoreCase) || clean.Contains("suit", StringComparison.OrdinalIgnoreCase) || clean.Contains("anarkali", StringComparison.OrdinalIgnoreCase))
            return CompetitorNicheConstants.KurtisSalwars;
        if (clean.Contains("dress", StringComparison.OrdinalIgnoreCase) || clean.Contains("western", StringComparison.OrdinalIgnoreCase) || clean.Contains("gown", StringComparison.OrdinalIgnoreCase))
            return CompetitorNicheConstants.DressesWestern;
        if (clean.Contains("jewel", StringComparison.OrdinalIgnoreCase) || clean.Contains("necklace", StringComparison.OrdinalIgnoreCase) || clean.Contains("earring", StringComparison.OrdinalIgnoreCase))
            return CompetitorNicheConstants.Jewellery;

        return CompetitorNicheConstants.Other;
    }

    private static bool ContainsWordOrPhrase(string text, string phrase)
    {
        if (string.IsNullOrWhiteSpace(text) || string.IsNullOrWhiteSpace(phrase)) return false;
        
        // Simple substring check for multi-word phrases or word boundary for single words
        if (phrase.Contains(' '))
        {
            return text.Contains(phrase, StringComparison.OrdinalIgnoreCase);
        }

        var pattern = $@"\b{Regex.Escape(phrase)}\b";
        return Regex.IsMatch(text, pattern, RegexOptions.IgnoreCase);
    }

    private class LlmClassificationResponse
    {
        [JsonPropertyName("profileCategory")]
        public string? ProfileCategory { get; set; }

        [JsonPropertyName("isCompetitor")]
        public bool IsCompetitor { get; set; }

        [JsonPropertyName("competitorNiche")]
        public string? CompetitorNiche { get; set; }

        [JsonPropertyName("confidence")]
        public double Confidence { get; set; }

        [JsonPropertyName("reasoning")]
        public string? Reasoning { get; set; }
    }
}

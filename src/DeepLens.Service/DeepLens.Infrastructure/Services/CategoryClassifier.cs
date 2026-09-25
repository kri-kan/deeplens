using System;
using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace DeepLens.Infrastructure.Services;

/// <summary>
/// Deterministic high-precision category classification engine for Indian ethnic fashion apparel.
/// Evaluates product titles and descriptions against taxonomy rules and keyword hierarchies.
/// </summary>
public static class CategoryClassifier
{
    public const string SareeSlug = "saree";
    public const string SareeName = "Saree";

    public const string LehangaSlug = "lehanga";
    public const string LehangaName = "Lehanga";

    public const string DressSlug = "dress";
    public const string DressName = "Dress";

    public const string KidsSlug = "kids";
    public const string KidsName = "Kids";

    public const string MensSlug = "mens";
    public const string MensName = "Mens";

    public const string DefaultFallbackSlug = "general";
    public const string DefaultFallbackName = "Others";

    // ── Regex Patterns ──
    private static readonly Regex DiacriticsRegex = new(@"\p{M}", RegexOptions.Compiled);
    private static readonly Regex SpecialCharsRegex = new(@"[*~_`#\[\]\(\)\{\}\\\/<>@!?,;:|""'+=]", RegexOptions.Compiled);
    private static readonly Regex WhitespaceRegex = new(@"\s+", RegexOptions.Compiled);

    // Kids age / size patterns: e.g. "age 2-6 yrs", "4 years", "0-6 months", "1-16 years" (NO bare 'm' to prevent matching meters)
    private static readonly Regex KidsAgePattern = new(
        @"\b(?:age\s*)?\d{1,2}(?:\s*-\s*\d{1,2})?\s*(?:years?|yrs?|yr)\b|\b\d{1,2}(?:\s*-\s*\d{1,2})?\s*(?:months?|mths?)\b|\b(?:1[0-6]|[0-9])\s*(?:years?|yrs?|yr)\s*old\b",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    // Explicit Kids keywords (excludes 'baby pink', 'baby blue', 'baby soft' and standalone 'girls/women' adult phrases)
    private static readonly Regex KidsKeywordsRegex = new(
        @"\b(?:kids?|kidwear|kidswear|children|child|toddlers?|infants?|baba\s*suit|infant\s*wear|boys?\s*wear|girls?\s*wear|pavadai|pattu\s*pavadai|baby(?!\s*(?:pink|blue|soft|silk|color|colour|shade|print))|baby\s*(?:wear|dress|frock|suit|cloth(?:es|ing)?|boy|girl)|(?:boys?|girls?)\s*(?:wear|collection|dress|clothing|frock|suit|choli|lehenga|kurta|fashion|outfit))\b",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    // Adult size indicators (e.g. S-36, M-38, L-40, XL-42, XXL, 38 to 44, bust 38)
    private static readonly Regex AdultSizeRegex = new(
        @"\b(?:s\s*-\s*36|m\s*-\s*38|l\s*-\s*40|xl\s*-\s*42|xxl|2xl|3xl|36\s*to\s*44|38\s*to\s*42|size\s*:\s*[smlx]{1,4})\b",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    // Mens keywords
    private static readonly Regex MensKeywordsRegex = new(
        @"\b(?:mens?|men\'?s|menswear|sherwani|kurta\s*pajama|kurta\s*pyjama|nehru\s*jacket|dhoti|panche|lungi|bandhgala|pathani|pathani\s*suit|men\s*kurta|men\s*shirt|mens\s*ethnic|mens\s*collection)\b",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    // Lehanga keywords
    private static readonly Regex LehangaKeywordsRegex = new(
        @"\b(?:lehengas?|lehangas?|lehngas?|lahengas?|lehenghas?|choli|cholis|ghagra|ghagras|chaniya|chaniya\s*choli|voni|half\s*saree|halfsaree|langa\s*voni|crop\s*top\s*lehenga|crop\s*top\s*skirt|skirt\s*with\s*top|skirt\s*and\s*crop\s*top|crop\s*top\s*with\s*skirt)\b",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    // Saree keywords
    private static readonly Regex SareeKeywordsRegex = new(
        @"\b(?:sarees?|saris?|banarasi|banaras|kanjivaram|kanchipuram|kanchi|patola|paithani|chanderi\s*saree|silk\s*saree|georgette\s*saree|organza\s*saree|dola\s*silk|tissue\s*saree|pattu\s*saree|gadwal|gadhwal|dharmavaram|uppada|bandhani\s*saree|bandhej\s*saree|pochampally|pallu|blouse\s*piece|running\s*blouse|rich\s*pallu|contrast\s*pallu|kalamkari\s*saree|linen\s*saree|brass\s*saree|mysore\s*silk|chiffon\s*saree|crape\s*saree|crepe\s*saree|kuppadam|chettinad|tussar\s*saree|tasar\s*saree|sico\s*saree|shibori\s*saree|vichitra\s*silk\s*saree|designer\s*saree|party\s*wear\s*saree)\b",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    // Dress keywords
    private static readonly Regex DressKeywordsRegex = new(
        @"\b(?:kurtis?|kurthis?|kurtas?|anarkali|gowns?|salwar|salwar\s*suit|salwar\s*kameez|churidar|churidhar|palazzo|plazo|sharara|gharara|suits?|dresses?|maxi|frocks?|coords?|co-ords?|coord\s*set|co-ord\s*set|cord\s*set|two\s*piece\s*set|2\s*piece\s*set|3\s*piece\s*set|dupatta\s*set|pant\s*set|top\s*with\s*pant|tunics?|kaftans?|caftans?|shrugs?|jacket\s*set|peplum|western\s*dress|midi\s*dress|midi|one\s*piece|straight\s*cut\s*suit|kali\s*gown|readymade\s*dress|stitched\s*suit|unstitched\s*dress\s*material|dress\s*material|punjabi\s*suit|top\s*and\s*bottom|kurti\s*with\s*pant|kurti\s*set)\b",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    /// <summary>
    /// Normalizes raw text by removing diacritics, unicode decorations, markdown, punctuation, and extra whitespace.
    /// </summary>
    public static string NormalizeText(string? input)
    {
        if (string.IsNullOrWhiteSpace(input)) return string.Empty;

        // 1. Normalize unicode (e.g. decomposed form for diacritics stripping)
        string formD = input.Normalize(NormalizationForm.FormKD);
        string withoutDiacritics = DiacriticsRegex.Replace(formD, string.Empty);

        // 2. Remove emojis and special formatting characters
        string clean = SpecialCharsRegex.Replace(withoutDiacritics, " ");

        // 3. Collapse whitespace and lowercase
        clean = WhitespaceRegex.Replace(clean, " ").Trim().ToLowerInvariant();

        return clean;
    }

    /// <summary>
    /// Classifies product title and description into standard category (Name and Slug).
    /// Precedence hierarchy:
    /// 1. Explicit Kids Title (kids/baby/child directly in product title)
    /// 2. Mens (explicit men's wear keywords)
    /// 3. Saree (saree, sari, pallu, weave names - protected against adult false positives)
    /// 4. Lehanga (lehenga, choli, ghagra, half saree)
    /// 5. Dress (kurti, suit, gown, anarkali, coord set, etc.)
    /// 6. Kids Description (if no adult saree/dress override and matches genuine kids patterns)
    /// 7. Default Fallback ("Others" / "general")
    /// </summary>
    public static (string CategoryName, string CategorySlug) Classify(string? title, string? description, string fallbackSlug = DefaultFallbackSlug)
    {
        string normTitle = NormalizeText(title);
        string normDesc = NormalizeText(description);
        string combined = $"{normTitle} {normDesc}".Trim();

        if (string.IsNullOrWhiteSpace(combined))
        {
            return (DefaultFallbackName, fallbackSlug);
        }

        bool hasKidsTitle = KidsKeywordsRegex.IsMatch(normTitle) || KidsAgePattern.IsMatch(normTitle);
        bool hasAdultSizes = AdultSizeRegex.IsMatch(normTitle) || AdultSizeRegex.IsMatch(normDesc);

        // 1. Explicit Kids Title (takes absolute priority if user/vendor titled it as Kids)
        if (hasKidsTitle && !hasAdultSizes)
        {
            return (KidsName, KidsSlug);
        }

        // 2. Check Mens
        if (MensKeywordsRegex.IsMatch(normTitle) || MensKeywordsRegex.IsMatch(normDesc))
        {
            return (MensName, MensSlug);
        }

        // 3. Check Lehanga in Title (e.g. "Pattu silk lehenga", "Crop top with skirt and voni")
        bool hasLehangaTitle = LehangaKeywordsRegex.IsMatch(normTitle);
        if (hasLehangaTitle && !hasKidsTitle)
        {
            return (LehangaName, LehangaSlug);
        }

        // 4. Check Saree (sarees are 5.5m-6.3m adult garments unless explicitly titled for kids)
        // If description has "half saree", that is a Lehanga/Voni style, not a Saree.
        bool hasHalfSaree = normTitle.Contains("half saree") || normTitle.Contains("halfsaree") || 
                            normDesc.Contains("half saree") || normDesc.Contains("halfsaree");
        bool isSaree = (SareeKeywordsRegex.IsMatch(normTitle) || SareeKeywordsRegex.IsMatch(normDesc) ||
                        combined.Contains("saree") || combined.Contains("sari")) && !hasHalfSaree;
        if (isSaree && !hasKidsTitle)
        {
            return (SareeName, SareeSlug);
        }

        // 5. Check Lehanga in Description or Half Saree
        bool isLehanga = hasLehangaTitle || LehangaKeywordsRegex.IsMatch(normDesc) || hasHalfSaree;
        if (isLehanga && !hasKidsTitle)
        {
            return (LehangaName, LehangaSlug);
        }

        // 6. Check Dress
        bool isDress = DressKeywordsRegex.IsMatch(normTitle) || DressKeywordsRegex.IsMatch(normDesc);
        if (isDress && !hasKidsTitle)
        {
            return (DressName, DressSlug);
        }

        // 6. Kids from Description (only if no conflicting adult apparel or adult sizes detected)
        if (!hasAdultSizes && !isSaree && (KidsKeywordsRegex.IsMatch(normDesc) || KidsAgePattern.IsMatch(normDesc)))
        {
            return (KidsName, KidsSlug);
        }

        // 7. If Lehanga or Dress had kids mention in desc, check which one is stronger
        if (isLehanga) return (LehangaName, LehangaSlug);
        if (isDress) return (DressName, DressSlug);
        if (isSaree) return (SareeName, SareeSlug);

        return (DefaultFallbackName, fallbackSlug);
    }

    /// <summary>
    /// Classifies and returns category slug directly.
    /// </summary>
    public static string ClassifySlug(string? title, string? description, string fallbackSlug = DefaultFallbackSlug)
    {
        return Classify(title, description, fallbackSlug).CategorySlug;
    }

    /// <summary>
    /// Classifies and returns category name directly.
    /// </summary>
    public static string ClassifyName(string? title, string? description)
    {
        return Classify(title, description).CategoryName;
    }
}

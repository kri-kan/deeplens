using System;
using System.Globalization;
using System.Text.RegularExpressions;

namespace DeepLens.Infrastructure.Services;

/// <summary>
/// High-precision price and shipping extraction engine for Indian ethnic fashion commerce.
/// Parses WhatsApp vendor captions, catalog descriptions, and OCR text to extract INR prices.
/// </summary>
public static class PriceExtractor
{
    // Pattern 1: Keyword followed by optional filler words, emojis, markdown asterisks, currency symbol, and numeric amount
    // Handles: "Price 1050+ship", "MSP-1099+sip", "Rate : 999 Free Shipping", "PRICR ONLY :- 1199.00/-", "Price only for 950", "Price👍449"
    private static readonly Regex KeywordPricePattern = new(
        @"(?:price|rate|mrp|msp|sell|pp|offer\s*price|cost|prise|pricr|deal\s*price|fixed\s*price)[\s\S]{0,25}?(?:₹|rs\.?|inr)?[\s:=-]*[*_~]?\s*([0-9]{3,5}(?:\.[0-9]{1,2})?)\b",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    // Pattern 2: Currency symbol prefix (₹, Rs., INR) followed by number
    // Handles: "At Just ₹1499/- +ship", "Rs. 850/-", "INR 1200"
    private static readonly Regex CurrencyPrefixPattern = new(
        @"(?:₹|rs\.?|inr)[\s:=-]*[*_~]?\s*([0-9]{3,5}(?:\.[0-9]{1,2})?)\b",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    // Pattern 3: Standard Indian paisa suffix notation (/- or /~)
    // Handles: "💰 👉 *379*/- + GST", "899/-+ship", "1800 fs/-"
    private static readonly Regex PaisaSuffixPattern = new(
        @"\b([0-9]{3,5}(?:\.[0-9]{1,2})?)\s*[*_~]?\s*(?:\/-|\/~)",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    /// <summary>
    /// Extracts price in INR from product description using multi-tier heuristic extraction.
    /// Returns null if no valid price pattern is found.
    /// </summary>
    public static decimal? ExtractPrice(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return null;

        // Tier 1: Explicit keyword pattern
        var match1 = KeywordPricePattern.Match(text);
        if (match1.Success && decimal.TryParse(match1.Groups[1].Value, NumberStyles.Number, CultureInfo.InvariantCulture, out var price1))
        {
            if (price1 >= 100 && price1 <= 99999) return price1;
        }

        // Tier 2: Currency symbol prefix pattern
        var match2 = CurrencyPrefixPattern.Match(text);
        if (match2.Success && decimal.TryParse(match2.Groups[1].Value, NumberStyles.Number, CultureInfo.InvariantCulture, out var price2))
        {
            if (price2 >= 100 && price2 <= 99999) return price2;
        }

        // Tier 3: Paisa suffix pattern
        var match3 = PaisaSuffixPattern.Match(text);
        if (match3.Success && decimal.TryParse(match3.Groups[1].Value, NumberStyles.Number, CultureInfo.InvariantCulture, out var price3))
        {
            if (price3 >= 100 && price3 <= 99999) return price3;
        }

        return null;
    }

    /// <summary>
    /// Determines whether shipping is additional or free based on description text.
    /// Default is true (+shipping).
    /// </summary>
    public static bool DetectIsPlusShipping(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return true;

        string lower = text.ToLowerInvariant();

        // Explicit additional shipping markers
        if (lower.Contains("+ship") || lower.Contains("+ ship") || lower.Contains("+shipping") || 
            lower.Contains("shipping extra") || lower.Contains("ship extra") || lower.Contains("+gst") || lower.Contains("+ gst"))
        {
            return true;
        }

        // Free shipping markers
        if (lower.Contains("free ship") || lower.Contains("freeship") || lower.Contains("free shipping") || 
            lower.Contains("free delivery") || lower.Contains("all india free") || lower.Contains("/-fs") || 
            Regex.IsMatch(lower, @"\bfs\b"))
        {
            return false;
        }

        return true;
    }
}

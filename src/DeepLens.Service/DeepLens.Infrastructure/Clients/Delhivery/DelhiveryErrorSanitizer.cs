using System;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace DeepLens.Infrastructure.Clients.Delhivery;

/// <summary>
/// Extracts and formats user-friendly error messages from raw Delhivery API responses and exceptions.
/// Strips internal server stack traces and technical wrappers for both known rules and unhandled scenarios.
/// </summary>
public static class DelhiveryErrorSanitizer
{
    public static string Sanitize(string? rawError)
    {
        if (string.IsNullOrWhiteSpace(rawError))
        {
            return "Shipment manifestation failed with Delhivery. Please check order details and try again.";
        }

        string trimmed = rawError.Trim();

        // If it already has "Delhivery manifestation failed:", strip prefix for inspection
        if (trimmed.StartsWith("Delhivery manifestation failed:", StringComparison.OrdinalIgnoreCase))
        {
            trimmed = trimmed.Substring("Delhivery manifestation failed:".Length).Trim();
        }

        // If JSON payload is present e.g. {"error": "..."} or {"remarks": ["..."]}
        int jsonStart = trimmed.IndexOf('{');
        int jsonEnd = trimmed.LastIndexOf('}');
        if (jsonStart >= 0 && jsonEnd > jsonStart)
        {
            string jsonCandidate = trimmed.Substring(jsonStart, jsonEnd - jsonStart + 1);
            try
            {
                using var doc = JsonDocument.Parse(jsonCandidate);
                if (doc.RootElement.TryGetProperty("error", out var errProp) && !string.IsNullOrWhiteSpace(errProp.GetString()))
                {
                    trimmed = errProp.GetString()!.Trim();
                }
                else if (doc.RootElement.TryGetProperty("message", out var msgProp) && !string.IsNullOrWhiteSpace(msgProp.GetString()))
                {
                    trimmed = msgProp.GetString()!.Trim();
                }
                else if (doc.RootElement.TryGetProperty("remarks", out var remProp))
                {
                    if (remProp.ValueKind == JsonValueKind.Array && remProp.GetArrayLength() > 0)
                    {
                        var first = remProp[0].GetString();
                        if (!string.IsNullOrWhiteSpace(first)) trimmed = first.Trim();
                    }
                    else if (remProp.ValueKind == JsonValueKind.String)
                    {
                        var s = remProp.GetString();
                        if (!string.IsNullOrWhiteSpace(s)) trimmed = s.Trim();
                    }
                }
            }
            catch
            {
                // retain trimmed as is
            }
        }

        // Extract inner message if wrapped in Delhivery exception quotes:
        // "Crashing while saving package due to exception '...'. Package might have been partially saved."
        var match = Regex.Match(
            trimmed,
            @"exception\s+['""](?<inner>.*?)('(?:\.\s*Package might have been partially saved|\s*$))",
            RegexOptions.IgnoreCase | RegexOptions.Singleline);

        string innerMessage = match.Success ? match.Groups["inner"].Value.Trim() : trimmed;

        if (string.IsNullOrWhiteSpace(innerMessage))
        {
            innerMessage = trimmed;
        }

        // ── 1. Known Domain Categories ──

        // (A) Insufficient Wallet Balance
        if (innerMessage.Contains("insufficient balance", StringComparison.OrdinalIgnoreCase) ||
            innerMessage.Contains("manifest charge API failed", StringComparison.OrdinalIgnoreCase) ||
            innerMessage.Contains("Prepaid client manifest charge", StringComparison.OrdinalIgnoreCase))
        {
            return "Delhivery prepaid wallet balance is insufficient. Please recharge your Delhivery wallet on the Delhivery client panel (one.delhivery.com).";
        }

        // (B) Warehouse / Pickup Location Issues
        if (innerMessage.Contains("Client Warehouse", StringComparison.OrdinalIgnoreCase) &&
            (innerMessage.Contains("doesn't exist", StringComparison.OrdinalIgnoreCase) ||
             innerMessage.Contains("does not exist", StringComparison.OrdinalIgnoreCase) ||
             innerMessage.Contains("not found", StringComparison.OrdinalIgnoreCase)))
        {
            var whMatch = Regex.Match(innerMessage, @"Client Warehouse\s+(?<wh>[^\s]+)\s+doesn", RegexOptions.IgnoreCase);
            var whName = whMatch.Success ? $" '{whMatch.Groups["wh"].Value}'" : string.Empty;
            return $"Pickup facility/warehouse{whName} is not registered or active with Delhivery. Please verify your warehouse configuration in Delhivery panel.";
        }
        if (innerMessage.Contains("pickup location", StringComparison.OrdinalIgnoreCase) &&
            (innerMessage.Contains("not found", StringComparison.OrdinalIgnoreCase) || innerMessage.Contains("invalid", StringComparison.OrdinalIgnoreCase)))
        {
            return "Pickup facility is not recognized by Delhivery. Please check the warehouse code.";
        }

        // (C) Pincode Serviceability & Shipping Mode
        if (innerMessage.Contains("not serviceable", StringComparison.OrdinalIgnoreCase))
        {
            return "Destination pincode is not serviceable by Delhivery for the selected shipping mode.";
        }
        if (innerMessage.Contains("pincode is invalid", StringComparison.OrdinalIgnoreCase) ||
            innerMessage.Contains("invalid pin", StringComparison.OrdinalIgnoreCase))
        {
            return "Delivery pincode is invalid. Please verify the 6-digit postal code.";
        }

        // (D) Phone / Mobile Number
        if ((innerMessage.Contains("mobile", StringComparison.OrdinalIgnoreCase) && innerMessage.Contains("invalid", StringComparison.OrdinalIgnoreCase)) ||
            (innerMessage.Contains("phone", StringComparison.OrdinalIgnoreCase) && innerMessage.Contains("invalid", StringComparison.OrdinalIgnoreCase)))
        {
            return "Customer phone number is invalid. Delhivery requires a valid 10-digit mobile number.";
        }

        // (E) Duplicate Order / Waybill
        if (innerMessage.Contains("already exists", StringComparison.OrdinalIgnoreCase) ||
            innerMessage.Contains("duplicate", StringComparison.OrdinalIgnoreCase))
        {
            return "This order reference or waybill has already been manifested on Delhivery.";
        }

        // (F) Address Missing
        if (innerMessage.Contains("address", StringComparison.OrdinalIgnoreCase) &&
            (innerMessage.Contains("required", StringComparison.OrdinalIgnoreCase) || innerMessage.Contains("empty", StringComparison.OrdinalIgnoreCase)))
        {
            return "Customer delivery address cannot be empty.";
        }

        // (G) Weight / Dimension Limits
        if (innerMessage.Contains("weight limit", StringComparison.OrdinalIgnoreCase) ||
            innerMessage.Contains("dimensions exceed", StringComparison.OrdinalIgnoreCase))
        {
            return "Shipment weight or dimensions exceed Delhivery limits.";
        }

        // ── 2. Unhandled Scenarios: Clean up noisy technical wrappers ──
        string clean = innerMessage;

        // Remove prefix: "Crashing while saving package due to "
        if (clean.StartsWith("Crashing while saving package due to ", StringComparison.OrdinalIgnoreCase))
        {
            clean = clean.Substring("Crashing while saving package due to ".Length).Trim();
        }

        // Remove suffix: ". Package might have been partially saved."
        clean = Regex.Replace(clean, @"\.?\s*Package might have been partially saved\.?", "", RegexOptions.IgnoreCase).Trim();

        // If JSON payload is embedded e.g. {"error": "..."} or {"remarks": ["..."]}
        if (clean.StartsWith("{") && clean.EndsWith("}"))
        {
            try
            {
                using var doc = JsonDocument.Parse(clean);
                if (doc.RootElement.TryGetProperty("error", out var errProp) && !string.IsNullOrWhiteSpace(errProp.GetString()))
                {
                    clean = errProp.GetString()!.Trim();
                }
                else if (doc.RootElement.TryGetProperty("message", out var msgProp) && !string.IsNullOrWhiteSpace(msgProp.GetString()))
                {
                    clean = msgProp.GetString()!.Trim();
                }
                else if (doc.RootElement.TryGetProperty("remarks", out var remProp) &&
                         remProp.ValueKind == JsonValueKind.Array &&
                         remProp.GetArrayLength() > 0)
                {
                    clean = remProp[0].GetString()?.Trim() ?? clean;
                }
            }
            catch
            {
                // retain clean as is
            }
        }

        // Remove leading "Delhivery CMU API error: \d+ - " or "Delhivery API error: "
        clean = Regex.Replace(clean, @"^Delhivery(\s+CMU)?\s+API\s+error:\s*\d*\s*-?\s*", "", RegexOptions.IgnoreCase).Trim();

        // Remove leading "Error: "
        if (clean.StartsWith("Error:", StringComparison.OrdinalIgnoreCase))
        {
            clean = clean.Substring("Error:".Length).Trim();
        }

        clean = clean.Trim().TrimEnd('.');
        if (string.IsNullOrWhiteSpace(clean))
        {
            return "Shipment manifestation failed with Delhivery. Please verify order details.";
        }

        clean = char.ToUpperInvariant(clean[0]) + clean.Substring(1);

        return $"Delhivery: {clean}.";
    }
}

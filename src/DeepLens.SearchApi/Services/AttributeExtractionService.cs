using DeepLens.Contracts.Ingestion;

namespace DeepLens.SearchApi.Services;

public interface IAttributeExtractionService
{
    Task<ExtractedAttributes> ExtractAttributesAsync(string description, string category);
}

public class ExtractedAttributes
{
    public string? Fabric { get; set; }
    public string? Color { get; set; }
    public string? StitchType { get; set; }
    public string? WorkHeaviness { get; set; }
    public List<string> Patterns { get; set; } = new();
    public List<string> Occasions { get; set; } = new();
    public List<string> Tags { get; set; } = new();
    public Dictionary<string, string> OtherAttributes { get; set; } = new();
}

public class LlmAttributeExtractionService : IAttributeExtractionService
{
    private readonly ILogger<LlmAttributeExtractionService> _logger;

    public LlmAttributeExtractionService(ILogger<LlmAttributeExtractionService> logger)
    {
        _logger = logger;
    }

    public async Task<ExtractedAttributes> ExtractAttributesAsync(string description, string category)
    {
        _logger.LogInformation("Extracting attributes from description using LLM for category {Category}", category);

        // This is a placeholder for actual LLM integration (e.g. OpenAI, Gemini)
        // In a real implementation, you would send a prompt like:
        // "Extract fabric, color, stitch type (stitched/unstitched), work style, patterns, and occasion from this description: {description}. 
        // Return JSON format."

        // For now, let's simulate some basic extraction logic for demo/testing
        var result = new ExtractedAttributes();

        if (description.Contains("silk", StringComparison.OrdinalIgnoreCase)) result.Fabric = "Silk";
        if (description.Contains("cotton", StringComparison.OrdinalIgnoreCase)) result.Fabric = "Cotton";
        
        if (description.Contains("blue", StringComparison.OrdinalIgnoreCase)) result.Color = "Blue";
        if (description.Contains("red", StringComparison.OrdinalIgnoreCase)) result.Color = "Red";
        if (description.Contains("green", StringComparison.OrdinalIgnoreCase)) result.Color = "Green";

        if (description.Contains("unstitched", StringComparison.OrdinalIgnoreCase)) result.StitchType = "Unstitched";
        else if (description.Contains("stitched", StringComparison.OrdinalIgnoreCase)) result.StitchType = "Stitched";

        if (description.Contains("heavy", StringComparison.OrdinalIgnoreCase)) result.WorkHeaviness = "Heavy";
        else if (description.Contains("light", StringComparison.OrdinalIgnoreCase)) result.WorkHeaviness = "Low";

        if (description.Contains("floral", StringComparison.OrdinalIgnoreCase)) result.Patterns.Add("Floral");
        if (description.Contains("bridal", StringComparison.OrdinalIgnoreCase)) result.Occasions.Add("Bridal");
        if (description.Contains("party", StringComparison.OrdinalIgnoreCase)) result.Occasions.Add("Partywear");

        return await Task.FromResult(result);
    }
}

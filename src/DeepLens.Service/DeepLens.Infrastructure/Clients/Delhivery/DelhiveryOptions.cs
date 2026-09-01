namespace DeepLens.Infrastructure.Clients.Delhivery;

public class DelhiveryOptions
{
    public const string SectionName = "Delhivery";

    public string BaseUrl { get; set; } = "https://staging-express.delhivery.com";
    public string ApiToken { get; set; } = string.Empty;
    public string ClientName { get; set; } = "VAYYARI";
    public string DefaultPickupLocation { get; set; } = "VAY-CENTRAL-01";
    public string MinioBucket { get; set; } = "deeplens-storage";
    public int TimeoutSeconds { get; set; } = 60;
    public int RetryCount { get; set; } = 3;
}

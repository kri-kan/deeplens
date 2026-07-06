namespace DeepLens.Domain.Entities.Catalog;

public class ProductShareLog
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public string Platform { get; set; } = string.Empty;
    public DateTimeOffset SharedAt { get; set; }
    public string? DescriptionUsed { get; set; }

    public Product? Product { get; set; }
}

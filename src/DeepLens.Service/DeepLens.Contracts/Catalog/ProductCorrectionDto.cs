using System;

namespace DeepLens.Contracts.Catalog;

public class ProductCorrectionDto
{
    public string? CategoryName { get; set; }
    public string? Fabric { get; set; }
    public decimal? Price { get; set; }
    public bool UseForTraining { get; set; }
}

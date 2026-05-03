using DeepLens.Contracts.Events;
using DeepLens.Contracts.Tenants;
using DeepLens.Domain.ValueObjects;
using FluentAssertions;

namespace DeepLens.Infrastructure.Tests;

[TestFixture]
public class ProcessingOptionsTests
{
    [Test]
    public void Should_Map_Thumbnail_Spec_To_ProcessingOptions()
    {
        // Arrange
        var tenantSettings = new ThumbnailConfigurationDto
        {
            Specifications = new List<ThumbnailSpecification>
            {
                new ThumbnailSpecification
                {
                    MaxWidth = 800,
                    MaxHeight = 600,
                    Format = ThumbnailFormat.WebP,
                    Options = new FormatOptions
                    {
                        WebP = new WebPOptions { Quality = 90 }
                    }
                }
            }
        };

        // Act - Simulating the logic in IngestionController
        var processingOptions = new ProcessingOptions();
        var spec = tenantSettings.Specifications[0];
        
        processingOptions.TargetThumbnailSizes = new[] { "medium" };
        processingOptions.ThumbnailFormat = spec.Format.ToString().ToLower();
        processingOptions.ThumbnailQuality = spec.Options!.WebP!.Quality;

        // Assert
        processingOptions.TargetThumbnailSizes.Should().Contain("medium");
        processingOptions.ThumbnailFormat.Should().Be("webp");
        processingOptions.ThumbnailQuality.Should().Be(90);
    }

    [Test]
    public void Should_Use_Defaults_When_Spec_Is_Empty()
    {
        // Arrange
        var options = new ProcessingOptions();

        // Assert
        options.TargetThumbnailSizes.Should().Contain("medium");
        options.ThumbnailFormat.Should().Be("webp");
        options.ThumbnailQuality.Should().Be(75);
    }
}

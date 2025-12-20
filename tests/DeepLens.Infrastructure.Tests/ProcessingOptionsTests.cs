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
        
        processingOptions.ThumbnailWidth = spec.MaxWidth;
        processingOptions.ThumbnailHeight = spec.MaxHeight;
        processingOptions.ThumbnailFormat = spec.Format.ToString().ToLower();
        processingOptions.ThumbnailQuality = spec.Options!.WebP!.Quality;

        // Assert
        processingOptions.ThumbnailWidth.Should().Be(800);
        processingOptions.ThumbnailHeight.Should().Be(600);
        processingOptions.ThumbnailFormat.Should().Be("webp");
        processingOptions.ThumbnailQuality.Should().Be(90);
    }

    [Test]
    public void Should_Use_Defaults_When_Spec_Is_Empty()
    {
        // Arrange
        var options = new ProcessingOptions();

        // Assert
        options.ThumbnailWidth.Should().Be(512);
        options.ThumbnailHeight.Should().Be(512);
        options.ThumbnailFormat.Should().Be("webp");
        options.ThumbnailQuality.Should().Be(75);
    }
}

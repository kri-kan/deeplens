using System.Text.Json;
using DeepLens.Contracts.Tenants;
using DeepLens.Domain.ValueObjects;
using FluentAssertions;

namespace DeepLens.Infrastructure.Tests;

[TestFixture]
public class TenantSettingsTests
{
    [Test]
    public void Should_Deserialize_TenantSettings_With_Thumbnails()
    {
        // Arrange
        var settingsJson = @"{
            ""thumbnails"": {
                ""enabled"": true,
                ""specifications"": [
                    {
                        ""name"": ""grid-view"",
                        ""maxWidth"": 1024,
                        ""maxHeight"": 1024,
                        ""format"": ""WebP"",
                        ""options"": {
                            ""webp"": {
                                ""quality"": 85
                            }
                        }
                    }
                ]
            }
        }";

        // Act
        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        var root = JsonSerializer.Deserialize<Dictionary<string, object>>(settingsJson, options);
        root.Should().NotBeNull();
        
        var thumbObj = root!["thumbnails"].ToString();
        var config = JsonSerializer.Deserialize<ThumbnailConfigurationDto>(thumbObj!, options);

        // Assert
        config.Should().NotBeNull();
        config!.Enabled.Should().BeTrue();
        config.Specifications.Should().HaveCount(1);
        
        var spec = config.Specifications[0];
        spec.Name.Should().Be("grid-view");
        spec.MaxWidth.Should().Be(1024);
        spec.Format.Should().Be(ThumbnailFormat.WebP);
        spec.Options!.WebP!.Quality.Should().Be(85);
    }

    [Test]
    public void Should_Handle_Missing_Thumbnail_Settings_Gracefully()
    {
        // Arrange
        var settingsJson = @"{ ""other_setting"": true }";

        // Act
        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        var root = JsonSerializer.Deserialize<Dictionary<string, object>>(settingsJson, options);
        
        // Assert
        root!.ContainsKey("thumbnails").Should().BeFalse();
    }
}

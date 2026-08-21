using DeepLens.Domain.ValueObjects;
using NUnit.Framework;
using FluentAssertions;

namespace DeepLens.Domain.Tests;

[TestFixture]
public class ThumbnailSpecificationTests
{
    [Test]
    public void ThumbnailSpecification_DefaultValues_ShouldBeWebPOptimized()
    {
        var spec = new ThumbnailSpecification
        {
            Name = "medium",
            MaxWidth = 512,
            MaxHeight = 512
        };

        spec.Format.Should().Be(ThumbnailFormat.WebP);
        spec.FitMode.Should().Be(FitMode.Inside);
        spec.StripMetadata.Should().BeTrue();
        spec.BackgroundColor.Should().Be("#FFFFFF");
        spec.Options.Should().NotBeNull();
    }

    [Test]
    public void WebPOptions_Defaults_ShouldHaveQuality85AndMethod4()
    {
        var webp = new WebPOptions();

        webp.Quality.Should().Be(85);
        webp.Method.Should().Be(4);
        webp.Lossless.Should().BeFalse();
        webp.AlphaQuality.Should().Be(90);
    }

    [Test]
    public void JpegOptions_Defaults_ShouldBeProgressiveWithQuality85()
    {
        var jpeg = new JpegOptions();

        jpeg.Quality.Should().Be(85);
        jpeg.Progressive.Should().BeTrue();
        jpeg.ChromaSubsampling.Should().Be("4:2:0");
    }
}

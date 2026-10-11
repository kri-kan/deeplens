using System.Threading;
using System.Threading.Tasks;
using DeepLens.Infrastructure.Services;
using FluentAssertions;
using NUnit.Framework;

namespace DeepLens.Infrastructure.Tests;

[TestFixture]
public class PdfRasterizerTests
{
    [Test]
    public void IsAvailable_ReturnsTrue_WhenPdftoppmIsInstalled()
    {
        var available = PdfRasterizer.IsAvailable();
        available.Should().BeTrue();
    }

    [Test]
    public async Task ConvertPdfToPngAsync_WithEmptyBytes_ReturnsNull()
    {
        var result = await PdfRasterizer.ConvertPdfToPngAsync(System.Array.Empty<byte>(), 200, null, CancellationToken.None);
        result.Should().BeNull();
    }
}

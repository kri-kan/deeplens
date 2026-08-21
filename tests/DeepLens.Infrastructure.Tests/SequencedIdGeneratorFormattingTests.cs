using NUnit.Framework;
using FluentAssertions;
using System.Reflection;
using DeepLens.Infrastructure.IdGeneration;

namespace DeepLens.Infrastructure.Tests;

[TestFixture]
public class SequencedIdGeneratorFormattingTests
{
    private MethodInfo? _toBase36Method;

    [SetUp]
    public void Setup()
    {
        _toBase36Method = typeof(SequencedIdGenerator)
            .GetMethod("ToBase36", BindingFlags.NonPublic | BindingFlags.Static);
    }

    [TestCase(1L, 5, "00001")]
    [TestCase(10L, 5, "0000A")]
    [TestCase(35L, 5, "0000Z")]
    [TestCase(36L, 5, "00010")]
    [TestCase(46655L, 5, "00ZZZ")]
    [TestCase(0L, 5, "00000")]
    public void ToBase36_FormatsSequenceNumbersCorrectly(long value, int minLength, string expected)
    {
        _toBase36Method.Should().NotBeNull();
        var result = (string)_toBase36Method!.Invoke(null, new object[] { value, minLength })!;

        result.Should().Be(expected);
    }

    [Test]
    public void HexFormatting_FormatsProductIdHex()
    {
        long val = 255;
        string hex = val.ToString("X3");

        hex.Should().Be("0FF");
    }
}

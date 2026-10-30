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

    [TestCase(7L, "007")]
    [TestCase(255L, "0FF")]
    [TestCase(4095L, "FFF")]
    [TestCase(4096L, "1000")]
    [TestCase(65535L, "FFFF")]
    [TestCase(65536L, "10000")]
    [TestCase(130243L, "1FCC3")]
    [TestCase(1048575L, "FFFFF")]
    [TestCase(1048576L, "100000")]
    public void HexFormatting_FormatsProductIdHex_ExpandsBeyondThreeDigitsWithoutTruncation(long val, string expectedHex)
    {
        string hex = val.ToString("X3");
        hex.Should().Be(expectedHex);
    }
}

using DeepLens.Infrastructure.Services;
using FluentAssertions;
using NUnit.Framework;

namespace DeepLens.Infrastructure.Tests;

[TestFixture]
public class PriceExtractorTests
{
    [TestCase("MSP-1099+sip", 1099.0)]
    [TestCase("💰 👉 *379*/- + GST", 379.0)]
    [TestCase("Price 1050+ship", 1050.0)]
    [TestCase("Price only for 950+$$$", 950.0)]
    [TestCase("Rate 1370 free ship", 1370.0)]
    [TestCase("Rate :  999 Free Shipping", 999.0)]
    [TestCase("Rate :- 1800 fs/-", 1800.0)]
    [TestCase("Price Only :- 799+ship", 799.0)]
    [TestCase("PRICR ONLY :- 1199.00/-Wow Rate", 1199.0)]
    [TestCase("PRICE: ₹599+ship", 599.0)]
    [TestCase("Rate - 699+$", 699.0)]
    [TestCase("Price👍449", 449.0)]
    [TestCase("sale Price :- 1250 shipping free", 1250.0)]
    [TestCase("At Just ₹1499/- +ship", 1499.0)]
    [TestCase("👉 💰Price:-1099,+$ 💸", 1099.0)]
    [TestCase("SELL : 600 fs", 600.0)]
    [TestCase("Price:- 760 free ship", 760.0)]
    [TestCase("Super super super best offer price only for 950 +$$$✈️ ✈️", 950.0)]
    [TestCase("Rate: 1220 free ship", 1220.0)]
    [TestCase("3085 VANYA EMERALD \n Material:- Sparkling Georgette \n Size:- S-36 M-38 L-40 Xl-42 \n Price:-899/-fs", 899.0)]
    public void ExtractPrice_RealWorldIndianFashionCaptions_ExtractsCorrectPrice(string input, double expectedPrice)
    {
        var price = PriceExtractor.ExtractPrice(input);
        price.Should().NotBeNull();
        price!.Value.Should().Be((decimal)expectedPrice);
    }

    [TestCase("Rate 1370 free ship", false)]
    [TestCase("Rate :  999 Free Shipping", false)]
    [TestCase("Rate :- 1800 fs/-", false)]
    [TestCase("SELL : 600 fs", false)]
    [TestCase("Price 1050+ship", true)]
    [TestCase("Price:- 760 + shipping", true)]
    [TestCase("MSP-1099+sip", true)]
    [TestCase("💰 👉 *379*/- + GST", true)]
    public void DetectIsPlusShipping_Tests(string input, bool expectedPlusShipping)
    {
        var isPlusShipping = PriceExtractor.DetectIsPlusShipping(input);
        isPlusShipping.Should().Be(expectedPlusShipping);
    }
}

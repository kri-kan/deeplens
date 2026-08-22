using DeepLens.Infrastructure.Services;
using FluentAssertions;
using NUnit.Framework;

namespace DeepLens.Infrastructure.Tests;

[TestFixture]
public class CategoryClassifierTests
{
    [TestCase("*MDS New Launching Đěsigner saree*", null, "saree", "Saree")]
    [TestCase("Pure Banarasi Silk Saree with Rich Pallu", "Running blouse piece included", "saree", "Saree")]
    [TestCase("Kanjivaram Pattu Saree", "Grand zari border, contrast pallu", "saree", "Saree")]
    [TestCase("Tissue Saree Collection", "Price 1450 free shipping", "saree", "Saree")]
    [TestCase("Gadwal checks silk saree", "Gadhwal checks pattu", "saree", "Saree")]
    public void Classify_SareeExamples_ReturnsSaree(string? title, string? desc, string expectedSlug, string expectedName)
    {
        var result = CategoryClassifier.Classify(title, desc);
        result.CategorySlug.Should().Be(expectedSlug);
        result.CategoryName.Should().Be(expectedName);
    }

    [TestCase("This exquisite most trending Gadhwal checks Pattu silk with jacquard border lehenga", null, "lehanga", "Lehanga")]
    [TestCase("*🤷‍♀️New Launching Embroidery Work Lehenga Choli🤷‍♀️*", null, "lehanga", "Lehanga")]
    [TestCase("Tasar Silk Stitched Lehenga With Kalamkari Print And Lace Border Package Set", null, "lehanga", "Lehanga")]
    [TestCase("Chaniya Choli for Navratri", "Full flair ghagra with dupatta", "lehanga", "Lehanga")]
    [TestCase("Crop top with skirt and voni", "Designer half saree style", "lehanga", "Lehanga")]
    public void Classify_LehangaExamples_ReturnsLehanga(string? title, string? desc, string expectedSlug, string expectedName)
    {
        var result = CategoryClassifier.Classify(title, desc);
        result.CategorySlug.Should().Be(expectedSlug);
        result.CategoryName.Should().Be(expectedName);
    }

    [TestCase("Designer Kurti with Palazzo", "Pure cotton straight kurti with pant", "dress", "Dress")]
    [TestCase("Heavy Anarkali Gown", "Floor length party wear gown with dupatta", "dress", "Dress")]
    [TestCase("Salwar Suit 3 Piece Set", "Unstitched dress material with dupatta", "dress", "Dress")]
    [TestCase("Trending Co-ord Set", "Western style 2 piece cord set for women", "dress", "Dress")]
    [TestCase("Sharara Suit Set", "Georgette peplum top with sharara", "dress", "Dress")]
    public void Classify_DressExamples_ReturnsDress(string? title, string? desc, string expectedSlug, string expectedName)
    {
        var result = CategoryClassifier.Classify(title, desc);
        result.CategorySlug.Should().Be(expectedSlug);
        result.CategoryName.Should().Be(expectedName);
    }

    [TestCase("Kids Cotton Frock", "Age 2-6 years, soft cotton material", "kids", "Kids")]
    [TestCase("Girls Lehenga Choli", "Size 8-10 yrs for wedding", "kids", "Kids")]
    [TestCase("Boys Kurta Pajama", "Size 4 years, baby ethnic wear", "kids", "Kids")]
    [TestCase("Cute Baby Infant Wear", "0-6 months baba suit", "kids", "Kids")]
    [TestCase("Pattu Pavadai for Kids", "Traditional children wear", "kids", "Kids")]
    public void Classify_KidsExamples_ReturnsKids(string? title, string? desc, string expectedSlug, string expectedName)
    {
        var result = CategoryClassifier.Classify(title, desc);
        result.CategorySlug.Should().Be(expectedSlug);
        result.CategoryName.Should().Be(expectedName);
    }

    [TestCase("Men's Silk Sherwani", "Royal wedding wear for groom", "mens", "Mens")]
    [TestCase("Kurta Pajama Set for Men", "Pure linen kurta pyjama", "mens", "Mens")]
    [TestCase("Men Nehru Jacket", "Ethnic waistcoat for men", "mens", "Mens")]
    [TestCase("Pathani Suit", "Mens ethnic pathani collection", "mens", "Mens")]
    public void Classify_MensExamples_ReturnsMens(string? title, string? desc, string expectedSlug, string expectedName)
    {
        var result = CategoryClassifier.Classify(title, desc);
        result.CategorySlug.Should().Be(expectedSlug);
        result.CategoryName.Should().Be(expectedName);
    }

    [TestCase("16 colours in shades", null, "general", "Others")]
    [TestCase("Hit design _Rashmika", null, "general", "Others")]
    [TestCase("Original video", null, "general", "Others")]
    [TestCase("", null, "general", "Others")]
    [TestCase(null, null, "general", "Others")]
    public void Classify_UnspecifiedExamples_ReturnsFallback(string? title, string? desc, string expectedSlug, string expectedName)
    {
        var result = CategoryClassifier.Classify(title, desc);
        result.CategorySlug.Should().Be(expectedSlug);
        result.CategoryName.Should().Be(expectedName);
    }
}

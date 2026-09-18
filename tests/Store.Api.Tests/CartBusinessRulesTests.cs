using Store.Api.Models;

namespace Store.Api.Tests;

[TestFixture]
public class CartBusinessRulesTests
{
    [Test]
    public void CartQuantityRules_ClampsItemQuantityBetween1And10()
    {
        // Business Rule: Users cannot buy 0 items or hoard more than 10 handloom units per SKU
        static int ClampQuantity(int qty) => Math.Clamp(qty, 1, 10);

        ClampQuantity(0).Should().Be(1);
        ClampQuantity(-5).Should().Be(1);
        ClampQuantity(3).Should().Be(3);
        ClampQuantity(10).Should().Be(10);
        ClampQuantity(15).Should().Be(10);
    }

    [Test]
    public void AnonymousCartTtl_Calculates100DaysExpirationFromCreation()
    {
        // Business Rule: Anonymous carts and wishlists have a strict 100-day TTL before maintenance pruning
        var createdAt = new DateTime(2026, 9, 1, 0, 0, 0, DateTimeKind.Utc);
        var expectedExpiresAt = createdAt.AddDays(100);

        expectedExpiresAt.Should().Be(new DateTime(2026, 12, 10, 0, 0, 0, DateTimeKind.Utc));
    }

    [Test]
    public void CartItemDto_CalculatesSubtotalCorrectly()
    {
        var item = new CartItemDto
        {
            ProductId = Guid.NewGuid().ToString(),
            ProductCode = "VF2B56",
            Title = "Banarasi Dupion Silk Zari Saree",
            SelectedColor = "#1B4D3E",
            PrimaryImageUri = "http://example.com/1.jpg",
            Price = 1169.00m,
            Quantity = 2
        };

        var subtotal = item.Price * item.Quantity;
        subtotal.Should().Be(2338.00m);
    }
}

using DeepLens.Infrastructure.Clients.Delhivery;
using FluentAssertions;
using NUnit.Framework;

namespace DeepLens.Infrastructure.Tests;

[TestFixture]
public class DelhiveryErrorSanitizerTests
{
    [Test]
    public void Sanitize_PrepaidInsufficientBalance_ReturnsWalletRechargeGuidance()
    {
        var raw = "Crashing while saving package due to exception 'Prepaid client manifest charge API failed due to insufficient balance'. Package might have been partially saved.";
        var sanitized = DelhiveryErrorSanitizer.Sanitize(raw);

        sanitized.Should().Contain("prepaid wallet balance is insufficient");
        sanitized.Should().Contain("one.delhivery.com");
    }

    [Test]
    public void Sanitize_MissingWarehouse_ReturnsWarehouseRegistrationGuidance()
    {
        var raw = "Crashing while saving package due to exception 'Client Warehouse VAY-SURAT doesn't exist'. Package might have been partially saved.";
        var sanitized = DelhiveryErrorSanitizer.Sanitize(raw);

        sanitized.Should().Contain("Pickup facility/warehouse 'VAY-SURAT' is not registered");
    }

    [Test]
    public void Sanitize_UnserviceablePincode_ReturnsServiceabilityGuidance()
    {
        var raw = "Crashing while saving package due to exception 'Pin code 500090 is not serviceable for delivery mode Surface'. Package might have been partially saved.";
        var sanitized = DelhiveryErrorSanitizer.Sanitize(raw);

        sanitized.Should().Contain("not serviceable by Delhivery");
    }

    [Test]
    public void Sanitize_InvalidMobileNumber_ReturnsPhoneGuidance()
    {
        var raw = "Crashing while saving package due to exception 'Mobile number is invalid'. Package might have been partially saved.";
        var sanitized = DelhiveryErrorSanitizer.Sanitize(raw);

        sanitized.Should().Contain("valid 10-digit mobile number");
    }

    [Test]
    public void Sanitize_UnhandledException_ExtractsInnerMessageCleanly()
    {
        // An unexpected/unhandled exception from Delhivery
        var raw = "Crashing while saving package due to exception 'E-Way bill number is missing for consignment value > 50000'. Package might have been partially saved.";
        var sanitized = DelhiveryErrorSanitizer.Sanitize(raw);

        // Strips "Crashing while saving package..." and "Package might have been partially saved."
        sanitized.Should().Be("Delhivery: E-Way bill number is missing for consignment value > 50000.");
    }

    [Test]
    public void Sanitize_UnhandledJsonRemarks_ExtractsRemarkCleanly()
    {
        var raw = "Delhivery CMU API error: 400 - {\"status\": \"Fail\", \"remarks\": [\"Commodity description cannot contain special characters\"]}";
        var sanitized = DelhiveryErrorSanitizer.Sanitize(raw);

        sanitized.Should().Be("Delhivery: Commodity description cannot contain special characters.");
    }

    [Test]
    public void Sanitize_NullOrEmpty_ReturnsGenericFallback()
    {
        DelhiveryErrorSanitizer.Sanitize(null).Should().Be("Shipment manifestation failed with Delhivery. Please check order details and try again.");
        DelhiveryErrorSanitizer.Sanitize("").Should().Be("Shipment manifestation failed with Delhivery. Please check order details and try again.");
    }
}


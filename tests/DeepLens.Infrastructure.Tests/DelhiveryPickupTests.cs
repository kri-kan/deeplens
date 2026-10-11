using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using DeepLens.Application.Abstractions.Data;
using DeepLens.Contracts.Logistics;
using DeepLens.Infrastructure.Clients.Delhivery;
using DeepLens.Infrastructure.Services.Logistics;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using NUnit.Framework;

namespace DeepLens.Infrastructure.Tests;

[TestFixture]
public class DelhiveryPickupTests
{
    private Mock<IDelhiveryClient> _delhiveryClientMock = null!;
    private Mock<IDbConnectionFactory> _dbConnectionFactoryMock = null!;
    private Mock<ILogger<PickupService>> _loggerMock = null!;
    private PickupService _pickupService = null!;

    [SetUp]
    public void SetUp()
    {
        _delhiveryClientMock = new Mock<IDelhiveryClient>();
        _dbConnectionFactoryMock = new Mock<IDbConnectionFactory>();
        _loggerMock = new Mock<ILogger<PickupService>>();
        _pickupService = new PickupService(_delhiveryClientMock.Object, _dbConnectionFactoryMock.Object, _loggerMock.Object);
    }

    [Test]
    public void Deserialize_DelhiveryExistingPickupResponse_ParsesNumericPickupIdAndMessage()
    {
        // Exact real response returned by Delhivery API in production
        var json = """
        {
            "data": {
                "message": "A Pickup Request 327731325 for this Pickup Location Already Exist for 12 Oct in slot 18:00 - 21:00"
            },
            "pr_exist": true,
            "pickup_id": 327731325,
            "error": {
                "code": 669,
                "message": "A Pickup Request 327731325 for this Pickup Location Already Exist for 12 Oct in slot 18:00 - 21:00"
            },
            "success": false,
            "status": true
        }
        """;

        var options = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        };
        options.Converters.Add(new FlexibleStringConverter());

        var response = JsonSerializer.Deserialize<DelhiveryPickupResponse>(json, options);

        response.Should().NotBeNull();
        response!.PickupId.Should().Be("327731325");
        response.PrExist.Should().BeTrue();
        response.GetEffectiveMessage().Should().Be("A Pickup Request 327731325 for this Pickup Location Already Exist for 12 Oct in slot 18:00 - 21:00");
    }

    [Test]
    public void Deserialize_DelhiveryNewPickupResponse_ParsesStringPickupId()
    {
        var json = """
        {
            "pickup_id": "400123456",
            "pickup_token": "TOK-998877",
            "pickup_date": "2026-10-12",
            "pickup_time": "14:00:00",
            "pickup_location": "Hyd apartment",
            "message": "Pickup scheduled successfully",
            "status": true
        }
        """;

        var options = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        };
        options.Converters.Add(new FlexibleStringConverter());

        var response = JsonSerializer.Deserialize<DelhiveryPickupResponse>(json, options);

        response.Should().NotBeNull();
        response!.PickupId.Should().Be("400123456");
        response.PickupToken.Should().Be("TOK-998877");
        response.GetEffectiveMessage().Should().Be("Pickup scheduled successfully");
    }

    [Test]
    public async Task SchedulePickupAsync_WhenPickupAlreadyExists_ReturnsSuccessTrueWithExistingIdAndMessage()
    {
        var pickupReq = new PickupRequestDto
        {
            PickupLocation = "Hyd apartment",
            PickupDate = "2026-10-12",
            PickupTime = "18:00:00",
            ExpectedPackageCount = 1
        };

        var delhiveryResponse = new DelhiveryPickupResponse
        {
            PickupId = "327731325",
            PrExist = true,
            Success = false,
            Status = true,
            Message = "A Pickup Request 327731325 for this Pickup Location Already Exist for 12 Oct in slot 18:00 - 21:00"
        };

        _delhiveryClientMock.Setup(c => c.SchedulePickupAsync(It.IsAny<DelhiveryPickupRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(delhiveryResponse);

        var result = await _pickupService.SchedulePickupAsync(pickupReq);

        result.Should().NotBeNull();
        result.Success.Should().BeTrue();
        result.PickupId.Should().Be("327731325");
        result.PrExist.Should().BeTrue();
        result.Message.Should().Contain("Already Exist");
    }

    [Test]
    public async Task SchedulePickupAsync_WhenFailureWithoutExistingPickup_ReturnsSuccessFalseWithErrorMessage()
    {
        var pickupReq = new PickupRequestDto
        {
            PickupLocation = "Invalid Location",
            PickupDate = "2026-10-12",
            PickupTime = "18:00:00"
        };

        var errorJson = JsonDocument.Parse("""{"code": 404, "message": "Pickup facility not found"}""").RootElement;
        var delhiveryResponse = new DelhiveryPickupResponse
        {
            Success = false,
            Status = false,
            Error = errorJson
        };

        _delhiveryClientMock.Setup(c => c.SchedulePickupAsync(It.IsAny<DelhiveryPickupRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(delhiveryResponse);

        var result = await _pickupService.SchedulePickupAsync(pickupReq);

        result.Should().NotBeNull();
        result.Success.Should().BeFalse();
        result.Message.Should().Be("Pickup facility not found");
    }
}

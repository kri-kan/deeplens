using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using DeepLens.Contracts.Logistics;
using DeepLens.Infrastructure.Clients.Delhivery;
using Microsoft.Extensions.Logging;

namespace DeepLens.Infrastructure.Services.Logistics;

public class PincodeService : IPincodeService
{
    private readonly IDelhiveryClient _delhiveryClient;
    private readonly ILogger<PincodeService> _logger;

    public PincodeService(IDelhiveryClient delhiveryClient, ILogger<PincodeService> logger)
    {
        _delhiveryClient = delhiveryClient;
        _logger = logger;
    }

    public async Task<PincodeCheckResponse> CheckPincodeAsync(string pincode, CancellationToken ct = default)
    {
        var cleanPin = pincode?.Trim() ?? string.Empty;
        var response = await _delhiveryClient.CheckPincodeServiceabilityAsync(cleanPin, ct);

        var code = response?.DeliveryCodes?.FirstOrDefault()?.PostalCode;
        if (code == null)
        {
            return new PincodeCheckResponse
            {
                Pincode = cleanPin,
                IsServiceable = false,
                CodAvailable = false,
                PrepaidAvailable = false,
                PickupAvailable = false,
                ExpressServiceable = false,
                SurfaceServiceable = false
            };
        }

        bool isPrepaid = string.Equals(code.PrePaid, "Y", StringComparison.OrdinalIgnoreCase);
        bool isCod = string.Equals(code.Cod, "Y", StringComparison.OrdinalIgnoreCase) || string.Equals(code.Cash, "Y", StringComparison.OrdinalIgnoreCase);
        bool isPickup = string.Equals(code.Pickup, "Y", StringComparison.OrdinalIgnoreCase);
        bool isServiceable = isPrepaid || isCod || isPickup;

        return new PincodeCheckResponse
        {
            Pincode = cleanPin,
            IsServiceable = isServiceable,
            CodAvailable = isCod,
            PrepaidAvailable = isPrepaid,
            PickupAvailable = isPickup,
            State = code.StateCode,
            District = code.District,
            City = code.District,
            ExpressServiceable = isServiceable,
            SurfaceServiceable = isServiceable
        };
    }
}

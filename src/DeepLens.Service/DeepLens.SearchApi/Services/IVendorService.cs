using DeepLens.Contracts.Vendors;

namespace DeepLens.SearchApi.Services;

/// <summary>
/// Service for vendor management. Single-tenant version.
/// </summary>
public interface IVendorService
{
    Task<VendorResponse> CreateVendorAsync(CreateVendorRequest request);
    Task<VendorResponse?> GetVendorByIdAsync(Guid vendorId);
    Task<VendorListResponse> ListVendorsAsync(int page, int pageSize, bool? activeOnly);
    Task<VendorResponse> UpdateVendorAsync(Guid vendorId, UpdateVendorRequest request);
    Task<bool> DeleteVendorAsync(Guid vendorId);

    Task<List<VendorAddressResponse>> GetVendorAddressesAsync(Guid vendorId);
    Task<VendorAddressResponse> AddVendorAddressAsync(Guid vendorId, VendorAddressRequest request);
    Task<VendorAddressResponse> UpdateVendorAddressAsync(Guid addressId, VendorAddressRequest request);
    Task<bool> DeleteVendorAddressAsync(Guid addressId);
    Task<bool> SetDefaultAddressAsync(Guid vendorId, Guid addressId);
}

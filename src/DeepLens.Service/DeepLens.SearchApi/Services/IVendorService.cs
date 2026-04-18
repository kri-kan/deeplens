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
    Task<VendorContactResponse> AddContactAsync(Guid vendorId, VendorContactRequest request);
    Task<bool> RemoveContactAsync(Guid contactId);
}

using DeepLens.Contracts.Vendors;

namespace DeepLens.SearchApi.Services;

public interface IVendorService
{
    Task<VendorResponse> CreateVendorAsync(Guid tenantId, CreateVendorRequest request);
    Task<VendorResponse?> GetVendorByIdAsync(Guid tenantId, Guid vendorId);
    Task<VendorListResponse> ListVendorsAsync(Guid tenantId, int page, int pageSize, bool? activeOnly);
    Task<VendorResponse> UpdateVendorAsync(Guid tenantId, Guid vendorId, UpdateVendorRequest request);
    Task<bool> DeleteVendorAsync(Guid tenantId, Guid vendorId);
    Task<VendorContactResponse> AddContactAsync(Guid tenantId, Guid vendorId, VendorContactRequest request);
    Task<bool> RemoveContactAsync(Guid tenantId, Guid contactId);
}

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace DeepLens.Contracts.Customers;

public interface ICustomerService
{
    Task<CustomerDto?> GetCustomerByIdAsync(Guid id);
    Task<CustomerListResponse> GetAllCustomersAsync(string? search = null, string? sortBy = "createdAt", string? sortOrder = "desc", int page = 1, int pageSize = 50, bool? isArchived = null, bool? hasPhone = null, bool? hasInstagram = null, bool? isFollower = null);
    Task<CustomerDto> CreateCustomerAsync(CreateCustomerRequest request);
    Task<bool> UpdateCustomerAsync(Guid id, CreateCustomerRequest request);
    Task<bool> DeleteCustomerAsync(Guid id);
    Task<bool> SafeDeleteDummyCustomerAsync(Guid id);
    
    Task<Guid> AddAddressAsync(Guid customerId, CreateAddressRequest request);
    Task<bool> UpdateAddressAsync(Guid addressId, CreateAddressRequest request);
    Task<bool> DeleteAddressAsync(Guid addressId);
    Task<bool> SetDefaultAddressAsync(Guid customerId, Guid addressId);

    Task<bool> ValidateInstagramHandleAsync(string username, Guid? currentCustomerId);
    Task<IEnumerable<LanguageDto>> GetPreferredLanguagesMasterAsync();
}

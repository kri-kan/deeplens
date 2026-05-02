using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace DeepLens.Contracts.Customers;

public interface ICustomerService
{
    Task<CustomerDto?> GetCustomerByIdAsync(Guid id);
    Task<IEnumerable<CustomerDto>> GetAllCustomersAsync(int limit = 50, int offset = 0);
    Task<CustomerDto> CreateCustomerAsync(CreateCustomerRequest request);
    Task<bool> UpdateCustomerAsync(Guid id, CreateCustomerRequest request);
    Task<bool> DeleteCustomerAsync(Guid id);
    
    Task<Guid> AddAddressAsync(Guid customerId, CreateAddressRequest request);
    Task<bool> UpdateAddressAsync(Guid addressId, CreateAddressRequest request);
    Task<bool> DeleteAddressAsync(Guid addressId);
    Task<bool> SetDefaultAddressAsync(Guid customerId, Guid addressId);
}

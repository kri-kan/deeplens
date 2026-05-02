using DeepLens.Domain.Entities;

namespace DeepLens.Application.Abstractions.Data;

public interface ICustomerRepository
{
    Task<Customer?> GetByIdAsync(Guid id);
    Task<Customer?> GetByPhoneOrInstagramAsync(string? phone, string? instagramId);
    Task<IEnumerable<Customer>> GetAllAsync(int limit, int offset);
    Task<Guid> CreateAsync(Customer customer);
    Task<bool> UpdateAsync(Customer customer);
    Task<bool> DeleteAsync(Guid id);
    
    // Address management
    Task<IEnumerable<CustomerAddress>> GetAddressesByCustomerIdAsync(Guid customerId);
    Task<Guid> AddAddressAsync(CustomerAddress address);
    Task<bool> UpdateAddressAsync(CustomerAddress address);
    Task<bool> DeleteAddressAsync(Guid addressId);
    Task<bool> SetDefaultAddressAsync(Guid customerId, Guid addressId);
}

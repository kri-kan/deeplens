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

    // Multi-handle Instagram & Languages mapping
    Task<Guid?> GetCustomerIdByInstagramUsernameAsync(string username);
    Task<IEnumerable<DeepLens.Contracts.Customers.LanguageDto>> GetPreferredLanguagesMasterAsync();
    Task SaveInstagramAccountsAsync(Guid customerId, List<DeepLens.Contracts.Customers.CustomerInstagramAccountDto> accounts);
    Task SavePreferredLanguagesAsync(Guid customerId, List<string> languages);
}

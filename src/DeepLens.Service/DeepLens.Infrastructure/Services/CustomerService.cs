using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using DeepLens.Application.Abstractions.Data;
using DeepLens.Application.Abstractions.IdGeneration;
using DeepLens.Contracts.Customers;
using DeepLens.Domain.Entities;

namespace DeepLens.Infrastructure.Services;

public class CustomerService : ICustomerService
{
    private readonly ICustomerRepository _customerRepository;
    private readonly ISequencedIdGenerator _idGenerator;

    public CustomerService(ICustomerRepository customerRepository, ISequencedIdGenerator idGenerator)
    {
        _customerRepository = customerRepository;
        _idGenerator = idGenerator;
    }

    public async Task<CustomerDto?> GetCustomerByIdAsync(Guid id)
    {
        var customer = await _customerRepository.GetByIdAsync(id);
        return customer == null ? null : MapToDto(customer);
    }

    public async Task<IEnumerable<CustomerDto>> GetAllCustomersAsync(int limit, int offset)
    {
        var customers = await _customerRepository.GetAllAsync(limit, offset);
        return customers.Select(MapToDto);
    }

    public async Task<CustomerDto> CreateCustomerAsync(CreateCustomerRequest request)
    {
        // Check if customer already exists by phone or instagram (legacy lookup compatibility)
        if (!string.IsNullOrWhiteSpace(request.PhoneNumber) || !string.IsNullOrWhiteSpace(request.InstagramId))
        {
            var existing = await _customerRepository.GetByPhoneOrInstagramAsync(request.PhoneNumber, request.InstagramId);
            if (existing != null) return MapToDto(existing);
        }

        // Validate that no requested Instagram handles are already mapped to another customer
        if (request.InstagramAccounts != null)
        {
            foreach (var acc in request.InstagramAccounts)
            {
                var valid = await ValidateInstagramHandleAsync(acc.Username, null);
                if (!valid)
                {
                    throw new InvalidOperationException($"Instagram handle '{acc.Username}' is already mapped to another customer.");
                }
            }
        }

        // Always get next customer ID for tracking sequence
        var nextId = await _idGenerator.GetNextCustomerDummyIdAsync();

        string? primaryInstagramId = null;
        var instagramAccountsToSave = new List<CustomerInstagramAccountDto>();

        if (request.InstagramAccounts != null && request.InstagramAccounts.Any())
        {
            var primary = request.InstagramAccounts.FirstOrDefault(a => a.IsPrimary) ?? request.InstagramAccounts.First();
            primaryInstagramId = primary.Username;

            foreach (var acc in request.InstagramAccounts)
            {
                instagramAccountsToSave.Add(new CustomerInstagramAccountDto(
                    acc.Id == Guid.Empty ? Guid.NewGuid() : acc.Id,
                    acc.Username,
                    acc.FullName,
                    acc.ProfilePictureUrl,
                    acc.Username.Equals(primaryInstagramId, StringComparison.OrdinalIgnoreCase)
                ));
            }
        }
        else if (!string.IsNullOrWhiteSpace(request.InstagramId))
        {
            primaryInstagramId = request.InstagramId;
            instagramAccountsToSave.Add(new CustomerInstagramAccountDto(
                Guid.NewGuid(),
                request.InstagramId,
                null,
                null,
                true
            ));
        }

        var customer = new Customer
        {
            Id = Guid.NewGuid(),
            CustomerId = (int)nextId,
            FirstName = request.FirstName,
            LastName = request.LastName,
            PhoneNumber = request.PhoneNumber,
            InstagramId = primaryInstagramId,
            Email = request.Email,
            Notes = request.Notes,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        // Dummy name logic: until we give a name to the customer we assign them a dummy name 
        // like cust{indexnumber/id} as their last name.
        if (string.IsNullOrWhiteSpace(customer.FirstName) && string.IsNullOrWhiteSpace(customer.LastName))
        {
            customer.LastName = $"cust{nextId}";
        }

        await _customerRepository.CreateAsync(customer);

        // Save new relationships
        await _customerRepository.SaveInstagramAccountsAsync(customer.Id, instagramAccountsToSave);

        if (request.PreferredLanguages != null)
        {
            await _customerRepository.SavePreferredLanguagesAsync(customer.Id, request.PreferredLanguages);
        }
        else
        {
            // Default to English locale 'en-in' if none was selected
            await _customerRepository.SavePreferredLanguagesAsync(customer.Id, new List<string> { "en-in" });
        }

        return (await GetCustomerByIdAsync(customer.Id))!;
    }

    public async Task<bool> UpdateCustomerAsync(Guid id, CreateCustomerRequest request)
    {
        var customer = await _customerRepository.GetByIdAsync(id);
        if (customer == null) return false;

        // Validate that no requested Instagram handles are already mapped to another customer
        if (request.InstagramAccounts != null)
        {
            foreach (var acc in request.InstagramAccounts)
            {
                var valid = await ValidateInstagramHandleAsync(acc.Username, id);
                if (!valid)
                {
                    throw new InvalidOperationException($"Instagram handle '{acc.Username}' is already mapped to another customer.");
                }
            }
        }

        string? primaryInstagramId = null;
        var instagramAccountsToSave = new List<CustomerInstagramAccountDto>();

        if (request.InstagramAccounts != null && request.InstagramAccounts.Any())
        {
            var primary = request.InstagramAccounts.FirstOrDefault(a => a.IsPrimary) ?? request.InstagramAccounts.First();
            primaryInstagramId = primary.Username;

            foreach (var acc in request.InstagramAccounts)
            {
                instagramAccountsToSave.Add(new CustomerInstagramAccountDto(
                    acc.Id == Guid.Empty ? Guid.NewGuid() : acc.Id,
                    acc.Username,
                    acc.FullName,
                    acc.ProfilePictureUrl,
                    acc.Username.Equals(primaryInstagramId, StringComparison.OrdinalIgnoreCase)
                ));
            }
        }
        else if (!string.IsNullOrWhiteSpace(request.InstagramId))
        {
            primaryInstagramId = request.InstagramId;
            instagramAccountsToSave.Add(new CustomerInstagramAccountDto(
                Guid.NewGuid(),
                request.InstagramId,
                null,
                null,
                true
            ));
        }

        customer.FirstName = request.FirstName;
        customer.LastName = request.LastName;
        customer.PhoneNumber = request.PhoneNumber;
        customer.InstagramId = primaryInstagramId;
        customer.Email = request.Email;
        customer.Notes = request.Notes;
        customer.UpdatedAt = DateTime.UtcNow;

        var success = await _customerRepository.UpdateAsync(customer);
        if (success)
        {
            await _customerRepository.SaveInstagramAccountsAsync(customer.Id, instagramAccountsToSave);
            
            if (request.PreferredLanguages != null)
            {
                await _customerRepository.SavePreferredLanguagesAsync(customer.Id, request.PreferredLanguages);
            }
        }

        return success;
    }

    public async Task<bool> DeleteCustomerAsync(Guid id)
    {
        return await _customerRepository.DeleteAsync(id);
    }

    public async Task<Guid> AddAddressAsync(Guid customerId, CreateAddressRequest request)
    {
        var address = new CustomerAddress
        {
            Id = Guid.NewGuid(),
            CustomerId = customerId,
            Name = request.Name,
            Phone = request.Phone,
            Line1 = request.Line1,
            Line2 = request.Line2,
            Pincode = request.Pincode,
            City = request.City,
            State = request.State,
            IsDefault = request.IsDefault,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        return await _customerRepository.AddAddressAsync(address);
    }

    public async Task<bool> UpdateAddressAsync(Guid addressId, CreateAddressRequest request)
    {
        var address = new CustomerAddress
        {
            Id = addressId,
            Name = request.Name,
            Phone = request.Phone,
            Line1 = request.Line1,
            Line2 = request.Line2,
            Pincode = request.Pincode,
            City = request.City,
            State = request.State,
            IsDefault = request.IsDefault,
            UpdatedAt = DateTime.UtcNow
        };

        return await _customerRepository.UpdateAddressAsync(address);
    }

    public async Task<bool> DeleteAddressAsync(Guid addressId)
    {
        return await _customerRepository.DeleteAddressAsync(addressId);
    }

    public async Task<bool> SetDefaultAddressAsync(Guid customerId, Guid addressId)
    {
        return await _customerRepository.SetDefaultAddressAsync(customerId, addressId);
    }

    public async Task<bool> ValidateInstagramHandleAsync(string username, Guid? currentCustomerId)
    {
        if (string.IsNullOrWhiteSpace(username)) return true;
        var existingCustomerId = await _customerRepository.GetCustomerIdByInstagramUsernameAsync(username);
        
        if (existingCustomerId.HasValue && existingCustomerId.Value != currentCustomerId)
        {
            return false;
        }
        return true;
    }

    public async Task<IEnumerable<LanguageDto>> GetPreferredLanguagesMasterAsync()
    {
        return await _customerRepository.GetPreferredLanguagesMasterAsync();
    }

    private static CustomerDto MapToDto(Customer customer)
    {
        return new CustomerDto(
            customer.Id,
            customer.CustomerId,
            customer.FirstName,
            customer.LastName,
            customer.PhoneNumber,
            customer.InstagramId,
            customer.Email,
            customer.Notes,
            customer.ReferralCode,
            customer.CreatedAt,
            customer.Addresses?.Select(a => new CustomerAddressDto(
                a.Id,
                a.CustomerId,
                a.Name,
                a.Phone,
                a.Line1,
                a.Line2,
                a.Pincode,
                a.City,
                a.State,
                a.IsDefault
            )).ToList() ?? new List<CustomerAddressDto>(),
            customer.InstagramAccounts?.Select(i => new CustomerInstagramAccountDto(
                i.Id,
                i.Username,
                i.FullName,
                i.ProfilePictureUrl,
                i.IsPrimary
            )).ToList() ?? new List<CustomerInstagramAccountDto>(),
            customer.PreferredLanguages ?? new List<string>()
        );
    }
}

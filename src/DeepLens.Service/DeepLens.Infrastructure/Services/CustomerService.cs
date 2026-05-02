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
        // Check if customer already exists by phone or instagram
        if (!string.IsNullOrWhiteSpace(request.PhoneNumber) || !string.IsNullOrWhiteSpace(request.InstagramId))
        {
            var existing = await _customerRepository.GetByPhoneOrInstagramAsync(request.PhoneNumber, request.InstagramId);
            if (existing != null) return MapToDto(existing);
        }

        // Always get next customer ID for tracking sequence
        var nextId = await _idGenerator.GetNextCustomerDummyIdAsync();

        var customer = new Customer
        {
            Id = Guid.NewGuid(),
            CustomerId = (int)nextId,
            FirstName = request.FirstName,
            LastName = request.LastName,
            PhoneNumber = request.PhoneNumber,
            InstagramId = request.InstagramId,
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
        return MapToDto(customer);
    }

    public async Task<bool> UpdateCustomerAsync(Guid id, CreateCustomerRequest request)
    {
        var customer = await _customerRepository.GetByIdAsync(id);
        if (customer == null) return false;

        customer.FirstName = request.FirstName;
        customer.LastName = request.LastName;
        customer.PhoneNumber = request.PhoneNumber;
        customer.InstagramId = request.InstagramId;
        customer.Email = request.Email;
        customer.Notes = request.Notes;
        customer.UpdatedAt = DateTime.UtcNow;

        return await _customerRepository.UpdateAsync(customer);
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
            )).ToList() ?? new List<CustomerAddressDto>()
        );
    }
}

using System;
using System.Collections.Generic;

namespace DeepLens.Contracts.Customers;

public record CustomerDto(
    Guid Id,
    int CustomerId,
    string? FirstName,
    string? LastName,
    string? PhoneNumber,
    string? InstagramId,
    string? Email,
    string? Notes,
    DateTime CreatedAt,
    List<CustomerAddressDto> Addresses
);

public record CustomerAddressDto(
    Guid Id,
    Guid CustomerId,
    string Name,
    string Phone,
    string Line1,
    string? Line2,
    string Pincode,
    string? City,
    string? State,
    bool IsDefault
);

public record CreateCustomerRequest(
    string? FirstName,
    string? LastName,
    string? PhoneNumber,
    string? InstagramId,
    string? Email,
    string? Notes
);

public record CreateAddressRequest(
    string Name,
    string Phone,
    string Line1,
    string? Line2,
    string Pincode,
    string? City,
    string? State,
    bool IsDefault
);

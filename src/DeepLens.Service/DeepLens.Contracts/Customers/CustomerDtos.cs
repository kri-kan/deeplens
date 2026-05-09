using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace DeepLens.Contracts.Customers;

public record CustomerDto(
    [property: JsonPropertyName("id")] Guid Id,
    [property: JsonPropertyName("customerId")] int CustomerId,
    [property: JsonPropertyName("firstName")] string? FirstName,
    [property: JsonPropertyName("lastName")] string? LastName,
    [property: JsonPropertyName("phoneNumber")] string? PhoneNumber,
    [property: JsonPropertyName("instagramId")] string? InstagramId,
    [property: JsonPropertyName("email")] string? Email,
    [property: JsonPropertyName("notes")] string? Notes,
    [property: JsonPropertyName("createdAt")] DateTime CreatedAt,
    [property: JsonPropertyName("addresses")] List<CustomerAddressDto> Addresses
);

public record CustomerAddressDto(
    [property: JsonPropertyName("id")] Guid Id,
    [property: JsonPropertyName("customerId")] Guid CustomerId,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("phone")] string Phone,
    [property: JsonPropertyName("line1")] string Line1,
    [property: JsonPropertyName("line2")] string? Line2,
    [property: JsonPropertyName("pincode")] string Pincode,
    [property: JsonPropertyName("city")] string? City,
    [property: JsonPropertyName("state")] string? State,
    [property: JsonPropertyName("isDefault")] bool IsDefault
);

public record CreateCustomerRequest(
    [property: JsonPropertyName("firstName")] string? FirstName,
    [property: JsonPropertyName("lastName")] string? LastName,
    [property: JsonPropertyName("phoneNumber")] string? PhoneNumber,
    [property: JsonPropertyName("instagramId")] string? InstagramId,
    [property: JsonPropertyName("email")] string? Email,
    [property: JsonPropertyName("notes")] string? Notes
);

public record CreateAddressRequest(
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("phone")] string Phone,
    [property: JsonPropertyName("line1")] string Line1,
    [property: JsonPropertyName("line2")] string? Line2,
    [property: JsonPropertyName("pincode")] string Pincode,
    [property: JsonPropertyName("city")] string? City,
    [property: JsonPropertyName("state")] string? State,
    [property: JsonPropertyName("isDefault")] bool IsDefault
);

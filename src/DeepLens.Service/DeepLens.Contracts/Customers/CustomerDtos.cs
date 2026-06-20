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
    [property: JsonPropertyName("gender")] string? Gender,
    [property: JsonPropertyName("referralCode")] string ReferralCode,
    [property: JsonPropertyName("createdAt")] DateTime CreatedAt,
    [property: JsonPropertyName("addresses")] List<CustomerAddressDto> Addresses,
    [property: JsonPropertyName("instagramAccounts")] List<CustomerInstagramAccountDto> InstagramAccounts,
    [property: JsonPropertyName("preferredLanguages")] List<string> PreferredLanguages,
    [property: JsonPropertyName("orderCount")] int OrderCount,
    [property: JsonPropertyName("enquiryCount")] int EnquiryCount,
    [property: JsonPropertyName("isFollower")] bool IsFollower
);

public record CustomerListResponse
{
    [JsonPropertyName("customers")]
    public required List<CustomerDto> Customers { get; init; }
    [JsonPropertyName("totalCount")]
    public int TotalCount { get; init; }
    [JsonPropertyName("page")]
    public int Page { get; init; }
    [JsonPropertyName("pageSize")]
    public int PageSize { get; init; }
    [JsonPropertyName("totalPages")]
    public int TotalPages { get; init; }
}

public record CustomerInstagramAccountDto(
    [property: JsonPropertyName("id")] Guid Id,
    [property: JsonPropertyName("username")] string Username,
    [property: JsonPropertyName("fullName")] string? FullName,
    [property: JsonPropertyName("profilePictureUrl")] string? ProfilePictureUrl,
    [property: JsonPropertyName("isPrimary")] bool IsPrimary,
    [property: JsonPropertyName("isFollower")] bool IsFollower = false,
    [property: JsonPropertyName("followedAt")] DateTime? FollowedAt = null
);

public record LanguageDto(
    [property: JsonPropertyName("code")] string Code,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("isDefault")] bool IsDefault
);

public record CustomerAddressDto(
    [property: JsonPropertyName("id")] Guid Id,
    [property: JsonPropertyName("customerId")] Guid CustomerId,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("phone")] string Phone,
    [property: JsonPropertyName("line1")] string Line1,
    [property: JsonPropertyName("pincode")] string Pincode,
    [property: JsonPropertyName("isDefault")] bool IsDefault
);

public record CreateCustomerRequest(
    [property: JsonPropertyName("firstName")] string? FirstName,
    [property: JsonPropertyName("lastName")] string? LastName,
    [property: JsonPropertyName("phoneNumber")] string? PhoneNumber,
    [property: JsonPropertyName("instagramId")] string? InstagramId,
    [property: JsonPropertyName("email")] string? Email,
    [property: JsonPropertyName("notes")] string? Notes,
    [property: JsonPropertyName("gender")] string? Gender,
    [property: JsonPropertyName("instagramAccounts")] List<CustomerInstagramAccountDto>? InstagramAccounts,
    [property: JsonPropertyName("preferredLanguages")] List<string>? PreferredLanguages,
    [property: JsonPropertyName("addresses")] List<CreateAddressRequest>? Addresses
);

public record CreateAddressRequest(
    [property: JsonPropertyName("id")] Guid? Id,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("phone")] string Phone,
    [property: JsonPropertyName("line1")] string Line1,
    [property: JsonPropertyName("pincode")] string Pincode,
    [property: JsonPropertyName("isDefault")] bool IsDefault
);

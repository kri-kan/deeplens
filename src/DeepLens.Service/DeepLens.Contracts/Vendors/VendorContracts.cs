using System.Text.Json.Serialization;

namespace DeepLens.Contracts.Vendors;

/// <summary>
/// Request to create a new vendor/manufacturer
/// </summary>
public record CreateVendorRequest
{
    [JsonPropertyName("vendorName")]
    public required string VendorName { get; init; }
    [JsonPropertyName("vendorCode")]
    public string? VendorCode { get; init; }
    [JsonPropertyName("address")]
    public string? Address { get; init; }
    [JsonPropertyName("city")]
    public string? City { get; init; }
    [JsonPropertyName("state")]
    public string? State { get; init; }
    [JsonPropertyName("country")]
    public string? Country { get; init; }
    [JsonPropertyName("postalCode")]
    public string? PostalCode { get; init; }
    [JsonPropertyName("email")]
    public string? Email { get; init; }
    [JsonPropertyName("website")]
    public string? Website { get; init; }
    [JsonPropertyName("notes")]
    public string? Notes { get; init; }
    [JsonPropertyName("contacts")]
    public List<VendorContactRequest>? Contacts { get; init; }
}

/// <summary>
/// Request to update an existing vendor
/// </summary>
public record UpdateVendorRequest
{
    [JsonPropertyName("vendorName")]
    public string? VendorName { get; init; }
    [JsonPropertyName("vendorCode")]
    public string? VendorCode { get; init; }
    [JsonPropertyName("address")]
    public string? Address { get; init; }
    [JsonPropertyName("city")]
    public string? City { get; init; }
    [JsonPropertyName("state")]
    public string? State { get; init; }
    [JsonPropertyName("country")]
    public string? Country { get; init; }
    [JsonPropertyName("postalCode")]
    public string? PostalCode { get; init; }
    [JsonPropertyName("email")]
    public string? Email { get; init; }
    [JsonPropertyName("website")]
    public string? Website { get; init; }
    [JsonPropertyName("notes")]
    public string? Notes { get; init; }
    [JsonPropertyName("isActive")]
    public bool? IsActive { get; init; }
}

/// <summary>
/// Contact person for a vendor
/// </summary>
public record VendorContactRequest
{
    [JsonPropertyName("contactName")]
    public required string ContactName { get; init; }
    [JsonPropertyName("contactRole")]
    public string? ContactRole { get; init; }
    [JsonPropertyName("phoneNumber")]
    public string? PhoneNumber { get; init; }
    [JsonPropertyName("alternatePhone")]
    public string? AlternatePhone { get; init; }
    [JsonPropertyName("email")]
    public string? Email { get; init; }
    [JsonPropertyName("isPrimary")]
    public bool IsPrimary { get; init; }
}

/// <summary>
/// Vendor response DTO
/// </summary>
public record VendorResponse
{
    [JsonPropertyName("id")]
    public Guid Id { get; init; }
    [JsonPropertyName("tenantId")]
    public Guid TenantId { get; init; }
    [JsonPropertyName("vendorName")]
    public required string VendorName { get; init; }
    [JsonPropertyName("vendorCode")]
    public string? VendorCode { get; init; }
    [JsonPropertyName("address")]
    public string? Address { get; init; }
    [JsonPropertyName("city")]
    public string? City { get; init; }
    [JsonPropertyName("state")]
    public string? State { get; init; }
    [JsonPropertyName("country")]
    public string? Country { get; init; }
    [JsonPropertyName("postalCode")]
    public string? PostalCode { get; init; }
    [JsonPropertyName("email")]
    public string? Email { get; init; }
    [JsonPropertyName("website")]
    public string? Website { get; init; }
    [JsonPropertyName("notes")]
    public string? Notes { get; init; }
    [JsonPropertyName("isActive")]
    public bool IsActive { get; init; }
    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; init; }
    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; init; }
    [JsonPropertyName("contacts")]
    public List<VendorContactResponse>? Contacts { get; init; }
}

/// <summary>
/// Vendor contact response DTO
/// </summary>
public record VendorContactResponse
{
    [JsonPropertyName("id")]
    public Guid Id { get; init; }
    [JsonPropertyName("vendorId")]
    public Guid VendorId { get; init; }
    [JsonPropertyName("contactName")]
    public required string ContactName { get; init; }
    [JsonPropertyName("contactRole")]
    public string? ContactRole { get; init; }
    [JsonPropertyName("phoneNumber")]
    public string? PhoneNumber { get; init; }
    [JsonPropertyName("alternatePhone")]
    public string? AlternatePhone { get; init; }
    [JsonPropertyName("email")]
    public string? Email { get; init; }
    [JsonPropertyName("isPrimary")]
    public bool IsPrimary { get; init; }
    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; init; }
}

/// <summary>
/// Paginated list of vendors
/// </summary>
public record VendorListResponse
{
    [JsonPropertyName("vendors")]
    public required List<VendorResponse> Vendors { get; init; }
    [JsonPropertyName("totalCount")]
    public int TotalCount { get; init; }
    [JsonPropertyName("page")]
    public int Page { get; init; }
    [JsonPropertyName("pageSize")]
    public int PageSize { get; init; }
    [JsonPropertyName("totalPages")]
    public int TotalPages { get; init; }
}

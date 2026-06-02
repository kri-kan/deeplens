using System.ComponentModel.DataAnnotations;
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
    [Required]
    [StringLength(8, MinimumLength = 3, ErrorMessage = "Vendor Code must be between 3 and 8 characters")]
    public required string VendorCode { get; init; }
    
    [JsonPropertyName("firstName")]
    public string? FirstName { get; init; }
    
    [JsonPropertyName("lastName")]
    public string? LastName { get; init; }
    
    [JsonPropertyName("whatsappPrimary")]
    public string? WhatsappPrimary { get; init; }
    
    [JsonPropertyName("whatsappSecondary")]
    public string? WhatsappSecondary { get; init; }
    
    [JsonPropertyName("orderGroupLink")]
    public string? OrderGroupLink { get; init; }
    

    [JsonPropertyName("email")]
    public string? Email { get; init; }
    [JsonPropertyName("website")]
    public string? Website { get; init; }
    [JsonPropertyName("notes")]
    public string? Notes { get; init; }
}

/// <summary>
/// Request to update an existing vendor
/// </summary>
public record UpdateVendorRequest
{
    [JsonPropertyName("vendorName")]
    public string? VendorName { get; init; }
    
    [JsonPropertyName("vendorCode")]
    [StringLength(8, MinimumLength = 3, ErrorMessage = "Vendor Code must be between 3 and 8 characters")]
    public string? VendorCode { get; init; }
    
    [JsonPropertyName("firstName")]
    public string? FirstName { get; init; }
    
    [JsonPropertyName("lastName")]
    public string? LastName { get; init; }
    
    [JsonPropertyName("whatsappPrimary")]
    public string? WhatsappPrimary { get; init; }
    
    [JsonPropertyName("whatsappSecondary")]
    public string? WhatsappSecondary { get; init; }
    
    [JsonPropertyName("orderGroupLink")]
    public string? OrderGroupLink { get; init; }
    

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
    [JsonPropertyName("firstName")]
    public string? FirstName { get; init; }
    [JsonPropertyName("lastName")]
    public string? LastName { get; init; }
    [JsonPropertyName("whatsappPrimary")]
    public string? WhatsappPrimary { get; init; }
    [JsonPropertyName("whatsappSecondary")]
    public string? WhatsappSecondary { get; init; }
    [JsonPropertyName("orderGroupLink")]
    public string? OrderGroupLink { get; init; }

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

/// <summary>
/// Request to add or update a vendor address
/// </summary>
public record VendorAddressRequest
{
    [JsonPropertyName("name")]
    public required string Name { get; init; }
    
    [JsonPropertyName("phone")]
    public required string Phone { get; init; }
    
    [JsonPropertyName("line1")]
    public required string Line1 { get; init; }
    
    [JsonPropertyName("line2")]
    public string? Line2 { get; init; }
    
    [JsonPropertyName("pincode")]
    public required string Pincode { get; init; }
    
    [JsonPropertyName("city")]
    public string? City { get; init; }
    
    [JsonPropertyName("state")]
    public string? State { get; init; }
    
    [JsonPropertyName("isDefault")]
    public bool IsDefault { get; init; }
}

/// <summary>
/// Response DTO for a vendor address
/// </summary>
public record VendorAddressResponse
{
    [JsonPropertyName("id")]
    public Guid Id { get; init; }
    
    [JsonPropertyName("vendorId")]
    public Guid VendorId { get; init; }
    
    [JsonPropertyName("name")]
    public required string Name { get; init; }
    
    [JsonPropertyName("phone")]
    public required string Phone { get; init; }
    
    [JsonPropertyName("line1")]
    public required string Line1 { get; init; }
    
    [JsonPropertyName("line2")]
    public string? Line2 { get; init; }
    
    [JsonPropertyName("pincode")]
    public required string Pincode { get; init; }
    
    [JsonPropertyName("city")]
    public string? City { get; init; }
    
    [JsonPropertyName("state")]
    public string? State { get; init; }
    
    [JsonPropertyName("isDefault")]
    public bool IsDefault { get; init; }
    
    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; init; }
    
    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; init; }
}


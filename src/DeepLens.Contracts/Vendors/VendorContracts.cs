namespace DeepLens.Contracts.Vendors;

/// <summary>
/// Request to create a new vendor/manufacturer
/// </summary>
public record CreateVendorRequest
{
    public required string VendorName { get; init; }
    public string? VendorCode { get; init; }
    public string? Address { get; init; }
    public string? City { get; init; }
    public string? State { get; init; }
    public string? Country { get; init; }
    public string? PostalCode { get; init; }
    public string? Email { get; init; }
    public string? Website { get; init; }
    public string? Notes { get; init; }
    public List<VendorContactRequest>? Contacts { get; init; }
}

/// <summary>
/// Request to update an existing vendor
/// </summary>
public record UpdateVendorRequest
{
    public string? VendorName { get; init; }
    public string? VendorCode { get; init; }
    public string? Address { get; init; }
    public string? City { get; init; }
    public string? State { get; init; }
    public string? Country { get; init; }
    public string? PostalCode { get; init; }
    public string? Email { get; init; }
    public string? Website { get; init; }
    public string? Notes { get; init; }
    public bool? IsActive { get; init; }
}

/// <summary>
/// Contact person for a vendor
/// </summary>
public record VendorContactRequest
{
    public required string ContactName { get; init; }
    public string? ContactRole { get; init; }
    public string? PhoneNumber { get; init; }
    public string? AlternatePhone { get; init; }
    public string? Email { get; init; }
    public bool IsPrimary { get; init; }
}

/// <summary>
/// Vendor response DTO
/// </summary>
public record VendorResponse
{
    public Guid Id { get; init; }
    public Guid TenantId { get; init; }
    public required string VendorName { get; init; }
    public string? VendorCode { get; init; }
    public string? Address { get; init; }
    public string? City { get; init; }
    public string? State { get; init; }
    public string? Country { get; init; }
    public string? PostalCode { get; init; }
    public string? Email { get; init; }
    public string? Website { get; init; }
    public string? Notes { get; init; }
    public bool IsActive { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
    public List<VendorContactResponse>? Contacts { get; init; }
}

/// <summary>
/// Vendor contact response DTO
/// </summary>
public record VendorContactResponse
{
    public Guid Id { get; init; }
    public Guid VendorId { get; init; }
    public required string ContactName { get; init; }
    public string? ContactRole { get; init; }
    public string? PhoneNumber { get; init; }
    public string? AlternatePhone { get; init; }
    public string? Email { get; init; }
    public bool IsPrimary { get; init; }
    public DateTime CreatedAt { get; init; }
}

/// <summary>
/// Paginated list of vendors
/// </summary>
public record VendorListResponse
{
    public required List<VendorResponse> Vendors { get; init; }
    public int TotalCount { get; init; }
    public int Page { get; init; }
    public int PageSize { get; init; }
    public int TotalPages { get; init; }
}

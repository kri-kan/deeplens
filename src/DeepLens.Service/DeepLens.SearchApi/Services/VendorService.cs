using Dapper;
using DeepLens.Contracts.Vendors;
using Npgsql;

namespace DeepLens.SearchApi.Services;

public class VendorService : IVendorService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<VendorService> _logger;

    public VendorService(IConfiguration configuration, ILogger<VendorService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    private async Task<NpgsqlConnection> GetConnectionAsync(Guid tenantId)
    {
        var connString = _configuration.GetConnectionString($"Tenant_{tenantId}") 
                      ?? _configuration.GetConnectionString("DefaultTenant")
                      ?? throw new InvalidOperationException("No database connection configured");
        
        var conn = new NpgsqlConnection(connString);
        await conn.OpenAsync();
        return conn;
    }

    public async Task<VendorResponse> CreateVendorAsync(Guid tenantId, CreateVendorRequest request)
    {
        using var conn = await GetConnectionAsync(tenantId);
        using var transaction = await conn.BeginTransactionAsync();

        try
        {
            // Insert Vendor
            var VendorId = await conn.QuerySingleAsync<Guid>(
                @"INSERT INTO Vendors (tenant_id, Vendor_name, Vendor_code, address, city, state, country, postal_code, email, website, notes)
                  VALUES (@TenantId, @VendorName, @VendorCode, @Address, @City, @State, @Country, @PostalCode, @Email, @Website, @Notes)
                  RETURNING id",
                new
                {
                    TenantId = tenantId,
                    request.VendorName,
                    request.VendorCode,
                    request.Address,
                    request.City,
                    request.State,
                    Country = request.Country ?? "India",
                    request.PostalCode,
                    request.Email,
                    request.Website,
                    request.Notes
                },
                transaction
            );

            // Insert contacts if provided
            if (request.Contacts != null && request.Contacts.Any())
            {
                foreach (var contact in request.Contacts)
                {
                    await conn.ExecuteAsync(
                        @"INSERT INTO Vendor_contacts (Vendor_id, contact_name, contact_role, phone_number, alternate_phone, email, is_primary)
                          VALUES (@VendorId, @ContactName, @ContactRole, @PhoneNumber, @AlternatePhone, @Email, @IsPrimary)",
                        new
                        {
                            VendorId = VendorId,
                            contact.ContactName,
                            contact.ContactRole,
                            contact.PhoneNumber,
                            contact.AlternatePhone,
                            contact.Email,
                            contact.IsPrimary
                        },
                        transaction
                    );
                }
            }

            await transaction.CommitAsync();

            _logger.LogInformation("Created Vendor {VendorId} for tenant {TenantId}", VendorId, tenantId);

            // Return the created Vendor
            return await GetVendorByIdAsync(tenantId, VendorId) 
                ?? throw new InvalidOperationException("Failed to retrieve created Vendor");
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<VendorResponse?> GetVendorByIdAsync(Guid tenantId, Guid VendorId)
    {
        using var conn = await GetConnectionAsync(tenantId);

        var Vendor = await conn.QuerySingleOrDefaultAsync<VendorResponse>(
            @"SELECT id, tenant_id, Vendor_name, Vendor_code, address, city, state, country, postal_code, 
                     email, website, notes, is_active, created_at, updated_at
              FROM Vendors
              WHERE tenant_id = @TenantId AND id = @VendorId",
            new { TenantId = tenantId, VendorId = VendorId }
        );

        if (Vendor == null) return null;

        // Load contacts
        var contacts = await conn.QueryAsync<VendorContactResponse>(
            @"SELECT id, Vendor_id, contact_name, contact_role, phone_number, alternate_phone, email, is_primary, created_at
              FROM Vendor_contacts
              WHERE Vendor_id = @VendorId
              ORDER BY is_primary DESC, contact_name",
            new { VendorId = VendorId }
        );

        return Vendor with { Contacts = contacts.ToList() };
    }

    public async Task<VendorListResponse> ListVendorsAsync(Guid tenantId, int page, int pageSize, bool? activeOnly)
    {
        using var conn = await GetConnectionAsync(tenantId);

        var offset = (page - 1) * pageSize;
        var whereClause = activeOnly == true ? "AND is_active = TRUE" : "";

        // Get total count
        var totalCount = await conn.QuerySingleAsync<int>(
            $@"SELECT COUNT(*) FROM Vendors WHERE tenant_id = @TenantId {whereClause}",
            new { TenantId = tenantId }
        );

        // Get Vendors
        var Vendors = await conn.QueryAsync<VendorResponse>(
            $@"SELECT id, tenant_id, Vendor_name, Vendor_code, address, city, state, country, postal_code, 
                      email, website, notes, is_active, created_at, updated_at
               FROM Vendors
               WHERE tenant_id = @TenantId {whereClause}
               ORDER BY Vendor_name
               LIMIT @PageSize OFFSET @Offset",
            new { TenantId = tenantId, PageSize = pageSize, Offset = offset }
        );

        // Load contacts for each Vendor
        var VendorsList = new List<VendorResponse>();
        foreach (var Vendor in Vendors)
        {
            var contacts = await conn.QueryAsync<VendorContactResponse>(
                @"SELECT id, Vendor_id, contact_name, contact_role, phone_number, alternate_phone, email, is_primary, created_at
                  FROM Vendor_contacts
                  WHERE Vendor_id = @VendorId
                  ORDER BY is_primary DESC, contact_name",
                new { VendorId = Vendor.Id }
            );

            VendorsList.Add(Vendor with { Contacts = contacts.ToList() });
        }

        return new VendorListResponse
        {
            Vendors = VendorsList,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
            TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
        };
    }

    public async Task<VendorResponse> UpdateVendorAsync(Guid tenantId, Guid VendorId, UpdateVendorRequest request)
    {
        using var conn = await GetConnectionAsync(tenantId);

        var updates = new List<string>();
        var parameters = new DynamicParameters();
        parameters.Add("TenantId", tenantId);
        parameters.Add("VendorId", VendorId);

        if (request.VendorName != null) { updates.Add("Vendor_name = @VendorName"); parameters.Add("VendorName", request.VendorName); }
        if (request.VendorCode != null) { updates.Add("Vendor_code = @VendorCode"); parameters.Add("VendorCode", request.VendorCode); }
        if (request.Address != null) { updates.Add("address = @Address"); parameters.Add("Address", request.Address); }
        if (request.City != null) { updates.Add("city = @City"); parameters.Add("City", request.City); }
        if (request.State != null) { updates.Add("state = @State"); parameters.Add("State", request.State); }
        if (request.Country != null) { updates.Add("country = @Country"); parameters.Add("Country", request.Country); }
        if (request.PostalCode != null) { updates.Add("postal_code = @PostalCode"); parameters.Add("PostalCode", request.PostalCode); }
        if (request.Email != null) { updates.Add("email = @Email"); parameters.Add("Email", request.Email); }
        if (request.Website != null) { updates.Add("website = @Website"); parameters.Add("Website", request.Website); }
        if (request.Notes != null) { updates.Add("notes = @Notes"); parameters.Add("Notes", request.Notes); }
        if (request.IsActive.HasValue) { updates.Add("is_active = @IsActive"); parameters.Add("IsActive", request.IsActive.Value); }

        if (!updates.Any())
            throw new InvalidOperationException("No fields to update");

        updates.Add("updated_at = NOW()");

        await conn.ExecuteAsync(
            $@"UPDATE Vendors SET {string.Join(", ", updates)}
               WHERE tenant_id = @TenantId AND id = @VendorId",
            parameters
        );

        _logger.LogInformation("Updated Vendor {VendorId} for tenant {TenantId}", VendorId, tenantId);

        return await GetVendorByIdAsync(tenantId, VendorId)
            ?? throw new InvalidOperationException("Vendor not found after update");
    }

    public async Task<bool> DeleteVendorAsync(Guid tenantId, Guid VendorId)
    {
        using var conn = await GetConnectionAsync(tenantId);

        var rowsAffected = await conn.ExecuteAsync(
            "DELETE FROM Vendors WHERE tenant_id = @TenantId AND id = @VendorId",
            new { TenantId = tenantId, VendorId = VendorId }
        );

        _logger.LogInformation("Deleted Vendor {VendorId} for tenant {TenantId}", VendorId, tenantId);

        return rowsAffected > 0;
    }

    public async Task<VendorContactResponse> AddContactAsync(Guid tenantId, Guid VendorId, VendorContactRequest request)
    {
        using var conn = await GetConnectionAsync(tenantId);

        // Verify Vendor exists and belongs to tenant
        var VendorExists = await conn.QuerySingleOrDefaultAsync<bool>(
            "SELECT EXISTS(SELECT 1 FROM Vendors WHERE tenant_id = @TenantId AND id = @VendorId)",
            new { TenantId = tenantId, VendorId = VendorId }
        );

        if (!VendorExists)
            throw new InvalidOperationException("Vendor not found");

        var contactId = await conn.QuerySingleAsync<Guid>(
            @"INSERT INTO Vendor_contacts (Vendor_id, contact_name, contact_role, phone_number, alternate_phone, email, is_primary)
              VALUES (@VendorId, @ContactName, @ContactRole, @PhoneNumber, @AlternatePhone, @Email, @IsPrimary)
              RETURNING id",
            new
            {
                VendorId = VendorId,
                request.ContactName,
                request.ContactRole,
                request.PhoneNumber,
                request.AlternatePhone,
                request.Email,
                request.IsPrimary
            }
        );

        return await conn.QuerySingleAsync<VendorContactResponse>(
            @"SELECT id, Vendor_id, contact_name, contact_role, phone_number, alternate_phone, email, is_primary, created_at
              FROM Vendor_contacts
              WHERE id = @ContactId",
            new { ContactId = contactId }
        );
    }

    public async Task<bool> RemoveContactAsync(Guid tenantId, Guid contactId)
    {
        using var conn = await GetConnectionAsync(tenantId);

        // Verify contact belongs to a Vendor in this tenant
        var rowsAffected = await conn.ExecuteAsync(
            @"DELETE FROM Vendor_contacts 
              WHERE id = @ContactId 
              AND Vendor_id IN (SELECT id FROM Vendors WHERE tenant_id = @TenantId)",
            new { TenantId = tenantId, ContactId = contactId }
        );

        return rowsAffected > 0;
    }
}

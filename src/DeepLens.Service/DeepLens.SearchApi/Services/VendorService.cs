using Dapper;
using DeepLens.Contracts.Vendors;
using Npgsql;

namespace DeepLens.SearchApi.Services;

public class VendorService : IVendorService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<VendorService> _logger;
    private readonly string _connectionString;

    public VendorService(IConfiguration configuration, ILogger<VendorService> logger)
    {
        _configuration = configuration;
        _logger = logger;
        _connectionString = _configuration.GetConnectionString("DefaultConnection") 
                         ?? throw new InvalidOperationException("DefaultConnection string not found");
    }

    private async Task<NpgsqlConnection> GetConnectionAsync()
    {
        var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();
        return conn;
    }

    public async Task<VendorResponse> CreateVendorAsync(CreateVendorRequest request)
    {
        using var conn = await GetConnectionAsync();
        using var transaction = await conn.BeginTransactionAsync();

        try
        {
            // Insert Vendor
            var vendorId = await conn.QuerySingleAsync<Guid>(
                @"INSERT INTO Vendors (vendor_name, vendor_code, address, city, state, country, postal_code, email, website, notes)
                  VALUES (@VendorName, @VendorCode, @Address, @City, @State, @Country, @PostalCode, @Email, @Website, @Notes)
                  RETURNING id",
                new
                {
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
                        @"INSERT INTO Vendor_contacts (vendor_id, contact_name, contact_role, phone_number, alternate_phone, email, is_primary)
                          VALUES (@VendorId, @ContactName, @ContactRole, @PhoneNumber, @AlternatePhone, @Email, @IsPrimary)",
                        new
                        {
                            VendorId = vendorId,
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
            _logger.LogInformation("Created Vendor {VendorId}", vendorId);

            return await GetVendorByIdAsync(vendorId) 
                ?? throw new InvalidOperationException("Failed to retrieve created Vendor");
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<VendorResponse?> GetVendorByIdAsync(Guid vendorId)
    {
        using var conn = await GetConnectionAsync();

        var vendor = await conn.QuerySingleOrDefaultAsync<VendorResponse>(
            @"SELECT id, vendor_name, vendor_code, address, city, state, country, postal_code, 
                     email, website, notes, is_active, created_at, updated_at
              FROM Vendors
              WHERE id = @VendorId",
            new { VendorId = vendorId }
        );

        if (vendor == null) return null;

        var contacts = await conn.QueryAsync<VendorContactResponse>(
            @"SELECT id, vendor_id, contact_name, contact_role, phone_number, alternate_phone, email, is_primary, created_at
              FROM Vendor_contacts
              WHERE vendor_id = @VendorId
              ORDER BY is_primary DESC, contact_name",
            new { VendorId = vendorId }
        );

        return vendor with { Contacts = contacts.ToList() };
    }

    public async Task<VendorListResponse> ListVendorsAsync(int page, int pageSize, bool? activeOnly)
    {
        using var conn = await GetConnectionAsync();

        var offset = (page - 1) * pageSize;
        var whereClause = activeOnly == true ? "WHERE is_active = TRUE" : "";

        var totalCount = await conn.QuerySingleAsync<int>(
            $@"SELECT COUNT(*) FROM Vendors {whereClause}");

        var vendors = await conn.QueryAsync<VendorResponse>(
            $@"SELECT id, vendor_name, vendor_code, address, city, state, country, postal_code, 
                      email, website, notes, is_active, created_at, updated_at
               FROM Vendors
               {whereClause}
               ORDER BY vendor_name
               LIMIT @PageSize OFFSET @Offset",
            new { PageSize = pageSize, Offset = offset }
        );

        var vendorsList = new List<VendorResponse>();
        foreach (var v in vendors)
        {
            var contacts = await conn.QueryAsync<VendorContactResponse>(
                @"SELECT id, vendor_id, contact_name, contact_role, phone_number, alternate_phone, email, is_primary, created_at
                  FROM Vendor_contacts
                  WHERE vendor_id = @VendorId
                  ORDER BY is_primary DESC, contact_name",
                new { VendorId = v.Id }
            );

            vendorsList.Add(v with { Contacts = contacts.ToList() });
        }

        return new VendorListResponse
        {
            Vendors = vendorsList,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
            TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
        };
    }

    public async Task<VendorResponse> UpdateVendorAsync(Guid vendorId, UpdateVendorRequest request)
    {
        using var conn = await GetConnectionAsync();

        var updates = new List<string>();
        var parameters = new DynamicParameters();
        parameters.Add("VendorId", vendorId);

        if (request.VendorName != null) { updates.Add("vendor_name = @VendorName"); parameters.Add("VendorName", request.VendorName); }
        if (request.VendorCode != null) { updates.Add("vendor_code = @VendorCode"); parameters.Add("VendorCode", request.VendorCode); }
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
               WHERE id = @VendorId",
            parameters
        );

        _logger.LogInformation("Updated Vendor {VendorId}", vendorId);

        return await GetVendorByIdAsync(vendorId)
            ?? throw new InvalidOperationException("Vendor not found after update");
    }

    public async Task<bool> DeleteVendorAsync(Guid vendorId)
    {
        using var conn = await GetConnectionAsync();

        var rowsAffected = await conn.ExecuteAsync(
            "DELETE FROM Vendors WHERE id = @VendorId",
            new { VendorId = vendorId }
        );

        _logger.LogInformation("Deleted Vendor {VendorId}", vendorId);
        return rowsAffected > 0;
    }

    public async Task<VendorContactResponse> AddContactAsync(Guid vendorId, VendorContactRequest request)
    {
        using var conn = await GetConnectionAsync();

        var vendorExists = await conn.QuerySingleOrDefaultAsync<bool>(
            "SELECT EXISTS(SELECT 1 FROM Vendors WHERE id = @VendorId)",
            new { VendorId = vendorId }
        );

        if (!vendorExists)
            throw new InvalidOperationException("Vendor not found");

        var contactId = await conn.QuerySingleAsync<Guid>(
            @"INSERT INTO Vendor_contacts (vendor_id, contact_name, contact_role, phone_number, alternate_phone, email, is_primary)
              VALUES (@VendorId, @ContactName, @ContactRole, @PhoneNumber, @AlternatePhone, @Email, @IsPrimary)
              RETURNING id",
            new
            {
                VendorId = vendorId,
                request.ContactName,
                request.ContactRole,
                request.PhoneNumber,
                request.AlternatePhone,
                request.Email,
                request.IsPrimary
            }
        );

        return await conn.QuerySingleAsync<VendorContactResponse>(
            @"SELECT id, vendor_id, contact_name, contact_role, phone_number, alternate_phone, email, is_primary, created_at
              FROM Vendor_contacts
              WHERE id = @ContactId",
            new { ContactId = contactId }
        );
    }

    public async Task<bool> RemoveContactAsync(Guid contactId)
    {
        using var conn = await GetConnectionAsync();

        var rowsAffected = await conn.ExecuteAsync(
            "DELETE FROM Vendor_contacts WHERE id = @ContactId",
            new { ContactId = contactId }
        );

        return rowsAffected > 0;
    }
}

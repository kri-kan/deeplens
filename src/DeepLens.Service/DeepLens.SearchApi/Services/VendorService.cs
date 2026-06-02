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
            var existingVendorCode = await conn.QuerySingleOrDefaultAsync<bool>(
                "SELECT EXISTS(SELECT 1 FROM Vendors WHERE vendor_code = @VendorCode)",
                new { request.VendorCode },
                transaction
            );

            if (existingVendorCode)
            {
                throw new InvalidOperationException($"Vendor Code '{request.VendorCode}' is already in use.");
            }

            // Insert Vendor
            var vendorId = await conn.QuerySingleAsync<Guid>(
                @"INSERT INTO Vendors (vendor_name, vendor_code, first_name, last_name, whatsapp_primary, whatsapp_secondary, order_group_link, email, website, notes)
                  VALUES (@VendorName, @VendorCode, @FirstName, @LastName, @WhatsappPrimary, @WhatsappSecondary, @OrderGroupLink, @Email, @Website, @Notes)
                  RETURNING id",
                new
                {
                    request.VendorName,
                    request.VendorCode,
                    request.FirstName,
                    request.LastName,
                    request.WhatsappPrimary,
                    request.WhatsappSecondary,
                    request.OrderGroupLink,
                    request.Email,
                    request.Website,
                    request.Notes
                },
                transaction
            );



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
            @"SELECT id, vendor_name as VendorName, vendor_code as VendorCode, first_name as FirstName, last_name as LastName, whatsapp_primary as WhatsappPrimary, whatsapp_secondary as WhatsappSecondary, order_group_link as OrderGroupLink, 
                     email, website, notes, is_active as IsActive, created_at as CreatedAt, updated_at as UpdatedAt
              FROM Vendors
              WHERE id = @VendorId",
            new { VendorId = vendorId }
        );

        return vendor;
    }

    public async Task<VendorListResponse> ListVendorsAsync(int page, int pageSize, bool? activeOnly)
    {
        using var conn = await GetConnectionAsync();

        var offset = (page - 1) * pageSize;
        var whereClause = activeOnly == true ? "WHERE is_active = TRUE" : "";

        var totalCount = await conn.QuerySingleAsync<int>(
            $@"SELECT COUNT(*) FROM Vendors {whereClause}");

        var vendors = await conn.QueryAsync<VendorResponse>(
            $@"SELECT id, vendor_name as VendorName, vendor_code as VendorCode, first_name as FirstName, last_name as LastName, whatsapp_primary as WhatsappPrimary, whatsapp_secondary as WhatsappSecondary, order_group_link as OrderGroupLink, 
                      email, website, notes, is_active as IsActive, created_at as CreatedAt, updated_at as UpdatedAt
               FROM Vendors
               {whereClause}
               ORDER BY vendor_name
               LIMIT @PageSize OFFSET @Offset",
            new { PageSize = pageSize, Offset = offset }
        );

        return new VendorListResponse
        {
            Vendors = vendors.ToList(),
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
        if (request.VendorCode != null)
        {
            var existingVendorCode = await conn.QuerySingleOrDefaultAsync<bool>(
                "SELECT EXISTS(SELECT 1 FROM Vendors WHERE vendor_code = @VendorCode AND id != @VendorId)",
                new { request.VendorCode, VendorId = vendorId }
            );

            if (existingVendorCode)
            {
                throw new InvalidOperationException($"Vendor Code '{request.VendorCode}' is already in use.");
            }
            updates.Add("vendor_code = @VendorCode"); parameters.Add("VendorCode", request.VendorCode);
        }

        if (request.FirstName != null) { updates.Add("first_name = @FirstName"); parameters.Add("FirstName", request.FirstName); }
        if (request.LastName != null) { updates.Add("last_name = @LastName"); parameters.Add("LastName", request.LastName); }
        if (request.WhatsappPrimary != null) { updates.Add("whatsapp_primary = @WhatsappPrimary"); parameters.Add("WhatsappPrimary", request.WhatsappPrimary); }
        if (request.WhatsappSecondary != null) { updates.Add("whatsapp_secondary = @WhatsappSecondary"); parameters.Add("WhatsappSecondary", request.WhatsappSecondary); }
        if (request.OrderGroupLink != null) { updates.Add("order_group_link = @OrderGroupLink"); parameters.Add("OrderGroupLink", request.OrderGroupLink); }

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

    public async Task<List<VendorAddressResponse>> GetVendorAddressesAsync(Guid vendorId)
    {
        using var conn = await GetConnectionAsync();

        var addresses = await conn.QueryAsync<VendorAddressResponse>(
            @"SELECT id, vendor_id as VendorId, name, phone, line1, line2, pincode, city, state, is_default as IsDefault, created_at as CreatedAt, updated_at as UpdatedAt
              FROM vendor_addresses
              WHERE vendor_id = @VendorId
              ORDER BY is_default DESC, created_at DESC",
            new { VendorId = vendorId }
        );

        return addresses.ToList();
    }

    public async Task<VendorAddressResponse> AddVendorAddressAsync(Guid vendorId, VendorAddressRequest request)
    {
        using var conn = await GetConnectionAsync();
        using var transaction = await conn.BeginTransactionAsync();

        try
        {
            if (request.IsDefault)
            {
                await conn.ExecuteAsync(
                    "UPDATE vendor_addresses SET is_default = false WHERE vendor_id = @VendorId",
                    new { VendorId = vendorId },
                    transaction
                );
            }
            else
            {
                var count = await conn.QuerySingleAsync<int>("SELECT COUNT(*) FROM vendor_addresses WHERE vendor_id = @VendorId", new { VendorId = vendorId }, transaction);
                if (count == 0)
                {
                    request = request with { IsDefault = true };
                }
            }

            var id = await conn.QuerySingleAsync<Guid>(
                @"INSERT INTO vendor_addresses (vendor_id, name, phone, line1, line2, pincode, city, state, is_default)
                  VALUES (@VendorId, @Name, @Phone, @Line1, @Line2, @Pincode, @City, @State, @IsDefault)
                  RETURNING id",
                new
                {
                    VendorId = vendorId,
                    request.Name,
                    request.Phone,
                    request.Line1,
                    request.Line2,
                    request.Pincode,
                    request.City,
                    request.State,
                    request.IsDefault
                },
                transaction
            );

            await transaction.CommitAsync();

            var added = await conn.QuerySingleAsync<VendorAddressResponse>(
                @"SELECT id, vendor_id as VendorId, name, phone, line1, line2, pincode, city, state, is_default as IsDefault, created_at as CreatedAt, updated_at as UpdatedAt
                  FROM vendor_addresses WHERE id = @Id",
                new { Id = id }
            );
            return added;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<VendorAddressResponse> UpdateVendorAddressAsync(Guid addressId, VendorAddressRequest request)
    {
        using var conn = await GetConnectionAsync();
        using var transaction = await conn.BeginTransactionAsync();

        try
        {
            var vendorId = await conn.QuerySingleOrDefaultAsync<Guid?>(
                "SELECT vendor_id FROM vendor_addresses WHERE id = @Id",
                new { Id = addressId },
                transaction
            );

            if (vendorId == null) throw new InvalidOperationException("Address not found");

            if (request.IsDefault)
            {
                await conn.ExecuteAsync(
                    "UPDATE vendor_addresses SET is_default = false WHERE vendor_id = @VendorId",
                    new { VendorId = vendorId },
                    transaction
                );
            }

            await conn.ExecuteAsync(
                @"UPDATE vendor_addresses 
                  SET name = @Name, phone = @Phone, line1 = @Line1, line2 = @Line2, pincode = @Pincode, 
                      city = @City, state = @State, is_default = @IsDefault, updated_at = NOW()
                  WHERE id = @Id",
                new
                {
                    Id = addressId,
                    request.Name,
                    request.Phone,
                    request.Line1,
                    request.Line2,
                    request.Pincode,
                    request.City,
                    request.State,
                    request.IsDefault
                },
                transaction
            );

            await transaction.CommitAsync();

            var updated = await conn.QuerySingleAsync<VendorAddressResponse>(
                @"SELECT id, vendor_id as VendorId, name, phone, line1, line2, pincode, city, state, is_default as IsDefault, created_at as CreatedAt, updated_at as UpdatedAt
                  FROM vendor_addresses WHERE id = @Id",
                new { Id = addressId }
            );
            return updated;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<bool> DeleteVendorAddressAsync(Guid addressId)
    {
        using var conn = await GetConnectionAsync();
        var rows = await conn.ExecuteAsync("DELETE FROM vendor_addresses WHERE id = @Id", new { Id = addressId });
        return rows > 0;
    }

    public async Task<bool> SetDefaultAddressAsync(Guid vendorId, Guid addressId)
    {
        using var conn = await GetConnectionAsync();
        using var transaction = await conn.BeginTransactionAsync();

        try
        {
            await conn.ExecuteAsync(
                "UPDATE vendor_addresses SET is_default = false WHERE vendor_id = @VendorId",
                new { VendorId = vendorId },
                transaction
            );
            
            var rows = await conn.ExecuteAsync(
                "UPDATE vendor_addresses SET is_default = true WHERE id = @Id AND vendor_id = @VendorId",
                new { Id = addressId, VendorId = vendorId },
                transaction
            );

            await transaction.CommitAsync();
            return rows > 0;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }
}

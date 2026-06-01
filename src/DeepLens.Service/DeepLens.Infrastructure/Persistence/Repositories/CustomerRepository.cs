using Dapper;
using DeepLens.Application.Abstractions.Data;
using DeepLens.Domain.Entities;

namespace DeepLens.Infrastructure.Persistence.Repositories;

public class CustomerRepository : ICustomerRepository
{
    private readonly IDbConnectionFactory _dbConnectionFactory;

    public CustomerRepository(IDbConnectionFactory dbConnectionFactory)
    {
        _dbConnectionFactory = dbConnectionFactory;
    }

    public async Task<Customer?> GetByIdAsync(Guid id)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        const string sql = @"
            SELECT * FROM customers WHERE id = @Id;
            SELECT * FROM customer_addresses WHERE customer_id = @Id;
            SELECT id, customer_id as CustomerId, username, full_name as FullName, profile_picture_url as ProfilePictureUrl, is_primary as IsPrimary 
            FROM instagram_accounts 
            WHERE customer_id = @Id;
            SELECT language_code 
            FROM customer_languages 
            WHERE customer_id = @Id;";

        using var multi = await connection.QueryMultipleAsync(sql, new { Id = id });
        var customer = await multi.ReadFirstOrDefaultAsync<Customer>();
        if (customer != null)
        {
            customer.Addresses = (await multi.ReadAsync<CustomerAddress>()).AsList();
            customer.InstagramAccounts = (await multi.ReadAsync<CustomerInstagramAccount>()).AsList();
            customer.PreferredLanguages = (await multi.ReadAsync<string>()).AsList();
        }
        return customer;
    }

    public async Task<Customer?> GetByPhoneOrInstagramAsync(string? phone, string? instagramId)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        const string sql = @"
            SELECT * FROM customers 
            WHERE (@Phone IS NOT NULL AND phone_number = @Phone) 
               OR (@InstagramId IS NOT NULL AND instagram_id = @InstagramId)
            LIMIT 1;";
        
        return await connection.QueryFirstOrDefaultAsync<Customer>(sql, new { Phone = phone, InstagramId = instagramId });
    }

    public async Task<IEnumerable<Customer>> GetAllAsync(int limit, int offset)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        const string sql = "SELECT * FROM customers ORDER BY created_at DESC LIMIT @Limit OFFSET @Offset";
        var customers = (await connection.QueryAsync<Customer>(sql, new { Limit = limit, Offset = offset })).AsList();

        if (customers.Any())
        {
            var customerIds = customers.Select(c => c.Id).ToList();

            const string detailSql = @"
                SELECT * FROM customer_addresses WHERE customer_id = ANY(@Ids);
                SELECT id, customer_id as CustomerId, username, full_name as FullName, profile_picture_url as ProfilePictureUrl, is_primary as IsPrimary 
                FROM instagram_accounts 
                WHERE customer_id = ANY(@Ids);
                SELECT customer_id, language_code 
                FROM customer_languages 
                WHERE customer_id = ANY(@Ids);";

            using var multi = await connection.QueryMultipleAsync(detailSql, new { Ids = customerIds });
            var addresses = (await multi.ReadAsync<CustomerAddress>()).GroupBy(a => a.CustomerId).ToDictionary(g => g.Key, g => g.ToList());
            var instagrams = (await multi.ReadAsync<CustomerInstagramAccount>()).GroupBy(i => i.CustomerId).ToDictionary(g => g.Key, g => g.ToList());
            var languages = (await multi.ReadAsync<dynamic>())
                .GroupBy(l => (Guid)l.customer_id)
                .ToDictionary(g => g.Key, g => g.Select(x => (string)x.language_code).ToList());

            foreach (var customer in customers)
            {
                customer.Addresses = addresses.TryGetValue(customer.Id, out var addrs) ? addrs : new List<CustomerAddress>();
                customer.InstagramAccounts = instagrams.TryGetValue(customer.Id, out var instas) ? instas : new List<CustomerInstagramAccount>();
                customer.PreferredLanguages = languages.TryGetValue(customer.Id, out var langs) ? langs : new List<string>();
            }
        }
        return customers;
    }

    public async Task<Guid> CreateAsync(Customer customer)
    {
        if (customer.Id == Guid.Empty) customer.Id = Guid.NewGuid();
        
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        const string sql = @"
            INSERT INTO customers (id, customer_id, first_name, last_name, phone_number, instagram_id, email, notes, created_at, updated_at)
            VALUES (@Id, @CustomerId, @FirstName, @LastName, @PhoneNumber, @InstagramId, @Email, @Notes, @CreatedAt, @UpdatedAt)
            RETURNING id;";
        
        return await connection.ExecuteScalarAsync<Guid>(sql, customer);
    }

    public async Task<bool> UpdateAsync(Customer customer)
    {
        customer.UpdatedAt = DateTime.UtcNow;
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        const string sql = @"
            UPDATE customers 
            SET first_name = @FirstName, 
                last_name = @LastName, 
                phone_number = @PhoneNumber, 
                instagram_id = @InstagramId, 
                email = @Email, 
                notes = @Notes, 
                updated_at = @UpdatedAt
            WHERE id = @Id;";
        
        var rows = await connection.ExecuteAsync(sql, customer);
        return rows > 0;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        var rows = await connection.ExecuteAsync("DELETE FROM customers WHERE id = @Id", new { Id = id });
        
        // Cleanup unmapped manual accounts (platform_account_id is NULL) that are orphans
        const string cleanupSql = @"
            DELETE FROM instagram_accounts 
            WHERE customer_id IS NULL 
              AND (platform_account_id IS NULL OR platform_account_id = '')
              AND NOT EXISTS (
                  SELECT 1 FROM post_comments WHERE account_id = instagram_accounts.id
              );";
        await connection.ExecuteAsync(cleanupSql);

        return rows > 0;
    }

    public async Task<int> GetOrderCountAsync(Guid customerId)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        return await connection.ExecuteScalarAsync<int>(@"SELECT COUNT(1) FROM ""orderId"" WHERE customer_id = @CustomerId", new { CustomerId = customerId });
    }

    public async Task<IEnumerable<CustomerAddress>> GetAddressesByCustomerIdAsync(Guid customerId)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        return await connection.QueryAsync<CustomerAddress>("SELECT * FROM customer_addresses WHERE customer_id = @CustomerId", new { CustomerId = customerId });
    }

    public async Task<Guid> AddAddressAsync(CustomerAddress address)
    {
        if (address.Id == Guid.Empty) address.Id = Guid.NewGuid();
        
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        
        // If this is the default address, unset others
        if (address.IsDefault)
        {
            await connection.ExecuteAsync("UPDATE customer_addresses SET is_default = false WHERE customer_id = @CustomerId", new { CustomerId = address.CustomerId });
        }

        const string sql = @"
            INSERT INTO customer_addresses (id, customer_id, name, phone, line1, pincode, is_default, created_at, updated_at)
            VALUES (@Id, @CustomerId, @Name, @Phone, @Line1, @Pincode, @IsDefault, @CreatedAt, @UpdatedAt)
            RETURNING id;";
        
        return await connection.ExecuteScalarAsync<Guid>(sql, address);
    }

    public async Task<bool> UpdateAddressAsync(CustomerAddress address)
    {
        address.UpdatedAt = DateTime.UtcNow;
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        
        if (address.IsDefault)
        {
            await connection.ExecuteAsync("UPDATE customer_addresses SET is_default = false WHERE customer_id = @CustomerId AND id != @Id", new { CustomerId = address.CustomerId, Id = address.Id });
        }

        const string sql = @"
            UPDATE customer_addresses 
            SET name = @Name, 
                phone = @Phone, 
                line1 = @Line1, 
                pincode = @Pincode, 
                is_default = @IsDefault, 
                updated_at = @UpdatedAt
            WHERE id = @Id;";
        
        var rows = await connection.ExecuteAsync(sql, address);
        return rows > 0;
    }

    public async Task<bool> DeleteAddressAsync(Guid addressId)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        var rows = await connection.ExecuteAsync("DELETE FROM customer_addresses WHERE id = @Id", new { Id = addressId });
        return rows > 0;
    }

    public async Task<bool> SetDefaultAddressAsync(Guid customerId, Guid addressId)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        await connection.ExecuteAsync("UPDATE customer_addresses SET is_default = false WHERE customer_id = @CustomerId", new { CustomerId = customerId });
        var rows = await connection.ExecuteAsync("UPDATE customer_addresses SET is_default = true WHERE id = @Id AND customer_id = @CustomerId", new { Id = addressId, CustomerId = customerId });
        return rows > 0;
    }

    public async Task SaveAddressesAsync(Guid customerId, List<CustomerAddress> addresses)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();

        if (addresses == null || !addresses.Any())
        {
            await connection.ExecuteAsync("DELETE FROM customer_addresses WHERE customer_id = @CustomerId", new { CustomerId = customerId });
            return;
        }

        var incomingIds = addresses.Select(a => a.Id).Where(id => id != Guid.Empty).ToList();
        
        // Delete addresses not in the new list
        if (incomingIds.Any())
        {
            await connection.ExecuteAsync("DELETE FROM customer_addresses WHERE customer_id = @CustomerId AND id NOT IN @Ids", 
                new { CustomerId = customerId, Ids = incomingIds });
        }
        else
        {
            await connection.ExecuteAsync("DELETE FROM customer_addresses WHERE customer_id = @CustomerId", new { CustomerId = customerId });
        }

        foreach (var address in addresses)
        {
            address.CustomerId = customerId;
            if (address.Id == Guid.Empty)
            {
                address.Id = Guid.NewGuid();
                const string insertSql = @"
                    INSERT INTO customer_addresses (id, customer_id, name, phone, line1, pincode, is_default, created_at, updated_at)
                    VALUES (@Id, @CustomerId, @Name, @Phone, @Line1, @Pincode, @IsDefault, @CreatedAt, @UpdatedAt);";
                await connection.ExecuteAsync(insertSql, address);
            }
            else
            {
                const string updateSql = @"
                    UPDATE customer_addresses 
                    SET name = @Name, 
                        phone = @Phone, 
                        line1 = @Line1, 
                        pincode = @Pincode, 
                        is_default = @IsDefault, 
                        updated_at = @UpdatedAt
                    WHERE id = @Id AND customer_id = @CustomerId;";
                
                var rows = await connection.ExecuteAsync(updateSql, address);
                if (rows == 0) // if for some reason the ID was sent but doesn't exist
                {
                    const string insertSql = @"
                        INSERT INTO customer_addresses (id, customer_id, name, phone, line1, pincode, is_default, created_at, updated_at)
                        VALUES (@Id, @CustomerId, @Name, @Phone, @Line1, @Pincode, @IsDefault, @CreatedAt, @UpdatedAt);";
                    await connection.ExecuteAsync(insertSql, address);
                }
            }
        }
    }

    public async Task<Guid?> GetCustomerIdByInstagramUsernameAsync(string username)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        const string sql = "SELECT customer_id FROM instagram_accounts WHERE LOWER(username) = LOWER(@Username) LIMIT 1";
        return await connection.QueryFirstOrDefaultAsync<Guid?>(sql, new { Username = username });
    }

    public async Task<IEnumerable<DeepLens.Contracts.Customers.LanguageDto>> GetPreferredLanguagesMasterAsync()
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        const string sql = "SELECT code as Code, name as Name, is_default as IsDefault FROM customer_languages_master ORDER BY name ASC";
        return await connection.QueryAsync<DeepLens.Contracts.Customers.LanguageDto>(sql);
    }

    public async Task SaveInstagramAccountsAsync(Guid customerId, List<DeepLens.Contracts.Customers.CustomerInstagramAccountDto> accounts)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        
        // Unmap existing accounts for this customer to handle deletions/updates cleanly
        await connection.ExecuteAsync("UPDATE instagram_accounts SET customer_id = NULL, is_primary = false WHERE customer_id = @CustomerId", new { CustomerId = customerId });
        
        if (accounts == null || !accounts.Any()) return;
        
        foreach (var acc in accounts)
        {
            // Upsert the handle: Update if exists, insert if new
            const string sql = @"
                INSERT INTO instagram_accounts (id, platform, username, customer_id, is_primary)
                VALUES (gen_random_uuid(), 'INSTAGRAM', @Username, @CustomerId, @IsPrimary)
                ON CONFLICT (platform, platform_account_id) DO UPDATE 
                SET customer_id = @CustomerId, is_primary = @IsPrimary;";
                
            // We use a fallback if the constraint on platform_account_id causes issues for nulls:
            // For purely manual accounts where platform_account_id is null, the conflict clause won't trigger (nulls aren't equal).
            // So we check existence by username first to be safe and update it.
            var existingId = await connection.ExecuteScalarAsync<Guid?>("SELECT id FROM instagram_accounts WHERE LOWER(username) = LOWER(@Username) LIMIT 1", new { Username = acc.Username });
            
            if (existingId.HasValue)
            {
                await connection.ExecuteAsync("UPDATE instagram_accounts SET customer_id = @CustomerId, is_primary = @IsPrimary WHERE id = @Id", 
                    new { CustomerId = customerId, IsPrimary = acc.IsPrimary, Id = existingId.Value });
            }
            else
            {
                await connection.ExecuteAsync("INSERT INTO instagram_accounts (id, platform, username, customer_id, is_primary) VALUES (gen_random_uuid(), 'INSTAGRAM', @Username, @CustomerId, @IsPrimary)", 
                    new { Username = acc.Username, CustomerId = customerId, IsPrimary = acc.IsPrimary });
            }
        }

        // Cleanup unmapped manual accounts (platform_account_id is NULL) that are orphans
        const string cleanupSql = @"
            DELETE FROM instagram_accounts 
            WHERE customer_id IS NULL 
              AND (platform_account_id IS NULL OR platform_account_id = '')
              AND NOT EXISTS (
                  SELECT 1 FROM post_comments WHERE account_id = instagram_accounts.id
              );";
        await connection.ExecuteAsync(cleanupSql);
    }

    public async Task SavePreferredLanguagesAsync(Guid customerId, List<string> languages)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        
        await connection.ExecuteAsync("DELETE FROM customer_languages WHERE customer_id = @CustomerId", new { CustomerId = customerId });
        
        if (languages == null || !languages.Any()) return;
        
        var sql = "INSERT INTO customer_languages (customer_id, language_code) VALUES (@CustomerId, @LanguageCode) ON CONFLICT DO NOTHING";
        var parameters = languages.Select(lang => new { CustomerId = customerId, LanguageCode = lang }).ToList();
        
        await connection.ExecuteAsync(sql, parameters);
    }
}

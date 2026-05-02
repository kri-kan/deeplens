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
            SELECT * FROM customer_addresses WHERE customer_id = @Id;";

        using var multi = await connection.QueryMultipleAsync(sql, new { Id = id });
        var customer = await multi.ReadFirstOrDefaultAsync<Customer>();
        if (customer != null)
        {
            customer.Addresses = (await multi.ReadAsync<CustomerAddress>()).AsList();
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
        return await connection.QueryAsync<Customer>(sql, new { Limit = limit, Offset = offset });
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
        return rows > 0;
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
            INSERT INTO customer_addresses (id, customer_id, name, phone, line1, line2, pincode, city, state, is_default, created_at, updated_at)
            VALUES (@Id, @CustomerId, @Name, @Phone, @Line1, @Line2, @Pincode, @City, @State, @IsDefault, @CreatedAt, @UpdatedAt)
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
                line2 = @Line2, 
                pincode = @Pincode, 
                city = @City, 
                state = @State, 
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
}

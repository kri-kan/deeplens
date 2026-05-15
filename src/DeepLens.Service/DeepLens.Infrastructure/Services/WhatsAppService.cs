using Dapper;
using DeepLens.Application.Abstractions.Data;
using DeepLens.Contracts.Marketing;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace DeepLens.Infrastructure.Services;

public class WhatsAppService : IWhatsAppService
{
    private readonly IDbConnectionFactory _dbConnectionFactory;

    public WhatsAppService(IDbConnectionFactory dbConnectionFactory)
    {
        _dbConnectionFactory = dbConnectionFactory;
    }

    public async Task<IEnumerable<WhatsAppAccountDto>> GetActiveAccountsAsync()
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        return await connection.QueryAsync<WhatsAppAccountDto>(
            "SELECT id as Id, session_id as SessionId, phone_number as PhoneNumber, account_name as AccountName, label as Label, status as Status, created_at as CreatedAt, updated_at as UpdatedAt FROM wa.accounts ORDER BY created_at DESC");
    }

    public async Task<WhatsAppAccountDto> CreateAccountAsync(CreateWhatsAppAccountRequest request)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        const string sql = @"
            INSERT INTO wa.accounts (session_id, label, phone_number, status)
            VALUES (@SessionId, @Label, @PhoneNumber, 'disconnected')
            ON CONFLICT (session_id) DO UPDATE
                SET label = EXCLUDED.label, updated_at = NOW()
            RETURNING id, session_id, phone_number, account_name, label, status, created_at, updated_at;";

        var row = await connection.QuerySingleAsync(sql, new
        {
            request.SessionId,
            request.Label,
            request.PhoneNumber
        });

        return new WhatsAppAccountDto(
            Id: row.id,
            SessionId: row.session_id,
            PhoneNumber: row.phone_number,
            AccountName: row.account_name,
            Label: row.label,
            Status: row.status,
            CreatedAt: row.created_at,
            UpdatedAt: row.updated_at
        );
    }

    public async Task<bool> DeleteAccountAsync(Guid id)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        var rows = await connection.ExecuteAsync("DELETE FROM wa.accounts WHERE id = @Id", new { Id = id });
        return rows > 0;
    }

    public async Task<IEnumerable<WhatsAppChannelDto>> GetAllChannelsAsync()
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        return await connection.QueryAsync<WhatsAppChannelDto>(
            "SELECT id, name, description FROM whatsapp_channels ORDER BY name ASC");
    }

    public async Task<WhatsAppChannelDto> CreateChannelAsync(string name, string? description)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        const string sql = @"
            INSERT INTO whatsapp_channels (name, description)
            VALUES (@Name, @Description)
            RETURNING id, name, description;";
        
        return await connection.QuerySingleAsync<WhatsAppChannelDto>(sql, new { Name = name, Description = description });
    }

    public async Task<bool> DeleteChannelAsync(Guid id)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        var rows = await connection.ExecuteAsync("DELETE FROM whatsapp_channels WHERE id = @Id", new { Id = id });
        return rows > 0;
    }

    public async Task<IEnumerable<CustomerChannelMembershipDto>> GetCustomerMembershipsAsync(Guid customerId)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        const string sql = @"
            SELECT 
                m.id, 
                m.customer_id as CustomerId, 
                m.channel_id as ChannelId, 
                c.name as ChannelName, 
                m.status, 
                m.opted_in_at as OptedInAt, 
                m.opted_out_at as OptedOutAt
            FROM campaign_wabroadcast m
            JOIN whatsapp_channels c ON m.channel_id = c.id
            WHERE m.customer_id = @CustomerId
            ORDER BY m.opted_in_at DESC";
        
        return await connection.QueryAsync<CustomerChannelMembershipDto>(sql, new { CustomerId = customerId });
    }

    public async Task<IEnumerable<ChannelSubscriberDto>> GetChannelSubscribersAsync(Guid channelId)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        const string sql = @"
            SELECT 
                m.customer_id as CustomerId, 
                c.first_name as FirstName, 
                c.last_name as LastName, 
                c.phone_number as PhoneNumber, 
                m.status, 
                m.opted_in_at as OptedInAt
            FROM campaign_wabroadcast m
            JOIN customers c ON m.customer_id = c.id
            WHERE m.channel_id = @ChannelId AND m.status = 'OPTED_IN'
            ORDER BY m.opted_in_at DESC";
        
        return await connection.QueryAsync<ChannelSubscriberDto>(sql, new { ChannelId = channelId });
    }

    public async Task<bool> SubscribeCustomerAsync(Guid customerId, Guid channelId)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        const string sql = @"
            INSERT INTO campaign_wabroadcast (customer_id, channel_id, status, opted_in_at, updated_at)
            VALUES (@CustomerId, @ChannelId, 'OPTED_IN', @Now, @Now)
            ON CONFLICT (customer_id, channel_id) 
            DO UPDATE SET status = 'OPTED_IN', opted_in_at = @Now, opted_out_at = NULL, updated_at = @Now;";

        var rows = await connection.ExecuteAsync(sql, new { CustomerId = customerId, ChannelId = channelId, Now = DateTime.UtcNow });
        return rows > 0;
    }

    public async Task<bool> UnsubscribeCustomerAsync(Guid customerId, Guid channelId)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        const string sql = @"
            UPDATE campaign_wabroadcast 
            SET status = 'OPTED_OUT', opted_out_at = @Now, updated_at = @Now
            WHERE customer_id = @CustomerId AND channel_id = @ChannelId;";

        var rows = await connection.ExecuteAsync(sql, new { CustomerId = customerId, ChannelId = channelId, Now = DateTime.UtcNow });
        return rows > 0;
    }
}

using Dapper;
using DeepLens.Application.Abstractions.Data;
using DeepLens.Contracts.Marketing;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace DeepLens.Infrastructure.Services;

public class CommunicationBroadcastService : ICommunicationBroadcastService
{
    private readonly IDbConnectionFactory _dbConnectionFactory;

    public CommunicationBroadcastService(IDbConnectionFactory dbConnectionFactory)
    {
        _dbConnectionFactory = dbConnectionFactory;
    }

    public async Task<IEnumerable<BroadcastChannelDto>> GetAllChannelsAsync()
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        const string sql = @"
            SELECT id, name, description, channel_type as ChannelType, metadata, created_at as CreatedAt 
            FROM comm_broadcast_channels 
            ORDER BY name ASC";
        return await connection.QueryAsync<BroadcastChannelDto>(sql);
    }

    public async Task<BroadcastChannelDto?> GetChannelByIdAsync(Guid id)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        const string sql = @"
            SELECT id, name, description, channel_type as ChannelType, metadata, created_at as CreatedAt 
            FROM comm_broadcast_channels 
            WHERE id = @Id";
        return await connection.QueryFirstOrDefaultAsync<BroadcastChannelDto>(sql, new { Id = id });
    }

    public async Task<BroadcastChannelDto> CreateChannelAsync(CreateBroadcastChannelRequest request)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        const string sql = @"
            INSERT INTO comm_broadcast_channels (name, description, channel_type, metadata)
            VALUES (@Name, @Description, @ChannelType, @Metadata::jsonb)
            RETURNING id, name, description, channel_type as ChannelType, metadata, created_at as CreatedAt;";
        
        return await connection.QuerySingleAsync<BroadcastChannelDto>(sql, new { 
            request.Name, 
            request.Description, 
            request.ChannelType, 
            Metadata = request.Metadata ?? "{}" 
        });
    }

    public async Task<bool> DeleteChannelAsync(Guid id)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        var rows = await connection.ExecuteAsync("DELETE FROM comm_broadcast_channels WHERE id = @Id", new { Id = id });
        return rows > 0;
    }

    public async Task<IEnumerable<ChannelTypeDto>> GetChannelTypesAsync()
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        const string sql = "SELECT type_key as TypeKey, name, member_limit as MemberLimit, description FROM comm_channel_types ORDER BY name ASC";
        return await connection.QueryAsync<ChannelTypeDto>(sql);
    }

    public async Task<IEnumerable<string>> GetAllPurposesAsync()
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        const string sql = "SELECT purpose_key FROM comm_purposes ORDER BY purpose_key ASC";
        return await connection.QueryAsync<string>(sql);
    }

    public async Task<IEnumerable<PurposeWithChannelsDto>> GetPurposesWithChannelsAsync()
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        const string sql = @"
            SELECT 
                p.purpose_key as PurposeKey, 
                m.id, 
                m.channel_id as ChannelId, 
                c.name as ChannelName, 
                m.created_at as CreatedAt
            FROM comm_purposes p
            LEFT JOIN comm_broadcast_purposes m ON p.purpose_key = m.purpose_key
            LEFT JOIN comm_broadcast_channels c ON m.channel_id = c.id
            ORDER BY p.purpose_key ASC, m.created_at DESC";
        
        var rawData = await connection.QueryAsync<dynamic>(sql);
        
        var result = new List<PurposeWithChannelsDto>();
        var grouped = rawData.GroupBy(x => (string)x.purposekey);
        
        foreach (var group in grouped)
        {
            var channels = new List<PurposeMappingDto>();
            foreach (var item in group)
            {
                if (item.id != null) // Only add if there's actually a mapping
                {
                    channels.Add(new PurposeMappingDto(
                        item.id,
                        item.purposekey,
                        item.channelid,
                        item.channelname,
                        item.createdat
                    ));
                }
            }
            result.Add(new PurposeWithChannelsDto(group.Key, channels));
        }
        
        return result;
    }

    public async Task<IEnumerable<PurposeMappingDto>> GetChannelsByPurposeAsync(string purposeKey)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        const string sql = @"
            SELECT 
                p.id, 
                p.purpose_key as PurposeKey, 
                p.channel_id as ChannelId, 
                c.name as ChannelName, 
                p.created_at as CreatedAt
            FROM comm_broadcast_purposes p
            JOIN comm_broadcast_channels c ON p.channel_id = c.id
            WHERE p.purpose_key = @PurposeKey
            ORDER BY p.created_at DESC";
        
        return await connection.QueryAsync<PurposeMappingDto>(sql, new { PurposeKey = purposeKey });
    }

    public async Task<IEnumerable<BroadcastChannelDto>> GetUnlinkedChannelsAsync(string purposeKey)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        const string sql = @"
            SELECT id, name, description, channel_type as ChannelType, metadata, created_at as CreatedAt
            FROM comm_broadcast_channels
            WHERE id NOT IN (
                SELECT channel_id FROM comm_broadcast_purposes WHERE purpose_key = @PurposeKey
            )
            ORDER BY created_at DESC";
        
        return await connection.QueryAsync<BroadcastChannelDto>(sql, new { PurposeKey = purposeKey });
    }

    public async Task<bool> CreatePurposeAsync(string purposeKey, string name)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        const string sql = @"
            INSERT INTO comm_purposes (purpose_key, name)
            VALUES (@PurposeKey, @Name)
            ON CONFLICT (purpose_key) DO NOTHING;";
        
        var rows = await connection.ExecuteAsync(sql, new { PurposeKey = purposeKey, Name = name });
        return rows > 0;
    }

    public async Task<bool> AddChannelToPurposeAsync(string purposeKey, Guid channelId)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        const string sql = @"
            INSERT INTO comm_broadcast_purposes (purpose_key, channel_id)
            VALUES (@PurposeKey, @ChannelId)
            ON CONFLICT DO NOTHING;";

        var rows = await connection.ExecuteAsync(sql, new { PurposeKey = purposeKey, ChannelId = channelId });
        return rows >= 0; // Succeeds even if already exists due to ON CONFLICT
    }

    public async Task<bool> RemoveChannelFromPurposeAsync(string purposeKey, Guid channelId)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        const string sql = @"
            DELETE FROM comm_broadcast_purposes 
            WHERE purpose_key = @PurposeKey AND channel_id = @ChannelId;";

        var rows = await connection.ExecuteAsync(sql, new { PurposeKey = purposeKey, ChannelId = channelId });
        return rows > 0;
    }

    public async Task<bool> AddCustomersToPurposeAsync(string purposeKey, IEnumerable<Guid> customerIds)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        const string sql = @"
            INSERT INTO comm_purpose_subscriptions (purpose_key, customer_id)
            VALUES (@PurposeKey, @CustomerId)
            ON CONFLICT DO NOTHING;";
        
        var rows = 0;
        foreach (var customerId in customerIds)
        {
            rows += await connection.ExecuteAsync(sql, new { PurposeKey = purposeKey, CustomerId = customerId });
        }
        return rows > 0;
    }

    public async Task<bool> RemoveCustomersFromPurposeAsync(string purposeKey, IEnumerable<Guid> customerIds)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        const string sql = @"
            DELETE FROM comm_purpose_subscriptions 
            WHERE purpose_key = @PurposeKey AND customer_id = @CustomerId;";
        
        var rows = 0;
        foreach (var customerId in customerIds)
        {
            rows += await connection.ExecuteAsync(sql, new { PurposeKey = purposeKey, CustomerId = customerId });
        }
        return rows > 0;
    }

    public async Task<IEnumerable<PurposeCustomerDto>> GetPurposeCustomersAsync(string purposeKey)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        const string sql = @"
            SELECT 
                s.customer_id as CustomerId,
                TRIM(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '')) as CustomerName,
                COALESCE(c.phone_number, '') as PhoneNumber,
                s.created_at as CreatedAt,
                cs.channel_id as AssignedChannelId,
                bc.name as AssignedChannelName
            FROM comm_purpose_subscriptions s
            JOIN customers c ON s.customer_id = c.id
            LEFT JOIN comm_channel_subscriptions cs ON s.customer_id = cs.customer_id 
                AND cs.channel_id IN (SELECT channel_id FROM comm_broadcast_purposes WHERE purpose_key = @PurposeKey)
            LEFT JOIN comm_broadcast_channels bc ON cs.channel_id = bc.id
            WHERE s.purpose_key = @PurposeKey
            ORDER BY s.created_at DESC";
        
        return await connection.QueryAsync<PurposeCustomerDto>(sql, new { PurposeKey = purposeKey });
    }

    public async Task<IEnumerable<PurposeCustomerDto>> GetUnassignedPurposeCustomersAsync(string purposeKey)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        const string sql = @"
            SELECT 
                c.id as CustomerId,
                TRIM(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '')) as CustomerName,
                COALESCE(c.phone_number, '') as PhoneNumber,
                c.created_at as CreatedAt,
                CAST(NULL AS UUID) as AssignedChannelId,
                CAST(NULL AS TEXT) as AssignedChannelName
            FROM customers c
            WHERE c.id NOT IN (
                SELECT customer_id FROM comm_purpose_subscriptions WHERE purpose_key = @PurposeKey
            )
            ORDER BY c.created_at DESC";
        
        return await connection.QueryAsync<PurposeCustomerDto>(sql, new { PurposeKey = purposeKey });
    }

    public async Task<int> DistributeCustomersToChannelsAsync(string purposeKey)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        
        // 1. Get channels for this purpose with their limits and current counts
        const string channelsSql = @"
            SELECT 
                c.id, 
                c.name, 
                t.member_limit as MemberLimit,
                (SELECT COUNT(*) FROM comm_channel_subscriptions WHERE channel_id = c.id) as CurrentCount
            FROM comm_broadcast_purposes p
            JOIN comm_broadcast_channels c ON p.channel_id = c.id
            JOIN comm_channel_types t ON c.channel_type = t.type_key
            WHERE p.purpose_key = @PurposeKey";
        
        var channels = (await connection.QueryAsync<dynamic>(channelsSql, new { PurposeKey = purposeKey })).ToList();
        
        // 2. Get customers assigned to purpose but not in any of these channels
        const string unassignedSql = @"
            SELECT s.customer_id
            FROM comm_purpose_subscriptions s
            WHERE s.purpose_key = @PurposeKey
            AND s.customer_id NOT IN (
                SELECT sub.customer_id 
                FROM comm_channel_subscriptions sub
                JOIN comm_broadcast_purposes p2 ON sub.channel_id = p2.channel_id
                WHERE p2.purpose_key = @PurposeKey
            )";
        
        var unassignedIds = (await connection.QueryAsync<Guid>(unassignedSql, new { PurposeKey = purposeKey })).ToList();
        
        if (!unassignedIds.Any()) return 0;

        var totalDistributed = 0;
        var customerIndex = 0;

        foreach (var channel in channels)
        {
            if (customerIndex >= unassignedIds.Count) break;

            int capacity = (int)channel.memberlimit - (int)channel.currentcount;
            if (capacity <= 0) continue;

            var batch = unassignedIds.Skip(customerIndex).Take(capacity).ToList();
            
            const string insertSql = "INSERT INTO comm_channel_subscriptions (channel_id, customer_id) VALUES (@ChannelId, @CustomerId)";
            foreach (var customerId in batch)
            {
                await connection.ExecuteAsync(insertSql, new { ChannelId = (Guid)channel.id, CustomerId = customerId });
                totalDistributed++;
                customerIndex++;
            }
        }

        return totalDistributed;
    }
}

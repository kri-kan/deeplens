using Dapper;
using DeepLens.Application.Abstractions.Data;
using DeepLens.Contracts.Marketing;
using System;
using System.Collections.Generic;
using System.Linq;
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

    public async Task<BroadcastChannelDto?> UpdateChannelAsync(Guid id, UpdateBroadcastChannelRequest request)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        const string sql = @"
            UPDATE comm_broadcast_channels 
            SET name = @Name, description = @Description, channel_type = @ChannelType, metadata = @Metadata::jsonb
            WHERE id = @Id
            RETURNING id, name, description, channel_type as ChannelType, metadata, created_at as CreatedAt;";
        return await connection.QueryFirstOrDefaultAsync<BroadcastChannelDto>(sql, new {
            Id = id,
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

    // Private mapping row classes for campaign steps to handle dynamic JSONB deserialization cleanly
    private class PurposeStepRow
    {
        public Guid Id { get; set; }
        public string PurposeKey { get; set; } = string.Empty;
        public int StepNumber { get; set; }
        public string Description { get; set; } = string.Empty;
        public string Action { get; set; } = string.Empty;
        public string MessageTemplates { get; set; } = "[]";
    }

    private class CustomerStepProgressRow
    {
        public Guid StepId { get; set; }
        public int StepNumber { get; set; }
        public string Description { get; set; } = string.Empty;
        public string Action { get; set; } = string.Empty;
        public string MessageTemplates { get; set; } = "[]";
        public string Status { get; set; } = "new";
        public DateTime? CompletedAt { get; set; }
    }

    // Purpose Campaign Steps
    public async Task<IEnumerable<PurposeStepDto>> GetPurposeStepsAsync(string purposeKey)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        const string sql = @"
            SELECT 
                id, 
                purpose_key as PurposeKey, 
                step_number as StepNumber, 
                description, 
                action, 
                message_templates as MessageTemplates
            FROM comm_purpose_steps
            WHERE purpose_key = @PurposeKey
            ORDER BY step_number ASC";
        
        var rows = await connection.QueryAsync<PurposeStepRow>(sql, new { PurposeKey = purposeKey });
        var dtos = new List<PurposeStepDto>();
        foreach (var r in rows)
        {
            var templates = System.Text.Json.JsonSerializer.Deserialize<List<MessageTemplate>>(r.MessageTemplates) 
                            ?? new List<MessageTemplate>();
            dtos.Add(new PurposeStepDto(r.Id, r.PurposeKey, r.StepNumber, r.Description, r.Action, templates));
        }
        return dtos;
    }

    public async Task<PurposeStepDto> CreatePurposeStepAsync(string purposeKey, CreatePurposeStepRequest request)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        const string sql = @"
            INSERT INTO comm_purpose_steps (purpose_key, step_number, description, action, message_templates)
            VALUES (
                @PurposeKey, 
                COALESCE((SELECT MAX(step_number) FROM comm_purpose_steps WHERE purpose_key = @PurposeKey), 0) + 1, 
                @Description, 
                @Action, 
                @MessageTemplates::jsonb
            )
            RETURNING id, purpose_key as PurposeKey, step_number as StepNumber, description, action, message_templates as MessageTemplates;";
        
        var templatesJson = System.Text.Json.JsonSerializer.Serialize(request.MessageTemplates ?? Enumerable.Empty<MessageTemplate>());

        var r = await connection.QuerySingleAsync<PurposeStepRow>(sql, new {
            PurposeKey = purposeKey,
            request.StepNumber,
            request.Description,
            request.Action,
            MessageTemplates = templatesJson
        });

        var templates = System.Text.Json.JsonSerializer.Deserialize<List<MessageTemplate>>(r.MessageTemplates) 
                        ?? new List<MessageTemplate>();
        return new PurposeStepDto(r.Id, r.PurposeKey, r.StepNumber, r.Description, r.Action, templates);
    }

    public async Task<PurposeStepDto> UpdatePurposeStepAsync(string purposeKey, Guid stepId, UpdatePurposeStepRequest request)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        const string sql = @"
            UPDATE comm_purpose_steps 
            SET description = @Description,
                action = @Action,
                message_templates = @MessageTemplates::jsonb,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = @StepId AND purpose_key = @PurposeKey
            RETURNING id, purpose_key as PurposeKey, step_number as StepNumber, description, action, message_templates as MessageTemplates;";
        
        var templatesJson = System.Text.Json.JsonSerializer.Serialize(request.MessageTemplates ?? Enumerable.Empty<MessageTemplate>());

        var r = await connection.QuerySingleOrDefaultAsync<PurposeStepRow>(sql, new {
            PurposeKey = purposeKey,
            StepId = stepId,
            request.Description,
            request.Action,
            MessageTemplates = templatesJson
        });

        if (r == null) throw new Exception("Step not found or could not be updated.");

        var templates = System.Text.Json.JsonSerializer.Deserialize<List<MessageTemplate>>(r.MessageTemplates) 
                        ?? new List<MessageTemplate>();
        return new PurposeStepDto(r.Id, r.PurposeKey, r.StepNumber, r.Description, r.Action, templates);
    }

    public async Task<bool> DeletePurposeStepAsync(string purposeKey, Guid stepId)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        const string sql = "DELETE FROM comm_purpose_steps WHERE purpose_key = @PurposeKey AND id = @StepId";
        var rows = await connection.ExecuteAsync(sql, new { PurposeKey = purposeKey, StepId = stepId });
        return rows > 0;
    }

    // Customer Steps Progress
    public async Task<IEnumerable<CustomerStepProgressDto>> GetCustomerStepProgressAsync(string purposeKey, Guid customerId)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        const string sql = @"
            SELECT 
                s.id as StepId,
                s.step_number as StepNumber,
                s.description,
                s.action,
                s.message_templates as MessageTemplates,
                COALESCE(cs.status, 'new') as Status,
                cs.completed_at as CompletedAt
            FROM comm_purpose_steps s
            LEFT JOIN comm_purpose_customer_steps cs ON s.id = cs.step_id AND cs.customer_id = @CustomerId
            WHERE s.purpose_key = @PurposeKey
            ORDER BY s.step_number ASC";
        
        var rows = await connection.QueryAsync<CustomerStepProgressRow>(sql, new { PurposeKey = purposeKey, CustomerId = customerId });
        var dtos = new List<CustomerStepProgressDto>();
        foreach (var r in rows)
        {
            var templates = System.Text.Json.JsonSerializer.Deserialize<List<MessageTemplate>>(r.MessageTemplates) 
                            ?? new List<MessageTemplate>();
            dtos.Add(new CustomerStepProgressDto(r.StepId, r.StepNumber, r.Description, r.Action, templates, r.Status, r.CompletedAt));
        }
        return dtos;
    }

    public async Task<bool> UpdateCustomerStepStatusAsync(string purposeKey, Guid customerId, Guid stepId, string status, string? sentMessage)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        
        const string getStepSql = "SELECT step_number FROM comm_purpose_steps WHERE id = @StepId AND purpose_key = @PurposeKey";
        var stepNumber = await connection.QueryFirstOrDefaultAsync<int?>(getStepSql, new { StepId = stepId, PurposeKey = purposeKey });
        if (stepNumber == null) return false;

        if (status == "completed")
        {
            const string checkPriorSql = @"
                SELECT COUNT(*) 
                FROM comm_purpose_steps s
                LEFT JOIN comm_purpose_customer_steps cs ON s.id = cs.step_id AND cs.customer_id = @CustomerId
                WHERE s.purpose_key = @PurposeKey 
                  AND s.step_number < @StepNumber 
                  AND (cs.status IS NULL OR cs.status != 'completed')";
            
            var incompletePriorCount = await connection.ExecuteScalarAsync<int>(checkPriorSql, new { 
                PurposeKey = purposeKey, 
                CustomerId = customerId, 
                StepNumber = stepNumber.Value 
            });
            
            if (incompletePriorCount > 0)
            {
                throw new InvalidOperationException("Cannot complete step because previous steps are not completed.");
            }
        }
        else if (status == "new")
        {
            const string checkSubsequentSql = @"
                SELECT COUNT(*) 
                FROM comm_purpose_steps s
                JOIN comm_purpose_customer_steps cs ON s.id = cs.step_id AND cs.customer_id = @CustomerId
                WHERE s.purpose_key = @PurposeKey 
                  AND s.step_number > @StepNumber 
                  AND cs.status = 'completed'";
            
            var completedSubsequentCount = await connection.ExecuteScalarAsync<int>(checkSubsequentSql, new { 
                PurposeKey = purposeKey, 
                CustomerId = customerId, 
                StepNumber = stepNumber.Value 
            });
            
            if (completedSubsequentCount > 0)
            {
                throw new InvalidOperationException("Cannot reset step because subsequent steps are completed.");
            }

            const string deleteSql = "DELETE FROM comm_purpose_customer_steps WHERE customer_id = @CustomerId AND step_id = @StepId";
            var deleteRows = await connection.ExecuteAsync(deleteSql, new { CustomerId = customerId, StepId = stepId });
            return deleteRows >= 0;
        }

        const string upsertSql = @"
            INSERT INTO comm_purpose_customer_steps (purpose_key, customer_id, step_id, status, completed_at, sent_message)
            VALUES (@PurposeKey, @CustomerId, @StepId, @Status, @CompletedAt, @SentMessage)
            ON CONFLICT (customer_id, step_id) 
            DO UPDATE SET 
                status = EXCLUDED.status, 
                completed_at = EXCLUDED.completed_at, 
                sent_message = EXCLUDED.sent_message,
                updated_at = CURRENT_TIMESTAMP;";
        
        var completedAt = status == "completed" ? (DateTime?)DateTime.UtcNow : null;
        var rows = await connection.ExecuteAsync(upsertSql, new {
            PurposeKey = purposeKey,
            CustomerId = customerId,
            StepId = stepId,
            Status = status,
            CompletedAt = completedAt,
            SentMessage = sentMessage
        });
        return rows > 0;
    }

    public async Task<IEnumerable<PurposeCustomerTrackingDto>> GetPurposeCustomersTrackingAsync(string purposeKey)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        const string sql = @"
            SELECT 
                s.customer_id as CustomerId,
                TRIM(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '')) as CustomerName,
                COALESCE(c.phone_number, '') as PhoneNumber,
                (SELECT COUNT(*)::INTEGER FROM comm_purpose_steps WHERE purpose_key = s.purpose_key) as TotalSteps,
                (SELECT COUNT(*)::INTEGER FROM comm_purpose_customer_steps cs 
                 JOIN comm_purpose_steps ps ON cs.step_id = ps.id 
                 WHERE cs.customer_id = s.customer_id AND ps.purpose_key = s.purpose_key AND cs.status = 'completed') as CompletedSteps,
                (SELECT MAX(cs.completed_at) FROM comm_purpose_customer_steps cs 
                 JOIN comm_purpose_steps ps ON cs.step_id = ps.id 
                 WHERE cs.customer_id = s.customer_id AND ps.purpose_key = s.purpose_key AND cs.status = 'completed') as LastStepCompletedAt,
                cs.channel_id as AssignedChannelId,
                bc.name as AssignedChannelName,
                COALESCE((SELECT string_agg(language_code, ',') FROM customer_languages WHERE customer_id = s.customer_id), '') as PreferredLanguagesRaw,
                COALESCE(c.instagram_id, '') as InstagramId,
                COALESCE(c.referral_code, '') as ReferralCode,
                COALESCE(c.first_name, '') as FirstName,
                COALESCE(c.last_name, '') as LastName,
                COALESCE(c.email, '') as Email
            FROM comm_purpose_subscriptions s
            JOIN customers c ON s.customer_id = c.id
            LEFT JOIN comm_channel_subscriptions cs ON s.customer_id = cs.customer_id 
                AND cs.channel_id IN (SELECT channel_id FROM comm_broadcast_purposes WHERE purpose_key = @PurposeKey)
            LEFT JOIN comm_broadcast_channels bc ON cs.channel_id = bc.id
            WHERE s.purpose_key = @PurposeKey
            ORDER BY c.first_name ASC";
        
        var rawList = await connection.QueryAsync<dynamic>(sql, new { PurposeKey = purposeKey });
        
        return rawList.Select(item => {
            var langsStr = (string)item.preferredlanguagesraw;
            var preferredLanguages = string.IsNullOrEmpty(langsStr) 
                ? new List<string>() 
                : langsStr.Split(',').Select(x => x.Trim()).ToList();

            return new PurposeCustomerTrackingDto(
                (Guid)item.customerid,
                (string)item.customername,
                (string)item.phonenumber,
                (int)item.totalsteps,
                (int)item.completedsteps,
                (int)item.totalsteps > 0 && (int)item.completedsteps == (int)item.totalsteps,
                item.assignedchannelid != null ? (Guid)item.assignedchannelid : null,
                (string)item.assignedchannelname,
                preferredLanguages,
                (string)item.instagramid,
                (string)item.referralcode,
                (string)item.firstname,
                (string)item.lastname,
                (string)item.email,
                item.laststepcompletedat != null ? (DateTime?)item.laststepcompletedat : null
            );
        });
    }

    public async Task<IEnumerable<CampaignVariableDto>> GetCampaignVariablesAsync(string purposeKey)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        const string sql = @"
            SELECT 
                purpose_key as PurposeKey,
                variable_key as VariableKey,
                variable_value as VariableValue
            FROM comm_campaign_variables
            WHERE purpose_key = @PurposeKey
            ORDER BY variable_key ASC";
        return await connection.QueryAsync<CampaignVariableDto>(sql, new { PurposeKey = purposeKey });
    }

    public async Task<bool> UpsertCampaignVariablesAsync(string purposeKey, IEnumerable<CampaignVariableInput> variables)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        
        if (connection.State != System.Data.ConnectionState.Open)
        {
            connection.Open();
        }

        using var transaction = connection.BeginTransaction();
        try
        {
            const string deleteSql = "DELETE FROM comm_campaign_variables WHERE purpose_key = @PurposeKey";
            await connection.ExecuteAsync(deleteSql, new { PurposeKey = purposeKey }, transaction);

            if (variables != null && variables.Any())
            {
                const string insertSql = @"
                    INSERT INTO comm_campaign_variables (purpose_key, variable_key, variable_value)
                    VALUES (@PurposeKey, @VariableKey, @VariableValue)";
                
                foreach (var v in variables)
                {
                    if (string.IsNullOrWhiteSpace(v.VariableKey)) continue;
                    await connection.ExecuteAsync(insertSql, new { 
                        PurposeKey = purposeKey, 
                        VariableKey = v.VariableKey.Trim(), 
                        VariableValue = (v.VariableValue ?? string.Empty).Trim() 
                    }, transaction);
                }
            }

            transaction.Commit();
            return true;
        }
        catch
        {
            transaction.Rollback();
            throw;
        }
    }
}

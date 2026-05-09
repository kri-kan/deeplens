using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace DeepLens.Contracts.Marketing;

public record BroadcastChannelDto(
    [property: JsonPropertyName("id")] Guid Id,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("description")] string? Description,
    [property: JsonPropertyName("channelType")] string ChannelType,
    [property: JsonPropertyName("metadata")] string? Metadata,
    [property: JsonPropertyName("createdAt")] DateTime CreatedAt
);

public record ChannelTypeDto(
    [property: JsonPropertyName("typeKey")] string TypeKey,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("memberLimit")] int MemberLimit,
    [property: JsonPropertyName("description")] string? Description
);

public record CreateBroadcastChannelRequest(
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("description")] string? Description,
    [property: JsonPropertyName("channelType")] string ChannelType,
    [property: JsonPropertyName("metadata")] string? Metadata
);

public record PurposeMappingDto(
    [property: JsonPropertyName("id")] Guid Id,
    [property: JsonPropertyName("purposeKey")] string PurposeKey,
    [property: JsonPropertyName("channelId")] Guid ChannelId,
    [property: JsonPropertyName("channelName")] string ChannelName,
    [property: JsonPropertyName("createdAt")] DateTime CreatedAt
);

public record PurposeWithChannelsDto(
    [property: JsonPropertyName("purposeKey")] string PurposeKey,
    [property: JsonPropertyName("channels")] IEnumerable<PurposeMappingDto> Channels
);

public record PurposeCustomerDto(
    [property: JsonPropertyName("customerId")] Guid CustomerId,
    [property: JsonPropertyName("customerName")] string CustomerName,
    [property: JsonPropertyName("phoneNumber")] string PhoneNumber,
    [property: JsonPropertyName("createdAt")] DateTime CreatedAt,
    [property: JsonPropertyName("assignedChannelId")] Guid? AssignedChannelId,
    [property: JsonPropertyName("assignedChannelName")] string? AssignedChannelName
);

public interface ICommunicationBroadcastService
{
    // Channel Management
    Task<IEnumerable<BroadcastChannelDto>> GetAllChannelsAsync();
    Task<BroadcastChannelDto?> GetChannelByIdAsync(Guid id);
    Task<BroadcastChannelDto> CreateChannelAsync(CreateBroadcastChannelRequest request);
    Task<bool> DeleteChannelAsync(Guid id);
    Task<IEnumerable<ChannelTypeDto>> GetChannelTypesAsync();

    // Purpose Mapping
    Task<IEnumerable<string>> GetAllPurposesAsync();
    Task<IEnumerable<PurposeWithChannelsDto>> GetPurposesWithChannelsAsync();
    Task<IEnumerable<PurposeMappingDto>> GetChannelsByPurposeAsync(string purposeKey);
    Task<IEnumerable<BroadcastChannelDto>> GetUnlinkedChannelsAsync(string purposeKey);
    Task<bool> CreatePurposeAsync(string purposeKey, string name);
    Task<bool> AddChannelToPurposeAsync(string purposeKey, Guid channelId);
    Task<bool> RemoveChannelFromPurposeAsync(string purposeKey, Guid channelId);

    // Customer Assignment
    Task<bool> AddCustomersToPurposeAsync(string purposeKey, IEnumerable<Guid> customerIds);
    Task<bool> RemoveCustomersFromPurposeAsync(string purposeKey, IEnumerable<Guid> customerIds);
    Task<IEnumerable<PurposeCustomerDto>> GetPurposeCustomersAsync(string purposeKey);
    Task<IEnumerable<PurposeCustomerDto>> GetUnassignedPurposeCustomersAsync(string purposeKey);
    Task<int> DistributeCustomersToChannelsAsync(string purposeKey);
}

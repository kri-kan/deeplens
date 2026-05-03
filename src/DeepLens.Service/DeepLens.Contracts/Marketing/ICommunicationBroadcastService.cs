using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace DeepLens.Contracts.Marketing;

public record BroadcastChannelDto(
    Guid Id,
    string Name,
    string? Description,
    string ChannelType,
    string? Metadata,
    DateTime CreatedAt
);

public record ChannelTypeDto(
    string TypeKey,
    string Name,
    int MemberLimit,
    string? Description
);

public record CreateBroadcastChannelRequest(
    string Name,
    string? Description,
    string ChannelType,
    string? Metadata
);

public record PurposeMappingDto(
    Guid Id,
    string PurposeKey,
    Guid ChannelId,
    string ChannelName,
    DateTime CreatedAt
);

public record PurposeWithChannelsDto(
    string PurposeKey,
    IEnumerable<PurposeMappingDto> Channels
);


public record PurposeCustomerDto(
    Guid CustomerId,
    string CustomerName,
    string PhoneNumber,
    DateTime CreatedAt,
    Guid? AssignedChannelId,
    string? AssignedChannelName
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

using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace DeepLens.Contracts.Marketing;

public record WhatsAppChannelDto(
    [property: JsonPropertyName("id")] Guid Id,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("description")] string? Description
);

public record CustomerChannelMembershipDto(
    [property: JsonPropertyName("id")] Guid Id,
    [property: JsonPropertyName("customerId")] Guid CustomerId,
    [property: JsonPropertyName("channelId")] Guid ChannelId,
    [property: JsonPropertyName("channelName")] string ChannelName,
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("optedInAt")] DateTime OptedInAt,
    [property: JsonPropertyName("optedOutAt")] DateTime? OptedOutAt
);

public record ChannelSubscriberDto(
    [property: JsonPropertyName("customerId")] Guid CustomerId,
    [property: JsonPropertyName("firstName")] string? FirstName,
    [property: JsonPropertyName("lastName")] string? LastName,
    [property: JsonPropertyName("phoneNumber")] string? PhoneNumber,
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("optedInAt")] DateTime OptedInAt
);

public interface IWhatsAppService
{
    Task<IEnumerable<WhatsAppChannelDto>> GetAllChannelsAsync();
    Task<WhatsAppChannelDto> CreateChannelAsync(string name, string? description);
    Task<bool> DeleteChannelAsync(Guid id);
    Task<IEnumerable<CustomerChannelMembershipDto>> GetCustomerMembershipsAsync(Guid customerId);
    Task<IEnumerable<ChannelSubscriberDto>> GetChannelSubscribersAsync(Guid channelId);
    Task<bool> SubscribeCustomerAsync(Guid customerId, Guid channelId);
    Task<bool> UnsubscribeCustomerAsync(Guid customerId, Guid channelId);
}

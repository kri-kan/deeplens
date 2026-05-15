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

public record WhatsAppAccountDto(
    [property: JsonPropertyName("id")] Guid Id,
    [property: JsonPropertyName("sessionId")] string SessionId,
    [property: JsonPropertyName("phoneNumber")] string? PhoneNumber,
    [property: JsonPropertyName("accountName")] string? AccountName,
    [property: JsonPropertyName("label")] string? Label,
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("createdAt")] DateTime CreatedAt,
    [property: JsonPropertyName("updatedAt")] DateTime UpdatedAt
);

public record CreateWhatsAppAccountRequest(
    [property: JsonPropertyName("sessionId")] string SessionId,
    [property: JsonPropertyName("label")] string Label,
    [property: JsonPropertyName("phoneNumber")] string? PhoneNumber = null
);

public interface IWhatsAppService
{
    Task<IEnumerable<WhatsAppAccountDto>> GetActiveAccountsAsync();
    Task<WhatsAppAccountDto> CreateAccountAsync(CreateWhatsAppAccountRequest request);
    Task<bool> DeleteAccountAsync(Guid id);

    Task<IEnumerable<WhatsAppChannelDto>> GetAllChannelsAsync();
    Task<WhatsAppChannelDto> CreateChannelAsync(string name, string? description);
    Task<bool> DeleteChannelAsync(Guid id);
    Task<IEnumerable<CustomerChannelMembershipDto>> GetCustomerMembershipsAsync(Guid customerId);
    Task<IEnumerable<ChannelSubscriberDto>> GetChannelSubscribersAsync(Guid channelId);
    Task<bool> SubscribeCustomerAsync(Guid customerId, Guid channelId);
    Task<bool> UnsubscribeCustomerAsync(Guid customerId, Guid channelId);
}

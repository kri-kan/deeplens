using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace DeepLens.Contracts.Marketing;

public record WhatsAppChannelDto(Guid Id, string Name, string? Description);

public record CustomerChannelMembershipDto(
    Guid Id,
    Guid CustomerId,
    Guid ChannelId,
    string ChannelName,
    string Status,
    DateTime OptedInAt,
    DateTime? OptedOutAt
);

public record ChannelSubscriberDto(
    Guid CustomerId,
    string? FirstName,
    string? LastName,
    string? PhoneNumber,
    string Status,
    DateTime OptedInAt
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

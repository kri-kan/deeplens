using DeepLens.Contracts.Marketing;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace DeepLens.SearchApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class WhatsAppController : ControllerBase
{
    private readonly IWhatsAppService _whatsAppService;

    public WhatsAppController(IWhatsAppService whatsAppService)
    {
        _whatsAppService = whatsAppService;
    }

    [HttpGet("accounts")]
    public async Task<IActionResult> GetAccounts()
    {
        var accounts = await _whatsAppService.GetActiveAccountsAsync();
        return Ok(accounts);
    }

    [HttpPost("accounts")]
    public async Task<IActionResult> CreateAccount([FromBody] CreateWhatsAppAccountRequest request)
    {
        var account = await _whatsAppService.CreateAccountAsync(request);
        return Ok(account);
    }

    [HttpDelete("accounts/{id}")]
    public async Task<IActionResult> DeleteAccount(Guid id)
    {
        var result = await _whatsAppService.DeleteAccountAsync(id);
        return result ? Ok() : NotFound();
    }

    [HttpGet("channels")]
    public async Task<IActionResult> GetChannels()
    {
        var channels = await _whatsAppService.GetAllChannelsAsync();
        return Ok(channels);
    }

    [HttpPost("channels")]
    public async Task<IActionResult> CreateChannel([FromBody] CreateChannelRequest request)
    {
        var channel = await _whatsAppService.CreateChannelAsync(request.Name, request.Description);
        return Ok(channel);
    }

    [HttpDelete("channels/{id}")]
    public async Task<IActionResult> DeleteChannel(Guid id)
    {
        var result = await _whatsAppService.DeleteChannelAsync(id);
        return result ? Ok() : BadRequest("Failed to delete channel");
    }

    public record CreateChannelRequest(string Name, string? Description);

    [HttpGet("channels/{id}/subscribers")]
    public async Task<IActionResult> GetChannelSubscribers(Guid id)
    {
        var subscribers = await _whatsAppService.GetChannelSubscribersAsync(id);
        return Ok(subscribers);
    }

    [HttpGet("customers/{customerId}/memberships")]
    public async Task<IActionResult> GetCustomerMemberships(Guid customerId)
    {
        var memberships = await _whatsAppService.GetCustomerMembershipsAsync(customerId);
        return Ok(memberships);
    }

    [HttpPost("customers/{customerId}/subscribe/{channelId}")]
    public async Task<IActionResult> Subscribe(Guid customerId, Guid channelId)
    {
        var result = await _whatsAppService.SubscribeCustomerAsync(customerId, channelId);
        return result ? Ok() : BadRequest("Failed to subscribe customer to channel");
    }

    [HttpPost("customers/{customerId}/unsubscribe/{channelId}")]
    public async Task<IActionResult> Unsubscribe(Guid customerId, Guid channelId)
    {
        var result = await _whatsAppService.UnsubscribeCustomerAsync(customerId, channelId);
        return result ? Ok() : BadRequest("Failed to unsubscribe customer from channel");
    }
}

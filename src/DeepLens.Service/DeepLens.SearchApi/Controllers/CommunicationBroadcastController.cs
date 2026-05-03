using DeepLens.Contracts.Marketing;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace DeepLens.SearchApi.Controllers;

[ApiController]
[Route("api/v1/communication/broadcast")]
public class CommunicationBroadcastController : ControllerBase
{
    private readonly ICommunicationBroadcastService _broadcastService;

    public CommunicationBroadcastController(ICommunicationBroadcastService broadcastService)
    {
        _broadcastService = broadcastService;
    }

    [HttpGet("channels")]
    public async Task<IActionResult> GetChannels()
    {
        var channels = await _broadcastService.GetAllChannelsAsync();
        return Ok(channels);
    }

    [HttpGet("channels/{id}")]
    public async Task<IActionResult> GetChannel(Guid id)
    {
        var channel = await _broadcastService.GetChannelByIdAsync(id);
        return channel != null ? Ok(channel) : NotFound();
    }

    [HttpPost("channels")]
    public async Task<IActionResult> CreateChannel([FromBody] CreateBroadcastChannelRequest request)
    {
        var channel = await _broadcastService.CreateChannelAsync(request);
        return CreatedAtAction(nameof(GetChannel), new { id = channel.Id }, channel);
    }

    [HttpDelete("channels/{id}")]
    public async Task<IActionResult> DeleteChannel(Guid id)
    {
        var result = await _broadcastService.DeleteChannelAsync(id);
        return result ? NoContent() : BadRequest("Failed to delete channel");
    }

    [HttpGet("channel-types")]
    public async Task<IActionResult> GetChannelTypes()
    {
        var types = await _broadcastService.GetChannelTypesAsync();
        return Ok(types);
    }

    [HttpGet("purposes")]
    public async Task<IActionResult> GetPurposes()
    {
        var purposes = await _broadcastService.GetAllPurposesAsync();
        return Ok(purposes);
    }

    [HttpGet("purposes/detailed")]
    public async Task<IActionResult> GetPurposesDetailed()
    {
        var detailedPurposes = await _broadcastService.GetPurposesWithChannelsAsync();
        return Ok(detailedPurposes);
    }

    [HttpPost("purposes")]
    public async Task<IActionResult> CreatePurpose([FromBody] CreatePurposeRequest request)
    {
        var result = await _broadcastService.CreatePurposeAsync(request.PurposeKey, request.Name);
        return result ? Ok() : BadRequest("Failed to create purpose or already exists");
    }

    public record CreatePurposeRequest(string PurposeKey, string Name);

    [HttpGet("purposes/{purposeKey}/channels")]
    public async Task<IActionResult> GetChannelsByPurpose(string purposeKey)
    {
        var channels = await _broadcastService.GetChannelsByPurposeAsync(purposeKey);
        return Ok(channels);
    }

    [HttpGet("purposes/{purposeKey}/unlinked-channels")]
    public async Task<IActionResult> GetUnlinkedChannels(string purposeKey)
    {
        var channels = await _broadcastService.GetUnlinkedChannelsAsync(purposeKey);
        return Ok(channels);
    }

    [HttpPost("purposes/{purposeKey}/channels/{channelId}")]
    public async Task<IActionResult> AddChannelToPurpose(string purposeKey, Guid channelId)
    {
        var result = await _broadcastService.AddChannelToPurposeAsync(purposeKey, channelId);
        return result ? Ok() : BadRequest("Failed to add channel to purpose");
    }

    [HttpDelete("purposes/{purposeKey}/channels/{channelId}")]
    public async Task<IActionResult> RemoveChannelFromPurpose(string purposeKey, Guid channelId)
    {
        var result = await _broadcastService.RemoveChannelFromPurposeAsync(purposeKey, channelId);
        return result ? Ok() : BadRequest("Failed to remove channel from purpose");
    }

    [HttpPost("purposes/{purposeKey}/customers")]
    public async Task<IActionResult> AddCustomersToPurpose(string purposeKey, [FromBody] IEnumerable<Guid> customerIds)
    {
        var result = await _broadcastService.AddCustomersToPurposeAsync(purposeKey, customerIds);
        return result ? Ok() : BadRequest("Failed to add customers to purpose");
    }

    [HttpGet("purposes/{purposeKey}/customers")]
    public async Task<IActionResult> GetPurposeCustomers(string purposeKey)
    {
        var customers = await _broadcastService.GetPurposeCustomersAsync(purposeKey);
        return Ok(customers);
    }

    [HttpGet("purposes/{purposeKey}/unassigned-customers")]
    public async Task<IActionResult> GetUnassignedPurposeCustomers(string purposeKey)
    {
        var customers = await _broadcastService.GetUnassignedPurposeCustomersAsync(purposeKey);
        return Ok(customers);
    }

    [HttpDelete("purposes/{purposeKey}/customers")]
    public async Task<IActionResult> RemoveCustomersFromPurpose(string purposeKey, [FromBody] IEnumerable<Guid> customerIds)
    {
        var result = await _broadcastService.RemoveCustomersFromPurposeAsync(purposeKey, customerIds);
        return result ? Ok() : BadRequest("Failed to remove customers from purpose");
    }

    [HttpPost("purposes/{purposeKey}/distribute")]
    public async Task<IActionResult> DistributeCustomers(string purposeKey)
    {
        var count = await _broadcastService.DistributeCustomersToChannelsAsync(purposeKey);
        return Ok(new { Count = count });
    }
}

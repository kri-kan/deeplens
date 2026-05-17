using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using DeepLens.Contracts.Customers;
using Microsoft.AspNetCore.Mvc;

namespace DeepLens.SearchApi.Controllers;

[ApiController]
[Route("api/v1/customers")]
public class CustomersController : ControllerBase
{
    private readonly ICustomerService _customerService;

    public CustomersController(ICustomerService customerService)
    {
        _customerService = customerService;
    }

    [HttpGet]
    public async Task<IActionResult> GetCustomers([FromQuery] int limit = 50, [FromQuery] int offset = 0)
    {
        var customers = await _customerService.GetAllCustomersAsync(limit, offset);
        return Ok(customers);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetCustomerById(Guid id)
    {
        var customer = await _customerService.GetCustomerByIdAsync(id);
        if (customer == null) return NotFound();
        return Ok(customer);
    }

    [HttpPost]
    public async Task<IActionResult> CreateCustomer([FromBody] CreateCustomerRequest request)
    {
        var customer = await _customerService.CreateCustomerAsync(request);
        return CreatedAtAction(nameof(GetCustomerById), new { id = customer.Id }, customer);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateCustomer(Guid id, [FromBody] CreateCustomerRequest request)
    {
        var success = await _customerService.UpdateCustomerAsync(id, request);
        if (!success) return NotFound();
        return Ok();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteCustomer(Guid id)
    {
        var success = await _customerService.DeleteCustomerAsync(id);
        if (!success) return NotFound();
        return Ok();
    }

    [HttpPost("{id:guid}/addresses")]
    public async Task<IActionResult> AddAddress(Guid id, [FromBody] CreateAddressRequest request)
    {
        var addressId = await _customerService.AddAddressAsync(id, request);
        return Ok(new { id = addressId });
    }

    [HttpPut("addresses/{addressId:guid}")]
    public async Task<IActionResult> UpdateAddress(Guid addressId, [FromBody] CreateAddressRequest request)
    {
        var success = await _customerService.UpdateAddressAsync(addressId, request);
        if (!success) return NotFound();
        return Ok();
    }

    [HttpDelete("addresses/{addressId:guid}")]
    public async Task<IActionResult> DeleteAddress(Guid addressId)
    {
        var success = await _customerService.DeleteAddressAsync(addressId);
        if (!success) return NotFound();
        return Ok();
    }

    [HttpPost("{id:guid}/addresses/{addressId:guid}/default")]
    public async Task<IActionResult> SetDefaultAddress(Guid id, Guid addressId)
    {
        var success = await _customerService.SetDefaultAddressAsync(id, addressId);
        if (!success) return NotFound();
        return Ok();
    }

    [HttpGet("validate-instagram")]
    public async Task<IActionResult> ValidateInstagram([FromQuery] string username, [FromQuery] Guid? currentCustomerId = null)
    {
        var isValid = await _customerService.ValidateInstagramHandleAsync(username, currentCustomerId);
        return Ok(new { isValid });
    }

    [HttpGet("languages")]
    public async Task<IActionResult> GetPreferredLanguages()
    {
        var languages = await _customerService.GetPreferredLanguagesMasterAsync();
        return Ok(languages);
    }
}

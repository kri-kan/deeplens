using Dapper;
using DeepLens.Application.Abstractions.Data;
using DeepLens.Contracts.Common;
using Microsoft.AspNetCore.Mvc;

namespace DeepLens.SearchApi.Controllers;

[ApiController]
[Route("api/v1/country")]
public class CountryController : ControllerBase
{
    private readonly IDbConnectionFactory _dbConnectionFactory;

    public CountryController(IDbConnectionFactory dbConnectionFactory)
    {
        _dbConnectionFactory = dbConnectionFactory;
    }

    [HttpGet("codes")]
    public async Task<IActionResult> GetCountryCodes()
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();
        var codes = await connection.QueryAsync<CountryCodeDto>("SELECT code, name, dial_code as DialCode FROM country_codes ORDER BY name ASC");
        return Ok(codes);
    }
}

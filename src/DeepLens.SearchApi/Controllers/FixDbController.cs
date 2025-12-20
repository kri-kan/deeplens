using Microsoft.AspNetCore.Mvc;
using Dapper;
using Npgsql;

namespace DeepLens.SearchApi.Controllers;

[ApiController]
[Route("api/test/fix-db")]
public class FixDbController : ControllerBase
{
    private readonly IConfiguration _configuration;

    public FixDbController(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    [HttpGet]
    public async Task<IActionResult> Fix()
    {
        var connString = _configuration.GetConnectionString("DefaultConnection") 
                         ?? "Host=localhost;Port=5433;Database=nextgen_identity;Username=postgres;Password=DeepLens123!";
        
        using var conn = new NpgsqlConnection(connString);
        await conn.OpenAsync();

        var tenants = await conn.QueryAsync<dynamic>("SELECT id, database_name FROM tenants");
        var results = new List<string>();

        foreach (var tenant in tenants)
        {
            try 
            {
                var tenantConnString = connString.Replace("Database=nextgen_identity", $"Database={tenant.database_name}");
                using var tConn = new NpgsqlConnection(tenantConnString);
                await tConn.OpenAsync();
                
                await tConn.ExecuteAsync("ALTER TABLE seller_listings ADD COLUMN IF NOT EXISTS shipping_info VARCHAR(50) DEFAULT 'plus shipping'");
                results.Add($"Success for {tenant.database_name}");
            }
            catch (Exception ex)
            {
                results.Add($"Failed for {tenant.database_name}: {ex.Message}");
            }
        }

        return Ok(results);
    }
}

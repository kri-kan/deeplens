using NextGen.Identity.Core.Entities;
using NextGen.Identity.Core.Interfaces;

namespace NextGen.Identity.Api.Data;

/// <summary>
/// Seeds the database with initial admin user and tenant
/// </summary>
public class DatabaseSeeder
{
    private readonly ITenantRepository _tenantRepository;
    private readonly IUserRepository _userRepository;
    private readonly ILogger<DatabaseSeeder> _logger;

    public DatabaseSeeder(
        ITenantRepository tenantRepository,
        IUserRepository userRepository,
        ILogger<DatabaseSeeder> logger)
    {
        _tenantRepository = tenantRepository;
        _userRepository = userRepository;
        _logger = logger;
    }

    /// <summary>
    /// Seeds the database with initial data
    /// </summary>
    public async Task SeedAsync()
    {
        try
        {
            await SeedAdminTenantAndUserAsync();
            _logger.LogInformation("Database seeding completed successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during database seeding");
            throw;
        }
    }

    /// <summary>
    /// Seeds the admin tenant and default admin user
    /// </summary>
    private async Task SeedAdminTenantAndUserAsync()
    {
        // Check if admin tenant already exists
        var existingAdminTenant = await _tenantRepository.GetBySlugAsync("deeplens-admin");
        if (existingAdminTenant != null)
        {
            _logger.LogInformation("Admin tenant already exists, skipping seed");
            return;
        }

        // Create admin tenant
        var adminTenant = new Tenant
        {
            Id = Guid.NewGuid(),
            Name = "DeepLens Administration",
            Description = "System administration tenant for DeepLens platform",
            Slug = "deeplens-admin",
            DatabaseName = "deeplens_admin",
            QdrantContainerName = "deeplens-admin-qdrant",
            QdrantHttpPort = 6333,
            QdrantGrpcPort = 6334,
            MinioEndpoint = "minio:9000",
            MinioBucketName = "deeplens-admin",
            Status = TenantStatus.Active,
            Tier = TenantTier.Enterprise,
            MaxStorageBytes = 107374182400, // 100 GB
            MaxUsers = 100,
            MaxApiCallsPerDay = 1000000,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = Guid.Empty // System-created tenant (00000000-0000-0000-0000-000000000000)
        };

        await _tenantRepository.CreateAsync(adminTenant);
        _logger.LogInformation("Admin tenant created: {TenantId}", adminTenant.Id);

        // Create default admin user
        var adminUser = new User
        {
            Id = Guid.NewGuid(),
            TenantId = adminTenant.Id,
            Email = "admin@deeplens.local",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("DeepLens@Admin123!"), // Change in production!
            FirstName = "System",
            LastName = "Administrator",
            EmailConfirmed = true,
            Role = UserRole.Admin,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        await _userRepository.CreateAsync(adminUser);
        _logger.LogInformation("Admin user created: {UserId}", adminUser.Id);

        _logger.LogWarning(
            "⚠️  Default admin credentials created:" + Environment.NewLine +
            "Email: admin@deeplens.local" + Environment.NewLine +
            "Password: DeepLens@Admin123!" + Environment.NewLine +
            "⚠️  PLEASE CHANGE THIS PASSWORD IN PRODUCTION!");
    }
}

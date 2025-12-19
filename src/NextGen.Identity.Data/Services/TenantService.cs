using System.Diagnostics;
using System.Text.RegularExpressions;
using BCrypt.Net;
using NextGen.Identity.Core.DTOs;
using NextGen.Identity.Core.Entities;
using NextGen.Identity.Core.Interfaces;

namespace NextGen.Identity.Data.Services;

public class TenantService : ITenantService
{
    private readonly ITenantRepository _tenantRepository;
    private readonly IUserRepository _userRepository;
    private readonly ITenantProvisioningService _provisioningService;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly IRefreshTokenRepository _refreshTokenRepository;

    public TenantService(
        ITenantRepository tenantRepository,
        IUserRepository userRepository,
        ITenantProvisioningService provisioningService,
        IJwtTokenService jwtTokenService,
        IRefreshTokenRepository refreshTokenRepository)
    {
        _tenantRepository = tenantRepository;
        _userRepository = userRepository;
        _provisioningService = provisioningService;
        _jwtTokenService = jwtTokenService;
        _refreshTokenRepository = refreshTokenRepository;
    }

    /// <summary>
    /// Creates tenant record and admin user for infrastructure provisioning scripts
    /// </summary>
    public async Task<ProvisionTenantResponse> CreateTenantRecordWithAdminAsync(ProvisionTenantRequest request)
    {
        using var activity = Telemetry.ActivitySource.StartActivity("TenantProvision");
        activity?.SetTag("tenant.name", request.TenantName);
        activity?.SetTag("admin.email", request.AdminEmail);

        try
        {
            // Generate slug from name
            var slug = GenerateSlug(request.TenantName);
            activity?.SetTag("tenant.slug", slug);

            // Check if slug already exists
            var existingTenant = await _tenantRepository.GetBySlugAsync(slug);
            if (existingTenant != null)
            {
                throw new InvalidOperationException($"A tenant with slug '{slug}' already exists");
            }

            // Check if admin email already exists
            var existingUser = await _userRepository.GetByEmailAsync(request.AdminEmail);
            if (existingUser != null)
            {
                throw new InvalidOperationException($"User with email '{request.AdminEmail}' already exists");
            }

            // Create tenant entity
            var tenantId = Guid.NewGuid();
            var tenant = new Tenant
            {
                Id = tenantId,
                Name = request.TenantName,
                Description = $"Tenant: {request.TenantName}",
                Slug = slug,
                DatabaseName = request.DatabaseName,
                QdrantContainerName = $"deeplens-qdrant-{slug}",
                QdrantHttpPort = request.QdrantHttpPort,
                QdrantGrpcPort = request.QdrantGrpcPort,
                MinioEndpoint = request.MinioEndpoint ?? "localhost:9000",
                MinioBucketName = request.MinioBucket ?? slug,
                Status = TenantStatus.Active,
                Tier = TenantTier.Free,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = Guid.Empty // Will be updated after admin user creation
            };

            // Set default tenant limits
            SetTenantLimits(tenant, TenantTier.Free);

            activity?.SetTag("tenant.id", tenantId);

            // Create tenant in database
            var createdTenant = await _tenantRepository.CreateAsync(tenant);

            // Create admin user
            var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.AdminPassword);
            var adminUserId = Guid.NewGuid();
            var adminUser = new User
            {
                Id = adminUserId,
                TenantId = createdTenant.Id,
                Email = request.AdminEmail,
                PasswordHash = passwordHash,
                FirstName = request.AdminFirstName,
                LastName = request.AdminLastName,
                Role = UserRole.TenantOwner,
                IsActive = true,
                EmailConfirmed = true, // Auto-confirm for provisioned admins
                CreatedAt = DateTime.UtcNow
            };

            var createdAdmin = await _userRepository.CreateAsync(adminUser);
            activity?.SetTag("admin.user.id", adminUserId);

            // Update tenant's CreatedBy
            createdTenant.CreatedBy = createdAdmin.Id;
            createdTenant.UpdatedAt = DateTime.UtcNow;
            await _tenantRepository.UpdateAsync(createdTenant);

            activity?.SetTag("provision.result", "success");

            return new ProvisionTenantResponse
            {
                TenantId = createdTenant.Id,
                AdminUserId = createdAdmin.Id,
                TenantSlug = slug,
                AdminEmail = request.AdminEmail,
                Message = $"Tenant '{request.TenantName}' and admin user created successfully"
            };
        }
        catch (Exception ex)
        {
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            throw;
        }
    }

    public async Task<TenantSetupResponse> CreateTenantWithAdminAsync(CreateTenantRequest request, string ipAddress, string userAgent)
    {
        using var activity = Telemetry.ActivitySource.StartActivity(Telemetry.Operations.TenantCreate);
        activity?.SetTag("tenant.name", request.Name);
        activity?.SetTag(Telemetry.Tags.UserEmail, request.AdminEmail);

        try
        {
            // Generate slug from name
            var slug = GenerateSlug(request.Name);
            activity?.SetTag("tenant.slug", slug);

            // Check if slug already exists
            var existingTenant = await _tenantRepository.GetBySlugAsync(slug);
            if (existingTenant != null)
            {
                activity?.SetTag("create.result", "slug_already_exists");
                throw new InvalidOperationException($"A tenant with slug '{slug}' already exists");
            }

            // Parse tier
            var tier = Enum.TryParse<TenantTier>(request.Tier, out var parsedTier) ? parsedTier : TenantTier.Free;

            // Create tenant entity
            var tenant = new Tenant
            {
                Id = Guid.NewGuid(),
                Name = request.Name,
                Description = request.Description,
                Slug = slug,
                DatabaseName = "pending",
                QdrantContainerName = $"qdrant-{slug}",
                MinioEndpoint = "pending",
                MinioBucketName = $"deeplens-{slug}",
                Status = TenantStatus.PendingSetup,
                Tier = tier,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = null // Will be updated after admin user creation
            };

            // Set tenant limits based on tier
            SetTenantLimits(tenant, tier);

            activity?.SetTag(Telemetry.Tags.TenantId, tenant.Id);

            // Create tenant in database
            var createdTenant = await _tenantRepository.CreateAsync(tenant);

            // Provision infrastructure
            var infrastructure = await _provisioningService.ProvisionInfrastructureAsync(createdTenant.Id, slug);

            // Update tenant with infrastructure details
            createdTenant.DatabaseName = infrastructure.DatabaseName;
            createdTenant.QdrantContainerName = $"qdrant-{slug}";
            createdTenant.QdrantHttpPort = ExtractPort(infrastructure.QdrantEndpoint);
            createdTenant.QdrantGrpcPort = ExtractPort(infrastructure.QdrantEndpoint) + 1;
            createdTenant.MinioEndpoint = infrastructure.MinioEndpoint;
            createdTenant.MinioBucketName = infrastructure.MinioBucket;
            createdTenant.UpdatedAt = DateTime.UtcNow;
            
            await _tenantRepository.UpdateAsync(createdTenant);

            // Create admin user
            var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.AdminPassword);
            var adminUser = new User
            {
                Id = Guid.NewGuid(),
                TenantId = createdTenant.Id,
                Email = request.AdminEmail,
                PasswordHash = passwordHash,
                FirstName = request.AdminFirstName,
                LastName = request.AdminLastName,
                Role = UserRole.TenantOwner,
                IsActive = true,
                EmailConfirmed = false,
                CreatedAt = DateTime.UtcNow
            };

            var createdAdmin = await _userRepository.CreateAsync(adminUser);
            activity?.SetTag(Telemetry.Tags.UserId, createdAdmin.Id);

            // Update tenant's CreatedBy
            createdTenant.CreatedBy = createdAdmin.Id;
            await _tenantRepository.UpdateAsync(createdTenant);

            // Generate tokens
            var accessToken = _jwtTokenService.GenerateAccessToken(createdAdmin);
            var refreshToken = GenerateRefreshToken();

            // Save refresh token
            var refreshTokenEntity = new RefreshToken
            {
                Id = Guid.NewGuid(),
                UserId = createdAdmin.Id,
                Token = refreshToken,
                ExpiresAt = DateTime.UtcNow.AddDays(7),
                CreatedAt = DateTime.UtcNow,
                IsRevoked = false,
                IpAddress = ipAddress,
                UserAgent = userAgent
            };

            await _refreshTokenRepository.CreateAsync(refreshTokenEntity);

            // Update tenant status to Active
            createdTenant.Status = TenantStatus.Active;
            createdTenant.UpdatedAt = DateTime.UtcNow;
            await _tenantRepository.UpdateAsync(createdTenant);

            activity?.SetTag("create.result", "success");

            return new TenantSetupResponse
            {
                Tenant = MapToTenantResponse(createdTenant, infrastructure),
                AdminUser = new UserInfo
                {
                    Id = createdAdmin.Id,
                    Email = createdAdmin.Email,
                    FirstName = createdAdmin.FirstName,
                    LastName = createdAdmin.LastName,
                    Role = createdAdmin.Role.ToString(),
                    TenantId = createdAdmin.TenantId
                },
                AccessToken = accessToken,
                RefreshToken = refreshToken
            };
        }
        catch (Exception ex)
        {
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            activity?.SetTag(Telemetry.Tags.ErrorMessage, ex.Message);
            throw;
        }
    }

    public async Task<TenantResponse?> GetTenantByIdAsync(Guid tenantId)
    {
        using var activity = Telemetry.ActivitySource.StartActivity(Telemetry.Operations.TenantQuery);
        activity?.SetTag(Telemetry.Tags.TenantId, tenantId);
        activity?.SetTag("query.type", "by_id");

        try
        {
            var tenant = await _tenantRepository.GetByIdAsync(tenantId);
            if (tenant == null)
            {
                activity?.SetTag("query.result", "not_found");
                return null;
            }

            activity?.SetTag("query.result", "found");
            return MapToTenantResponse(tenant);
        }
        catch (Exception ex)
        {
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            activity?.SetTag(Telemetry.Tags.ErrorMessage, ex.Message);
            throw;
        }
    }

    public async Task<TenantResponse?> GetTenantBySlugAsync(string slug)
    {
        using var activity = Telemetry.ActivitySource.StartActivity(Telemetry.Operations.TenantQuery);
        activity?.SetTag("tenant.slug", slug);
        activity?.SetTag("query.type", "by_slug");

        try
        {
            var tenant = await _tenantRepository.GetBySlugAsync(slug);
            if (tenant == null)
            {
                activity?.SetTag("query.result", "not_found");
                return null;
            }

            activity?.SetTag("query.result", "found");
            activity?.SetTag(Telemetry.Tags.TenantId, tenant.Id);
            return MapToTenantResponse(tenant);
        }
        catch (Exception ex)
        {
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            activity?.SetTag(Telemetry.Tags.ErrorMessage, ex.Message);
            throw;
        }
    }

    public async Task<List<TenantResponse>> GetAllTenantsAsync()
    {
        using var activity = Telemetry.ActivitySource.StartActivity(Telemetry.Operations.TenantQuery);
        activity?.SetTag("query.type", "all");

        try
        {
            var tenants = await _tenantRepository.GetAllAsync();
            activity?.SetTag("result.count", tenants.Count);
            
            return tenants.Select(t => MapToTenantResponse(t)).ToList();
        }
        catch (Exception ex)
        {
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            activity?.SetTag(Telemetry.Tags.ErrorMessage, ex.Message);
            throw;
        }
    }

    public async Task<bool> UpdateTenantAsync(Guid tenantId, UpdateTenantRequest request)
    {
        using var activity = Telemetry.ActivitySource.StartActivity(Telemetry.Operations.TenantUpdate);
        activity?.SetTag(Telemetry.Tags.TenantId, tenantId);

        try
        {
            var tenant = await _tenantRepository.GetByIdAsync(tenantId);
            if (tenant == null)
            {
                activity?.SetTag("update.result", "not_found");
                return false;
            }

            // Update fields
            if (!string.IsNullOrEmpty(request.Description))
                tenant.Description = request.Description;

            if (!string.IsNullOrEmpty(request.Status) && Enum.TryParse<TenantStatus>(request.Status, out var status))
                tenant.Status = status;

            if (!string.IsNullOrEmpty(request.Tier) && Enum.TryParse<TenantTier>(request.Tier, out var tier))
            {
                tenant.Tier = tier;
                SetTenantLimits(tenant, tier);
            }

            tenant.UpdatedAt = DateTime.UtcNow;

            await _tenantRepository.UpdateAsync(tenant);
            activity?.SetTag("update.result", "success");
            return true;
        }
        catch (Exception ex)
        {
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            activity?.SetTag(Telemetry.Tags.ErrorMessage, ex.Message);
            throw;
        }
    }

    private static string GenerateSlug(string name)
    {
        // Convert to lowercase
        var slug = name.ToLowerInvariant();
        
        // Replace spaces and special chars with hyphens
        slug = Regex.Replace(slug, @"[^a-z0-9\s-]", "");
        slug = Regex.Replace(slug, @"\s+", "-");
        slug = Regex.Replace(slug, @"-+", "-");
        
        return slug.Trim('-');
    }

    private static void SetTenantLimits(Tenant tenant, TenantTier tier)
    {
        tenant.MaxStorageBytes = tier switch
        {
            TenantTier.Free => 1L * 1024 * 1024 * 1024,          // 1 GB
            TenantTier.Professional => 50L * 1024 * 1024 * 1024,  // 50 GB
            TenantTier.Enterprise => 500L * 1024 * 1024 * 1024,   // 500 GB
            _ => 1L * 1024 * 1024 * 1024
        };

        tenant.MaxUsers = tier switch
        {
            TenantTier.Free => 5,
            TenantTier.Professional => 50,
            TenantTier.Enterprise => 1000,
            _ => 5
        };

        tenant.MaxApiCallsPerDay = tier switch
        {
            TenantTier.Free => 1000,
            TenantTier.Professional => 50000,
            TenantTier.Enterprise => 1000000,
            _ => 1000
        };
    }

    private static int ExtractPort(string endpoint)
    {
        // Extract port from endpoint string like "http://localhost:6333"
        var match = Regex.Match(endpoint, @":(\d+)");
        return match.Success ? int.Parse(match.Groups[1].Value) : 6333;
    }

    private static TenantResponse MapToTenantResponse(Tenant tenant, TenantInfrastructure? infrastructure = null)
    {
        infrastructure ??= new TenantInfrastructure
        {
            DatabaseName = tenant.DatabaseName ?? "",
            QdrantEndpoint = $"http://localhost:{tenant.QdrantHttpPort}",
            MinioEndpoint = tenant.MinioEndpoint ?? "",
            MinioBucket = tenant.MinioBucketName ?? ""
        };

        return new TenantResponse
        {
            Id = tenant.Id,
            Name = tenant.Name,
            Description = tenant.Description,
            Slug = tenant.Slug,
            Status = tenant.Status.ToString(),
            Tier = tenant.Tier.ToString(),
            Infrastructure = infrastructure,
            CreatedAt = tenant.CreatedAt
        };
    }

    private static string GenerateRefreshToken()
    {
        var randomBytes = new byte[64];
        using var rng = System.Security.Cryptography.RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        return Convert.ToBase64String(randomBytes);
    }
}

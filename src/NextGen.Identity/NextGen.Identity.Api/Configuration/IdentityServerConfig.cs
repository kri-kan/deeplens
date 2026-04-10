using Duende.IdentityServer.Models;

namespace NextGen.Identity.Api.Configuration;

/// <summary>
/// Configuration for Duende IdentityServer clients, API resources, and scopes
/// </summary>
public static class IdentityServerConfig
{
    /// <summary>
    /// Identity resources (user profile information)
    /// </summary>
    public static IEnumerable<IdentityResource> IdentityResources =>
        new List<IdentityResource>
        {
            new IdentityResources.OpenId(),
            new IdentityResources.Profile(),
            new IdentityResources.Email(),
            new IdentityResource(
                name: "roles",
                userClaims: new[] { "role" },
                displayName: "User roles")
        };

    /// <summary>
    /// API scopes (permissions for API access)
    /// </summary>
    public static IEnumerable<ApiScope> ApiScopes =>
        new List<ApiScope>
        {
            new ApiScope(name: "deeplens.api", displayName: "DeepLens API"),
            new ApiScope(name: "deeplens.search", displayName: "DeepLens Search API"),
            new ApiScope(name: "deeplens.admin", displayName: "DeepLens Admin API"),
            new ApiScope(name: "deeplens.identity", displayName: "Identity Management API"),
            new ApiScope(name: "deeplens.impersonate", displayName: "Administrative Impersonation")
        };

    /// <summary>
    /// API resources (APIs that require authorization)
    /// </summary>
    public static IEnumerable<ApiResource> ApiResources =>
        new List<ApiResource>
        {
            new ApiResource("deeplens-api", "DeepLens API")
            {
                Scopes = { "deeplens.api", "deeplens.search", "deeplens.admin", "deeplens.identity", "deeplens.impersonate" },
                UserClaims = { "role", "email", "tenant_id", "act_as", "is_impersonated" }
            }
        };

    /// <summary>
    /// Clients that can access the identity server
    /// </summary>
    public static IEnumerable<Client> Clients =>
        new List<Client>
        {
            // DeepLens WebUI - SPA application (Development - Password Grant)
            new Client
            {
                ClientId = "deeplens-webui-dev",
                ClientName = "DeepLens Web UI (Development)",
                
                // Resource Owner Password for quick testing during development
                AllowedGrantTypes = GrantTypes.ResourceOwnerPassword,
                RequireClientSecret = false,
                
                // Scopes this client can access
                AllowedScopes = 
                {
                    "openid",
                    "profile",
                    "email",
                    "roles",
                    "deeplens.api",
                    "deeplens.search",
                    "deeplens.admin",
                    "deeplens.identity"
                },
                
                AllowedCorsOrigins = 
                { 
                    "http://localhost:3000",
                    "https://localhost:3000"
                },
                
                // Token lifetimes
                AccessTokenLifetime = 3600, // 1 hour
                IdentityTokenLifetime = 300, // 5 minutes
                RefreshTokenUsage = TokenUsage.ReUse,
                RefreshTokenExpiration = TokenExpiration.Sliding,
                SlidingRefreshTokenLifetime = 1296000, // 15 days
                
                // Enable refresh tokens
                AllowOfflineAccess = true,
                
                // Additional settings
                RequireConsent = false,
                AlwaysIncludeUserClaimsInIdToken = true,
                UpdateAccessTokenClaimsOnRefresh = true
            },

            // DeepLens WebUI - SPA application (Production - PKCE)
            new Client
            {
                ClientId = "deeplens-webui",
                ClientName = "DeepLens Web UI",
                
                // Authorization Code with PKCE (recommended for SPAs)
                AllowedGrantTypes = GrantTypes.Code,
                RequirePkce = true,
                RequireClientSecret = false, // SPA cannot securely store secrets
                
                // Where to redirect after login/logout
                RedirectUris = 
                { 
                    "http://localhost:3000/callback",
                    "http://localhost:3000/silent-renew",
                    "https://localhost:3000/callback",
                    "https://localhost:3000/silent-renew"
                },
                PostLogoutRedirectUris = 
                { 
                    "http://localhost:3000",
                    "https://localhost:3000"
                },
                AllowedCorsOrigins = 
                { 
                    "http://localhost:3000",
                    "https://localhost:3000"
                },
                
                // Scopes this client can access
                AllowedScopes = 
                {
                    "openid",
                    "profile",
                    "email",
                    "roles",
                    "deeplens.api",
                    "deeplens.search",
                    "deeplens.admin",
                    "deeplens.identity"
                },
                
                // Token lifetimes
                AccessTokenLifetime = 3600, // 1 hour
                IdentityTokenLifetime = 300, // 5 minutes
                RefreshTokenUsage = TokenUsage.ReUse,
                RefreshTokenExpiration = TokenExpiration.Sliding,
                SlidingRefreshTokenLifetime = 1296000, // 15 days
                
                // Enable refresh tokens
                AllowOfflineAccess = true,
                
                // Additional settings
                RequireConsent = false, // Don't show consent screen for first-party app
                AlwaysIncludeUserClaimsInIdToken = true,
                UpdateAccessTokenClaimsOnRefresh = true
            },
            
            // DeepLens Mobile App (future)
            new Client
            {
                ClientId = "deeplens-mobile",
                ClientName = "DeepLens Mobile App",
                
                AllowedGrantTypes = GrantTypes.Code,
                RequirePkce = true,
                RequireClientSecret = false,
                
                RedirectUris = 
                { 
                    "deeplens://callback",
                    "deeplens://silent-renew"
                },
                PostLogoutRedirectUris = { "deeplens://logout" },
                
                AllowedScopes = 
                {
                    "openid",
                    "profile",
                    "email",
                    "roles",
                    "deeplens.api",
                    "deeplens.search"
                },
                
                AccessTokenLifetime = 3600,
                AllowOfflineAccess = true,
                RequireConsent = false,
                AlwaysIncludeUserClaimsInIdToken = true
            },
            
            // Machine-to-Machine client (for service-to-service calls)
            new Client
            {
                ClientId = "deeplens-m2m",
                ClientName = "DeepLens Machine to Machine",
                ClientSecrets = { new Secret("deeplens-m2m-secret-change-in-production".Sha256()) },
                
                AllowedGrantTypes = GrantTypes.ClientCredentials,
                
                AllowedScopes = 
                {
                    "deeplens.api",
                    "deeplens.search",
                    "deeplens.admin"
                },
                
                AccessTokenLifetime = 3600
            },
            
            // API Gateway (for service-to-service authentication)
            new Client
            {
                ClientId = "deeplens-gateway",
                ClientName = "DeepLens API Gateway",
                ClientSecrets = { new Secret("deeplens-gateway-secret-change-in-production".Sha256()) },
                
                AllowedGrantTypes = GrantTypes.ClientCredentials,
                
                AllowedScopes = 
                {
                    "deeplens.api",
                    "deeplens.search",
                    "deeplens.admin",
                    "deeplens.identity"
                },
                
                AccessTokenLifetime = 3600
            }
        };
}

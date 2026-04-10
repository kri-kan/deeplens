using System.Diagnostics;

namespace NextGen.Identity.Data;

/// <summary>
/// Telemetry constants and activity source for NextGen.Identity
/// </summary>
public static class Telemetry
{
    public const string ServiceName = "NextGen.Identity";
    public const string ServiceVersion = "1.0.0";
    
    public static readonly ActivitySource ActivitySource = new(ServiceName, ServiceVersion);
    
    // Operation names
    public static class Operations
    {
        public const string DatabaseQuery = "db.query";
        public const string DatabaseCommand = "db.command";
        public const string UserAuthentication = "user.authenticate";
        public const string UserRegistration = "user.register";
        public const string TenantProvisioning = "tenant.provision";
        public const string TenantCreate = "tenant.create";
        public const string TenantUpdate = "tenant.update";
        public const string TenantQuery = "tenant.query";
        public const string TokenGeneration = "token.generate";
        public const string TokenValidation = "token.validate";
    }
    
    // Tag names
    public static class Tags
    {
        public const string TenantId = "tenant.id";
        public const string UserId = "user.id";
        public const string UserEmail = "user.email";
        public const string DbTable = "db.table";
        public const string DbOperation = "db.operation";
        public const string TokenType = "token.type";
        public const string ErrorCode = "error.code";
        public const string ErrorMessage = "error.message";
    }
}

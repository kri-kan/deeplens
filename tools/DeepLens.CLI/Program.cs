using System;
using BCrypt.Net;

namespace DeepLens.CLI;

public class Program
{
    public static void Main(string[] args)
    {
        if (args.Length == 0)
        {
            Console.WriteLine("Usage:");
            Console.WriteLine("  hash <password>");
            Console.WriteLine("  bootstrap-sql <admin_password> <tenant_password> <admin_id> <tenant_id>");
            Environment.Exit(1);
        }

        var command = args[0].ToLower();

        switch (command)
        {
            case "hash":
                if (args.Length < 2)
                {
                    Console.Error.WriteLine("Error: Password required.");
                    Environment.Exit(1);
                }
                Console.WriteLine(HashPassword(args[1]));
                break;

            case "bootstrap-sql":
                if (args.Length < 5)
                {
                    Console.Error.WriteLine("Error: Missing arguments for bootstrap-sql.");
                    Environment.Exit(1);
                }
                var sql = GenerateBootstrapSql(args[1], args[2], args[3], args[4]);
                Console.WriteLine(sql);
                break;

            default:
                Console.Error.WriteLine($"Unknown command: {command}");
                Environment.Exit(1);
                break;
        }
    }

    private static string HashPassword(string password)
    {
        return BCrypt.Net.BCrypt.HashPassword(password, 11);
    }

    private static string GenerateBootstrapSql(string adminPass, string tenantPass, string adminId, string tenantId)
    {
        var adminHash = HashPassword(adminPass);
        var tenantHash = HashPassword(tenantPass);

        return $@"
-- Needs cleaned up environment first
-- 1. Create Demo Tenant (Vayyari)
INSERT INTO tenants (id, name, slug, database_name, qdrant_container_name, qdrant_http_port, qdrant_grpc_port, minio_endpoint, minio_bucket_name, status, tier, created_at)
VALUES ('{tenantId}', 'Vayyari', 'vayyari', 'tenant_vayyari_metadata', 'deeplens-qdrant-Vayyari', 6433, 6434, 'http://localhost:9000', 'vayyari', 1, 1, NOW())
ON CONFLICT (id) DO NOTHING;

-- 2. Create Platform Admin Tenant
INSERT INTO tenants (id, name, slug, database_name, qdrant_container_name, qdrant_http_port, qdrant_grpc_port, minio_endpoint, minio_bucket_name, status, tier, created_at)
VALUES ('{adminId}', 'DeepLens Administration', 'admin', 'nextgen_identity', 'deeplens-qdrant', 6333, 6334, 'http://localhost:9000', 'platform-admin', 1, 3, NOW())
ON CONFLICT (id) DO NOTHING;

-- 3. Create Admin Users
INSERT INTO users (id, tenant_id, email, password_hash, first_name, last_name, role, is_active, created_at)
VALUES 
('9d1645f7-c93d-4c31-97f2-aed8c56275a5', '{adminId}', 'admin@deeplens.local', '{adminHash}', 'System', 'Admin', 2, true, NOW()),
('798f62b3-2828-45f0-8ba4-6dd94c1787ff', '{tenantId}', 'admin@vayyari.local', '{tenantHash}', 'Vayyari', 'Admin', 2, true, NOW())
ON CONFLICT (id) DO NOTHING;
";
    }
}

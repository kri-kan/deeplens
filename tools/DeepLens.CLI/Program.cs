using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using System.Net.Http.Json;
using Npgsql;
using BCrypt.Net;

namespace DeepLens.CLI;

public class Program
{
    private static string? _connectionString;
    private static string _host = "192.168.0.170";
    private static int _port = 5432;
    private static string _user = "postgres";
    private static string _pass = "Krikank1$";

    public static void Main(string[] args)
    {
        LoadEnv();

        if (args.Length == 0)
        {
            PrintUsage();
            Environment.Exit(1);
        }

        var command = args[0].ToLower();

        try
        {
            switch (command)
            {
                case "test-connection":
                    TestConnection();
                    break;

                case "init-db":
                    InitializeDatabases();
                    break;

                case "run-sql-file":
                    if (args.Length < 2) throw new ArgumentException("File path required.");
                    RunSqlFile(args[1]);
                    break;

                case "hash":
                    if (args.Length < 2) throw new ArgumentException("Password required.");
                    Console.WriteLine(BCrypt.Net.BCrypt.HashPassword(args[1], 11));
                    break;

                case "provision-tenant":
                    if (args.Length < 2) throw new ArgumentException("Tenant name required.");
                    ProvisionTenant(args[1]).Wait();
                    break;

                case "bootstrap-sql":
                    if (args.Length < 5) throw new ArgumentException("Admin PW, Tenant PW, Admin ID, and Tenant ID required.");
                    Console.WriteLine(GenerateBootstrapSql(args[1], args[2], args[3], args[4]));
                    break;

                default:
                    Console.Error.WriteLine($"Unknown command: {command}");
                    PrintUsage();
                    Environment.Exit(1);
                    break;
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Error: {ex.Message}");
            Environment.Exit(1);
        }
    }

    private static void PrintUsage()
    {
        Console.WriteLine("Usage:");
        Console.WriteLine("  test-connection                                Test connection to remote Postgres");
        Console.WriteLine("  init-db                                        Run all initialization scripts from setupscripts/application");
        Console.WriteLine("  run-sql-file <path>                            Run a specific SQL file (handles \\c database_name)");
        Console.WriteLine("  hash <password>                                Generate a BCrypt hash");
        Console.WriteLine("  bootstrap-sql <admin_pw> <tenant_pw> <a_id> <t_id> Generate bootstrap SQL");
    }

    private static void LoadEnv()
    {
        // Try to load from ../../infrastructure/.env
        var envPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "../../../infrastructure/.env");
        if (!File.Exists(envPath)) return;

        foreach (var line in File.ReadAllLines(envPath))
        {
            var parts = line.Split('=', 2);
            if (parts.Length != 2) continue;
            var key = parts[0].Trim();
            var val = parts[1].Trim();

            switch (key)
            {
                case "INFRA_HOST": _host = val; break;
                case "POSTGRES_PORT": int.TryParse(val, out _port); break;
                case "POSTGRES_USER": _user = val; break;
                case "POSTGRES_PASSWORD": _pass = val; break;
            }
        }
    }

    private static string GetConnString(string db = "postgres")
    {
        return $"Host={_host};Port={_port};Username={_user};Password={_pass};Database={db};Include Error Detail=true";
    }

    private static void TestConnection()
    {
        Console.WriteLine($"Testing connection to {_host}:{_port}...");
        using var conn = new NpgsqlConnection(GetConnString());
        conn.Open();
        using var cmd = new NpgsqlCommand("SELECT version()", conn);
        var version = cmd.ExecuteScalar();
        Console.WriteLine($"[OK] Connected to: {version}");
    }

    private static void RunSqlFile(string path, string initialDb = "postgres")
    {
        if (!File.Exists(path)) throw new FileNotFoundException("SQL file not found.", path);
        
        Console.WriteLine($"Executing SQL file: {Path.GetFileName(path)}");
        var content = File.ReadAllText(path);
        
        // Handle \c command for database switching
        var currentDb = initialDb;
        var blocks = content.Split(new[] { "\\c " }, StringSplitOptions.None);

        foreach (var block in blocks)
        {
            if (string.IsNullOrWhiteSpace(block)) continue;

            string sqlToRun;
            if (blocks.First() != block || content.StartsWith("\\c "))
            {
                var lines = block.Split(new[] { '\r', '\n' }, 2);
                var newDb = lines[0].Trim().TrimEnd(';');
                sqlToRun = lines.Length > 1 ? lines[1] : "";
                currentDb = newDb;
                Console.WriteLine($"Switching to database: {currentDb}");
            }
            else
            {
                sqlToRun = block;
            }

            if (string.IsNullOrWhiteSpace(sqlToRun)) continue;

            try 
            {
                ExecuteSql(sqlToRun, currentDb);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Warning in {currentDb}: {ex.Message}");
            }
        }
    }

    private static void ExecuteSql(string sql, string db)
    {
        using var conn = new NpgsqlConnection(GetConnString(db));
        conn.Open();
        
        using var cmd = new NpgsqlCommand(sql, conn);
        if (sql.TrimStart().StartsWith("SELECT", StringComparison.OrdinalIgnoreCase))
        {
            using var reader = cmd.ExecuteReader();
            var columns = new List<string>();
            for (int i = 0; i < reader.FieldCount; i++) columns.Add(reader.GetName(i));
            
            while (reader.Read())
            {
                var vals = new List<string>();
                for (int i = 0; i < reader.FieldCount; i++) vals.Add(reader[i]?.ToString() ?? "NULL");
                Console.WriteLine(string.Join(" | ", vals));
            }
        }
        else
        {
            var rows = cmd.ExecuteNonQuery();
            if (rows > 0) Console.WriteLine($"{rows} rows affected.");
        }
    }

    private static void InitializeDatabases()
    {
        // Navigate up from bin/Debug/netX.X/ (3 levels) + project folder (1 level) + tools folder (1 level)
        var baseDir = Path.GetFullPath(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "../../../../../setupscripts/application"));
        var serviceOrder = new[] { "identity", "tenant-manager", "deeplens-core", "search-api", "competitor-intel" };

        if (!Directory.Exists(baseDir))
        {
            // Try fallback for different execution contexts
            baseDir = Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "setupscripts/application"));
        }

        foreach (var service in serviceOrder)
        {
            var serviceDir = Path.Combine(baseDir, service);
            if (!Directory.Exists(serviceDir))
            {
                Console.WriteLine($"[WARNING] Service directory not found: {service}");
                continue;
            }

            Console.WriteLine($"\n>>> Initializing Service: {service}");
            var sqlFiles = Directory.GetFiles(serviceDir, "*.sql").OrderBy(f => f).ToList();
            
            foreach (var file in sqlFiles)
            {
                RunSqlFile(file);
                Console.WriteLine($"[SUCCESS] Executed {Path.GetFileName(file)}");
            }
        }
    }

    private static string GenerateBootstrapSql(string adminPass, string tenantPass, string adminId, string tenantId)
    {
        var adminHash = BCrypt.Net.BCrypt.HashPassword(adminPass, 11);
        var tenantHash = BCrypt.Net.BCrypt.HashPassword(tenantPass, 11);

        return $@"
-- 1. Create Demo Tenant (Vayyari)
INSERT INTO tenants (id, name, slug, database_name, qdrant_container_name, qdrant_http_port, qdrant_grpc_port, minio_endpoint, minio_bucket_name, status, tier, created_at)
VALUES ('{tenantId}', 'Vayyari', 'vayyari', 'tenant_vayyari_metadata', 'deeplens-qdrant', 6333, 6334, 'http://localhost:9000', 'vayyari', 1, 1, NOW())
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

    private static async System.Threading.Tasks.Task ProvisionTenant(string tenantName)
    {
        using var client = new System.Net.Http.HttpClient();
        var body = new
        {
            tenantName = tenantName,
            databaseName = $"tenant_{tenantName}_metadata",
            adminEmail = $"admin@{tenantName}.local",
            adminPassword = $"Krikank1$@{tenantName}123!",
            adminFirstName = "Vayyari",
            adminLastName = "Admin",
            minioEndpoint = $"{_host}:9000",
            minioBucket = tenantName
        };

        Console.WriteLine($"Registering tenant '{tenantName}' via Identity API...");
        var response = await client.PostAsJsonAsync("http://localhost:5198/api/tenant/provision", body);
        
        if (response.IsSuccessStatusCode)
        {
            var result = await response.Content.ReadAsStringAsync();
            Console.WriteLine($"[OK] Tenant registered: {result}");
        }
        else
        {
            var error = await response.Content.ReadAsStringAsync();
            Console.Error.WriteLine($"[FAIL] API error ({response.StatusCode}): {error}");
        }
    }
}

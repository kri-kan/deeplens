using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using Npgsql;
using BCrypt.Net;

namespace DeepLens.CLI;

/// <summary>
/// CLI tool for DeepLens administrative tasks. Single-tenant version.
/// </summary>
public class Program
{
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
        Console.WriteLine("DeepLens CLI - Single-Tenant Version");
        Console.WriteLine("Usage:");
        Console.WriteLine("  test-connection         Test connection to remote Postgres");
        Console.WriteLine("  init-db                 Run initialization scripts");
        Console.WriteLine("  run-sql-file <path>     Run a specific SQL file");
        Console.WriteLine("  hash <password>         Generate a BCrypt hash");
    }

    private static void LoadEnv()
    {
        var envPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "../../../setupscripts/.env");
        if (!File.Exists(envPath)) return;

        foreach (var line in File.ReadAllLines(envPath))
        {
            var parts = line.Split('=', 2);
            if (parts.Length != 2) continue;
            var key = parts[0].Trim();
            var val = parts[1].Trim();

            switch (key)
            {
                case "INFRA_IP": _host = val; break;
                case "POSTGRES_PORT": int.TryParse(val, out _port); break;
                case "INFRA_ADMIN_USER": _user = val; break;
                case "INFRA_ADMIN_PASSWORD": _pass = val; break;
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
                using var conn = new NpgsqlConnection(GetConnString(currentDb));
                conn.Open();
                using var cmd = new NpgsqlCommand(sqlToRun, conn);
                cmd.ExecuteNonQuery();
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Warning in {currentDb}: {ex.Message}");
            }
        }
    }

    private static void InitializeDatabases()
    {
        var baseDir = Path.GetFullPath(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "../../../../../setupscripts/application/search-api/arch"));
        if (!Directory.Exists(baseDir)) return;

        Console.WriteLine(">>> Initializing Platform Database Schema");
        var sqlFiles = Directory.GetFiles(baseDir, "*.sql").OrderBy(f => f).ToList();
        
        foreach (var file in sqlFiles)
        {
            RunSqlFile(file, "deeplens_platform");
            Console.WriteLine($"[SUCCESS] Executed {Path.GetFileName(file)}");
        }
    }
}

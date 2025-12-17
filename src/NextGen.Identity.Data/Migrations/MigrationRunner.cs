using Npgsql;

namespace NextGen.Identity.Data.Migrations;

/// <summary>
/// Simple SQL migration runner for executing migration scripts
/// </summary>
public class MigrationRunner
{
    private readonly string _connectionString;

    public MigrationRunner(string connectionString)
    {
        _connectionString = connectionString;
    }

    public async Task RunMigrationsAsync()
    {
        await EnsureMigrationTableExistsAsync();
        
        var migrationsToRun = await GetPendingMigrationsAsync();
        
        foreach (var migration in migrationsToRun)
        {
            await ExecuteMigrationAsync(migration);
        }
    }

    private async Task EnsureMigrationTableExistsAsync()
    {
        const string sql = @"
            CREATE TABLE IF NOT EXISTS __migrations (
                id SERIAL PRIMARY KEY,
                migration_name VARCHAR(255) NOT NULL UNIQUE,
                executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )";

        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(sql, connection);
        await command.ExecuteNonQueryAsync();
    }

    private async Task<List<string>> GetPendingMigrationsAsync()
    {
        // For now, return hardcoded list. In production, scan Migrations folder
        var allMigrations = new List<string>
        {
            "001_InitialSchema.sql"
        };

        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        const string sql = "SELECT migration_name FROM __migrations";
        await using var command = new NpgsqlCommand(sql, connection);
        await using var reader = await command.ExecuteReaderAsync();

        var executedMigrations = new HashSet<string>();
        while (await reader.ReadAsync())
        {
            executedMigrations.Add(reader.GetString(0));
        }

        return allMigrations.Where(m => !executedMigrations.Contains(m)).ToList();
    }

    private async Task ExecuteMigrationAsync(string migrationName)
    {
        var migrationSql = await GetMigrationSqlAsync(migrationName);

        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var transaction = await connection.BeginTransactionAsync();
        try
        {
            // Execute migration
            await using var command = new NpgsqlCommand(migrationSql, connection, transaction);
            await command.ExecuteNonQueryAsync();

            // Record migration
            const string recordSql = "INSERT INTO __migrations (migration_name) VALUES (@name)";
            await using var recordCommand = new NpgsqlCommand(recordSql, connection, transaction);
            recordCommand.Parameters.AddWithValue("name", migrationName);
            await recordCommand.ExecuteNonQueryAsync();

            await transaction.CommitAsync();
            Console.WriteLine($"✓ Executed migration: {migrationName}");
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    private async Task<string> GetMigrationSqlAsync(string migrationName)
    {
        // Load from embedded resource or file
        var assembly = typeof(MigrationRunner).Assembly;
        var resourceName = $"NextGen.Identity.Data.Migrations.{migrationName}";

        await using var stream = assembly.GetManifestResourceStream(resourceName);
        if (stream == null)
        {
            // Fallback to reading from file (development scenario)
            var basePath = AppDomain.CurrentDomain.BaseDirectory;
            var filePath = Path.Combine(basePath, "Migrations", migrationName);
            
            if (!File.Exists(filePath))
            {
                // Try relative to project root
                filePath = Path.Combine(Directory.GetCurrentDirectory(), "Migrations", migrationName);
            }

            if (File.Exists(filePath))
            {
                return await File.ReadAllTextAsync(filePath);
            }

            throw new FileNotFoundException($"Migration file not found: {migrationName}");
        }

        using var reader = new StreamReader(stream);
        return await reader.ReadToEndAsync();
    }
}

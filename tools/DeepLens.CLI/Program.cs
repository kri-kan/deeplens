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
    private static string _host = Environment.GetEnvironmentVariable("DEEPLENS_INFRA_HOST") ?? "localhost";
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

                case "import-instagram":
                    if (args.Length < 2) throw new ArgumentException("CSV file path required.");
                    ImportInstagramContacts(args[1]);
                    break;

                case "import-followers":
                    if (args.Length < 2) throw new ArgumentException("Followers directory path required.");
                    ImportFollowers(args[1]);
                    break;

                case "import-commenters":
                    if (args.Length < 2) throw new ArgumentException("Comments directory path required.");
                    ImportCommenters(args[1]);
                    break;

                case "import-liked-comments":
                    if (args.Length < 2) throw new ArgumentException("liked_comments.json file path required.");
                    ImportLikedCommentContacts(args[1]);
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
        Console.WriteLine("  import-instagram <csv>  Import parsed Instagram contacts CSV into Vayyari");
        Console.WriteLine("  import-followers <dir>  Import Instagram followers JSON files and mark as followers");
        Console.WriteLine("  import-commenters <dir>    Import Instagram post comment JSON files as contacts");
        Console.WriteLine("  import-liked-comments <file> Import liked_comments.json commenter usernames as contacts");
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

    private static readonly System.Text.RegularExpressions.Regex PINCODE_REGEX = new(@"\b[1-9]\d{5}\b");

    private static List<string> ParseCsvLine(string line)
    {
        var result = new List<string>();
        var inQuotes = false;
        var currentField = new System.Text.StringBuilder();

        for (int i = 0; i < line.Length; i++)
        {
            char c = line[i];
            if (c == '"')
            {
                inQuotes = !inQuotes;
            }
            else if (c == ',' && !inQuotes)
            {
                result.Add(currentField.ToString());
                currentField.Clear();
            }
            else
            {
                currentField.Append(c);
            }
        }
        result.Add(currentField.ToString());
        return result;
    }

    private static void ImportInstagramContacts(string csvPath)
    {
        if (!File.Exists(csvPath))
        {
            throw new FileNotFoundException("CSV file not found.", csvPath);
        }

        Console.WriteLine($"Reading contacts from CSV: {csvPath}");
        var lines = File.ReadAllLines(csvPath);
        if (lines.Length <= 1)
        {
            Console.WriteLine("No contacts to import.");
            return;
        }

        // Parse header to find column indices
        var headers = ParseCsvLine(lines[0]);
        int idxUsername = headers.FindIndex(h => h.Equals("username", StringComparison.OrdinalIgnoreCase));
        int idxPlatformAccountId = headers.FindIndex(h => h.Equals("platform_account_id", StringComparison.OrdinalIgnoreCase));
        int idxDisplayName = headers.FindIndex(h => h.Equals("display_name", StringComparison.OrdinalIgnoreCase));
        int idxFirstName = headers.FindIndex(h => h.Equals("first_name", StringComparison.OrdinalIgnoreCase));
        int idxLastName = headers.FindIndex(h => h.Equals("last_name", StringComparison.OrdinalIgnoreCase));
        int idxGender = headers.FindIndex(h => h.Equals("gender", StringComparison.OrdinalIgnoreCase));
        int idxPhone = headers.FindIndex(h => h.Equals("phone_number", StringComparison.OrdinalIgnoreCase));
        int idxIsFollower = headers.FindIndex(h => h.Equals("is_follower", StringComparison.OrdinalIgnoreCase));
        int idxFollowDate = headers.FindIndex(h => h.Equals("follow_date", StringComparison.OrdinalIgnoreCase));
        int idxEnquiryCount = headers.FindIndex(h => h.Equals("enquiry_count", StringComparison.OrdinalIgnoreCase));
        int idxOrdersCount = headers.FindIndex(h => h.Equals("orders_placed_count", StringComparison.OrdinalIgnoreCase));
        int idxNotes = headers.FindIndex(h => h.Equals("notes", StringComparison.OrdinalIgnoreCase));
        int idxFilePath = headers.FindIndex(h => h.Equals("file_path", StringComparison.OrdinalIgnoreCase));

        if (idxUsername == -1)
        {
            throw new InvalidOperationException("CSV header must contain 'username'.");
        }

        using var conn = new NpgsqlConnection(GetConnString("deeplens_platform"));
        conn.Open();
        Console.WriteLine("Connected to database. Starting import process...");

        int importedCount = 0;
        int updatedCount = 0;

        for (int i = 1; i < lines.Length; i++)
        {
            if (string.IsNullOrWhiteSpace(lines[i])) continue;
            var values = ParseCsvLine(lines[i]);
            if (values.Count <= idxUsername) continue;

            string username = values[idxUsername].Trim();
            if (string.IsNullOrWhiteSpace(username)) continue;

            if (username.StartsWith("ig_", StringComparison.OrdinalIgnoreCase))
            {
                username = username.Substring(3);
            }

            string platformAccountId = (idxPlatformAccountId != -1 && idxPlatformAccountId < values.Count) ? values[idxPlatformAccountId].Trim() : "";
            if (platformAccountId.StartsWith("ig_", StringComparison.OrdinalIgnoreCase))
            {
                platformAccountId = platformAccountId.Substring(3);
            }

            // Extract names
            string firstName = "";
            string lastName = "";
            string displayName = "";

            if (idxFirstName != -1 && idxFirstName < values.Count) firstName = values[idxFirstName].Trim();
            if (idxLastName != -1 && idxLastName < values.Count) lastName = values[idxLastName].Trim();
            if (idxDisplayName != -1 && idxDisplayName < values.Count) displayName = values[idxDisplayName].Trim();

            // Fallback split logic if first/last name are missing from the CSV
            if (string.IsNullOrWhiteSpace(firstName) && string.IsNullOrWhiteSpace(lastName) && !string.IsNullOrWhiteSpace(displayName))
            {
                var parts = displayName.Split(new[] { ' ' }, 2);
                if (parts.Length > 0) firstName = parts[0];
                if (parts.Length > 1) lastName = parts[1];
            }

            string gender = (idxGender != -1 && idxGender < values.Count) ? values[idxGender].Trim() : "Unknown";
            string phone = (idxPhone != -1 && idxPhone < values.Count) ? values[idxPhone].Trim() : "";
            string isFollower = (idxIsFollower != -1 && idxIsFollower < values.Count) ? values[idxIsFollower].Trim() : "No";
            string followDate = (idxFollowDate != -1 && idxFollowDate < values.Count) ? values[idxFollowDate].Trim() : "";
            
            int enquiries = 0;
            if (idxEnquiryCount != -1 && idxEnquiryCount < values.Count) int.TryParse(values[idxEnquiryCount], out enquiries);
            
            int orders = 0;
            if (idxOrdersCount != -1 && idxOrdersCount < values.Count) int.TryParse(values[idxOrdersCount], out orders);

            string csvNotes = (idxNotes != -1 && idxNotes < values.Count) ? values[idxNotes].Trim() : "";
            string filePath = (idxFilePath != -1 && idxFilePath < values.Count) ? values[idxFilePath].Trim() : "";

            // Compose internal notes summary
            var notesBuilder = new System.Text.StringBuilder();
            notesBuilder.AppendLine($"--- Instagram Import ({DateTime.Now:yyyy-MM-dd}) ---");
            notesBuilder.AppendLine($"Instagram Username: {username}");
            notesBuilder.AppendLine($"Follower: {isFollower}{(string.IsNullOrEmpty(followDate) ? "" : $" (Since: {followDate})")}");
            notesBuilder.AppendLine($"Enquiries count: {enquiries}");
            notesBuilder.AppendLine($"Estimated orders placed: {orders}");
            if (!string.IsNullOrWhiteSpace(csvNotes))
            {
                notesBuilder.AppendLine($"Imported notes: {csvNotes}");
            }
            if (!string.IsNullOrWhiteSpace(filePath))
            {
                notesBuilder.AppendLine($"Conversation thread path: {filePath}");
            }
            string importNotes = notesBuilder.ToString();

            // Look up existing Instagram Account in DB (by platform ID if present, else username)
            Guid? customerId = null;
            Guid? igAccountId = null;

            using (var cmd = new NpgsqlCommand(@"
                SELECT id, customer_id FROM instagram_accounts 
                WHERE (@PlatformAccountId <> '' AND platform_account_id = @PlatformAccountId)
                   OR username = @Username 
                LIMIT 1", conn))
            {
                cmd.Parameters.AddWithValue("PlatformAccountId", platformAccountId);
                cmd.Parameters.AddWithValue("Username", username);
                using var reader = cmd.ExecuteReader();
                if (reader.Read())
                {
                    igAccountId = reader.GetGuid(0);
                    if (!reader.IsDBNull(1)) customerId = reader.GetGuid(1);
                }
            }

            // Look up customer by phone number if not found by IG
            if (customerId == null && !string.IsNullOrWhiteSpace(phone))
            {
                using var cmd = new NpgsqlCommand("SELECT id FROM customers WHERE phone_number = @Phone LIMIT 1", conn);
                cmd.Parameters.AddWithValue("Phone", phone);
                var res = cmd.ExecuteScalar();
                if (res is Guid g)
                {
                    customerId = g;
                }
            }

            if (customerId == null)
            {
                // Get next dummy ID sequence
                int nextDummyId = 0;
                using (var cmd = new NpgsqlCommand("SELECT nextval('customer_dummy_id_seq')", conn))
                {
                    nextDummyId = Convert.ToInt32(cmd.ExecuteScalar());
                }

                // If first/last name are empty, assign dummy last name
                if (string.IsNullOrWhiteSpace(firstName) && string.IsNullOrWhiteSpace(lastName))
                {
                    lastName = $"cust{nextDummyId}";
                }

                customerId = Guid.NewGuid();

                // Create customer
                using (var cmd = new NpgsqlCommand(@"
                    INSERT INTO customers (id, customer_id, first_name, last_name, phone_number, instagram_id, email, notes, created_at, updated_at, gender)
                    VALUES (@Id, @CustomerId, @FirstName, @LastName, @Phone, @InstagramId, '', @Notes, NOW(), NOW(), @Gender)", conn))
                {
                    cmd.Parameters.AddWithValue("Id", customerId.Value);
                    cmd.Parameters.AddWithValue("CustomerId", nextDummyId);
                    cmd.Parameters.AddWithValue("FirstName", string.IsNullOrEmpty(firstName) ? (object)DBNull.Value : firstName);
                    cmd.Parameters.AddWithValue("LastName", lastName);
                    cmd.Parameters.AddWithValue("Phone", string.IsNullOrEmpty(phone) ? (object)DBNull.Value : phone);
                    cmd.Parameters.AddWithValue("InstagramId", username);
                    cmd.Parameters.AddWithValue("Notes", importNotes);
                    cmd.Parameters.AddWithValue("Gender", string.IsNullOrEmpty(gender) ? "Unknown" : gender);
                    cmd.ExecuteNonQuery();
                }

                // Insert or Update instagram account
                if (igAccountId == null)
                {
                    using var cmd = new NpgsqlCommand(@"
                        INSERT INTO instagram_accounts (id, platform, platform_account_id, username, full_name, profile_picture_url, first_seen_at, updated_at, customer_id, is_primary)
                        VALUES (gen_random_uuid(), 'instagram', @PlatformAccountId, @Username, @FullName, '', NOW(), NOW(), @CustomerId, true)", conn);
                    cmd.Parameters.AddWithValue("PlatformAccountId", string.IsNullOrEmpty(platformAccountId) ? (object)DBNull.Value : platformAccountId);
                    cmd.Parameters.AddWithValue("Username", username);
                    cmd.Parameters.AddWithValue("FullName", string.IsNullOrEmpty(displayName) ? username : displayName);
                    cmd.Parameters.AddWithValue("CustomerId", customerId.Value);
                    cmd.ExecuteNonQuery();
                }
                else
                {
                    using var cmd = new NpgsqlCommand(@"
                        UPDATE instagram_accounts 
                        SET customer_id = @CustomerId, 
                            username = @Username,
                            platform_account_id = COALESCE(NULLIF(platform_account_id, ''), NULLIF(@PlatformAccountId, '')),
                            is_primary = true, 
                            updated_at = NOW() 
                        WHERE id = @Id", conn);
                    cmd.Parameters.AddWithValue("CustomerId", customerId.Value);
                    cmd.Parameters.AddWithValue("Username", username);
                    cmd.Parameters.AddWithValue("PlatformAccountId", string.IsNullOrEmpty(platformAccountId) ? (object)DBNull.Value : platformAccountId);
                    cmd.Parameters.AddWithValue("Id", igAccountId.Value);
                    cmd.ExecuteNonQuery();
                }

                importedCount++;
            }
            else
            {
                // Update customer
                using (var cmd = new NpgsqlCommand(@"
                    UPDATE customers
                    SET first_name = COALESCE(NULLIF(first_name, ''), NULLIF(@FirstName, '')),
                        last_name = CASE 
                            WHEN last_name IS NULL OR last_name = '' OR last_name ~ '^cust\d+$' 
                            THEN COALESCE(NULLIF(@LastName, ''), last_name) 
                            ELSE last_name 
                        END,
                        phone_number = CASE 
                            WHEN NULLIF(@Phone, '') IS NOT NULL AND EXISTS (SELECT 1 FROM customers WHERE phone_number = @Phone AND id != @Id)
                            THEN phone_number
                            ELSE COALESCE(NULLIF(phone_number, ''), NULLIF(@Phone, ''))
                        END,
                        instagram_id = COALESCE(NULLIF(instagram_id, ''), NULLIF(@InstagramId, '')),
                        gender = COALESCE(NULLIF(gender, 'Unknown'), NULLIF(@Gender, 'Unknown')),
                        notes = CONCAT(notes, E'\n', @Notes),
                        updated_at = NOW()
                    WHERE id = @Id", conn))
                {
                    cmd.Parameters.AddWithValue("Id", customerId.Value);
                    cmd.Parameters.AddWithValue("FirstName", string.IsNullOrEmpty(firstName) ? (object)DBNull.Value : firstName);
                    cmd.Parameters.AddWithValue("LastName", string.IsNullOrEmpty(lastName) ? (object)DBNull.Value : lastName);
                    cmd.Parameters.AddWithValue("Phone", string.IsNullOrEmpty(phone) ? (object)DBNull.Value : phone);
                    cmd.Parameters.AddWithValue("InstagramId", username);
                    cmd.Parameters.AddWithValue("Gender", string.IsNullOrEmpty(gender) ? "Unknown" : gender);
                    cmd.Parameters.AddWithValue("Notes", importNotes);
                    cmd.ExecuteNonQuery();
                }

                bool hasPrimaryIg = false;
                using (var cmdCheck = new NpgsqlCommand("SELECT COUNT(1) FROM instagram_accounts WHERE customer_id = @CustomerId AND is_primary = true", conn))
                {
                    cmdCheck.Parameters.AddWithValue("CustomerId", customerId.Value);
                    hasPrimaryIg = Convert.ToInt64(cmdCheck.ExecuteScalar()) > 0;
                }

                // Link IG account if not linked
                if (igAccountId == null)
                {
                    using var cmd = new NpgsqlCommand(@"
                        INSERT INTO instagram_accounts (id, platform, platform_account_id, username, full_name, profile_picture_url, first_seen_at, updated_at, customer_id, is_primary)
                        VALUES (gen_random_uuid(), 'instagram', @PlatformAccountId, @Username, @FullName, '', NOW(), NOW(), @CustomerId, @IsPrimary)", conn);
                    cmd.Parameters.AddWithValue("PlatformAccountId", string.IsNullOrEmpty(platformAccountId) ? (object)DBNull.Value : platformAccountId);
                    cmd.Parameters.AddWithValue("Username", username);
                    cmd.Parameters.AddWithValue("FullName", string.IsNullOrEmpty(displayName) ? username : displayName);
                    cmd.Parameters.AddWithValue("CustomerId", customerId.Value);
                    cmd.Parameters.AddWithValue("IsPrimary", !hasPrimaryIg);
                    cmd.ExecuteNonQuery();
                }
                else
                {
                    using var cmd = new NpgsqlCommand(@"
                        UPDATE instagram_accounts 
                        SET customer_id = @CustomerId, 
                            username = @Username,
                            platform_account_id = COALESCE(NULLIF(platform_account_id, ''), NULLIF(@PlatformAccountId, '')),
                            is_primary = CASE WHEN @MakePrimary THEN true ELSE is_primary END, 
                            updated_at = NOW() 
                        WHERE id = @Id", conn);
                    cmd.Parameters.AddWithValue("CustomerId", customerId.Value);
                    cmd.Parameters.AddWithValue("Username", username);
                    cmd.Parameters.AddWithValue("PlatformAccountId", string.IsNullOrEmpty(platformAccountId) ? (object)DBNull.Value : platformAccountId);
                    cmd.Parameters.AddWithValue("MakePrimary", !hasPrimaryIg);
                    cmd.Parameters.AddWithValue("Id", igAccountId.Value);
                    cmd.ExecuteNonQuery();
                }

                updatedCount++;
            }

            // Save default address if phone number is present and customer has no default address
            if (!string.IsNullOrWhiteSpace(phone))
            {
                long addressCount = 0;
                using (var cmd = new NpgsqlCommand("SELECT COUNT(1) FROM customer_addresses WHERE customer_id = @CustomerId", conn))
                {
                    cmd.Parameters.AddWithValue("CustomerId", customerId.Value);
                    addressCount = Convert.ToInt64(cmd.ExecuteScalar());
                }

                if (addressCount == 0)
                {
                    string pincode = "";
                    var pinMatch = PINCODE_REGEX.Match(csvNotes);
                    if (pinMatch.Success) pincode = pinMatch.Value;

                    using var cmd = new NpgsqlCommand(@"
                        INSERT INTO customer_addresses (id, customer_id, name, phone, line1, pincode, is_default, created_at, updated_at)
                        VALUES (gen_random_uuid(), @CustomerId, @Name, @Phone, @Line1, @Pincode, true, NOW(), NOW())", conn);
                    cmd.Parameters.AddWithValue("CustomerId", customerId.Value);
                    cmd.Parameters.AddWithValue("Name", string.IsNullOrEmpty(firstName) ? "Default" : $"{firstName} {lastName}".Trim());
                    cmd.Parameters.AddWithValue("Phone", phone);
                    cmd.Parameters.AddWithValue("Line1", "Instagram Address");
                    cmd.Parameters.AddWithValue("Pincode", string.IsNullOrEmpty(pincode) ? "000000" : pincode);
                    cmd.ExecuteNonQuery();
                }
            }

            // Add preferred language 'en-in'
            using (var cmd = new NpgsqlCommand(@"
                INSERT INTO customer_languages (customer_id, language_code) 
                VALUES (@CustomerId, 'en-in') 
                ON CONFLICT (customer_id, language_code) DO NOTHING", conn))
            {
                cmd.Parameters.AddWithValue("CustomerId", customerId.Value);
                cmd.ExecuteNonQuery();
            }
        }

        Console.WriteLine($"[COMPLETE] Successfully processed CSV contacts.");
        Console.WriteLine($"Created: {importedCount} new customers");
        Console.WriteLine($"Updated/Merged: {updatedCount} existing customers");
    }
    private static void ImportFollowers(string dirPath)
    {
        if (!Directory.Exists(dirPath))
            throw new DirectoryNotFoundException($"Directory not found: {dirPath}");

        var files = Directory.GetFiles(dirPath, "followers*.json").OrderBy(f => f).ToList();
        if (files.Count == 0)
        {
            Console.WriteLine("No followers*.json files found in the directory.");
            return;
        }

        Console.WriteLine($"Found {files.Count} followers file(s). Connecting to database...");
        using var conn = new NpgsqlConnection(GetConnString("deeplens_platform"));
        conn.Open();
        Console.WriteLine("Connected. Starting follower import...");

        int newContacts = 0;
        int updatedContacts = 0;
        int totalFollowers = 0;
        int errors = 0;

        foreach (var file in files)
        {
            Console.WriteLine($"Processing: {Path.GetFileName(file)}");
            var json = File.ReadAllText(file);
            var entries = System.Text.Json.JsonDocument.Parse(json).RootElement;

            foreach (var entry in entries.EnumerateArray())
            {
                if (!entry.TryGetProperty("string_list_data", out var stringListData)) continue;

                foreach (var item in stringListData.EnumerateArray())
                {
                    try
                    {
                        string username = item.TryGetProperty("value", out var val) ? val.GetString() ?? "" : "";
                        if (string.IsNullOrWhiteSpace(username)) continue;

                        long timestamp = item.TryGetProperty("timestamp", out var ts) ? ts.GetInt64() : 0;
                        DateTime followedAt = timestamp > 0
                            ? DateTimeOffset.FromUnixTimeSeconds(timestamp).UtcDateTime
                            : DateTime.UtcNow;

                        totalFollowers++;

                        // --- Step 1: Find or create the instagram_account row ---
                        Guid? igAccountId = null;
                        Guid? customerId = null;

                        using (var cmd = new NpgsqlCommand(@"
                            SELECT id, customer_id FROM instagram_accounts
                            WHERE username = @Username
                            LIMIT 1", conn))
                        {
                            cmd.Parameters.AddWithValue("Username", username);
                            using var reader = cmd.ExecuteReader();
                            if (reader.Read())
                            {
                                igAccountId = reader.GetGuid(0);
                                if (!reader.IsDBNull(1)) customerId = reader.GetGuid(1);
                            }
                        }

                        if (igAccountId == null)
                        {
                            // New IG account — create a stub customer first
                            int nextDummyId = 0;
                            using (var cmd = new NpgsqlCommand("SELECT nextval('customer_dummy_id_seq')", conn))
                                nextDummyId = Convert.ToInt32(cmd.ExecuteScalar());

                            customerId = Guid.NewGuid();

                            // Parse username into first/last name by splitting on _ or .
                            var parts = username.Split(new[] { '_', '.' }, 2, StringSplitOptions.RemoveEmptyEntries);
                            string igFirstName = parts.Length > 0
                                ? char.ToUpper(parts[0][0]) + parts[0].Substring(1)
                                : username;
                            string? igLastName = parts.Length > 1
                                ? char.ToUpper(parts[1][0]) + parts[1].Substring(1)
                                : null;

                            using (var cmd = new NpgsqlCommand(@"
                                INSERT INTO customers (id, customer_id, first_name, last_name, instagram_id, notes, created_at, updated_at, gender)
                                VALUES (@Id, @CustomerId, @FirstName, @LastName, @InstagramId,
                                    @Notes, NOW(), NOW(), 'Unknown')", conn))
                            {
                                cmd.Parameters.AddWithValue("Id", customerId.Value);
                                cmd.Parameters.AddWithValue("CustomerId", nextDummyId);
                                cmd.Parameters.AddWithValue("FirstName", igFirstName);
                                cmd.Parameters.AddWithValue("LastName", igLastName != null ? (object)igLastName : DBNull.Value);
                                cmd.Parameters.AddWithValue("InstagramId", username);
                                cmd.Parameters.AddWithValue("Notes",
                                    $"--- Follower Import ({DateTime.Now:yyyy-MM-dd}) ---\nInstagram: {username}\nFollowed at: {followedAt:yyyy-MM-dd}");
                                cmd.ExecuteNonQuery();
                            }

                            igAccountId = Guid.NewGuid();
                            using (var cmd = new NpgsqlCommand(@"
                                INSERT INTO instagram_accounts
                                    (id, platform, username, full_name, profile_picture_url,
                                     first_seen_at, updated_at, customer_id, is_primary,
                                     is_follower, followed_at)
                                VALUES
                                    (@Id, 'instagram', @Username, @Username, '',
                                     NOW(), NOW(), @CustomerId, true,
                                     true, @FollowedAt)", conn))
                            {
                                cmd.Parameters.AddWithValue("Id", igAccountId.Value);
                                cmd.Parameters.AddWithValue("Username", username);
                                cmd.Parameters.AddWithValue("CustomerId", customerId.Value);
                                cmd.Parameters.AddWithValue("FollowedAt", followedAt);
                                cmd.ExecuteNonQuery();
                            }

                            // Add preferred language
                            using (var cmd = new NpgsqlCommand(@"
                                INSERT INTO customer_languages (customer_id, language_code)
                                VALUES (@CustomerId, 'en-in')
                                ON CONFLICT (customer_id, language_code) DO NOTHING", conn))
                            {
                                cmd.Parameters.AddWithValue("CustomerId", customerId.Value);
                                cmd.ExecuteNonQuery();
                            }

                            newContacts++;
                        }
                        else
                        {
                            // Existing IG account — mark as follower
                            using (var cmd = new NpgsqlCommand(@"
                                UPDATE instagram_accounts
                                SET is_follower = true,
                                    followed_at = COALESCE(followed_at, @FollowedAt),
                                    updated_at = NOW()
                                WHERE id = @Id", conn))
                            {
                                cmd.Parameters.AddWithValue("Id", igAccountId.Value);
                                cmd.Parameters.AddWithValue("FollowedAt", followedAt);
                                cmd.ExecuteNonQuery();
                            }

                            updatedContacts++;
                        }
                        // The DB trigger will propagate is_follower to the customers table automatically.
                    }
                    catch (Exception ex)
                    {
                        Console.Error.WriteLine($"  [WARN] Skipped entry: {ex.Message}");
                        errors++;
                    }
                }
            }
        }

        Console.WriteLine();
        Console.WriteLine($"[COMPLETE] Follower import finished.");
        Console.WriteLine($"  Total followers processed : {totalFollowers}");
        Console.WriteLine($"  New contacts created      : {newContacts}");
        Console.WriteLine($"  Existing contacts updated : {updatedContacts}");
        Console.WriteLine($"  Errors/skipped            : {errors}");
    }

    private static void ImportCommenters(string dirPath)
    {
        if (!Directory.Exists(dirPath))
            throw new DirectoryNotFoundException($"Directory not found: {dirPath}");

        var files = Directory.GetFiles(dirPath, "post_comments_*.json").OrderBy(f => f).ToList();
        if (files.Count == 0)
        {
            Console.WriteLine("No post_comments_*.json files found in the directory.");
            return;
        }

        Console.WriteLine($"Found {files.Count} comment file(s). Parsing commenters...");

        // Step 1: Parse all files and group by username → earliest timestamp
        var commenterFirstSeen = new Dictionary<string, DateTime>(StringComparer.OrdinalIgnoreCase);
        var commentRegex = new System.Text.RegularExpressions.Regex(@"^@([\w.]+)", System.Text.RegularExpressions.RegexOptions.Compiled);
        int totalEntries = 0;

        foreach (var file in files)
        {
            var json = System.IO.File.ReadAllText(file);
            var doc = System.Text.Json.JsonDocument.Parse(json);

            foreach (var entry in doc.RootElement.EnumerateArray())
            {
                if (!entry.TryGetProperty("string_map_data", out var smd)) continue;

                // Only process vayyari's replies on their own posts
                string mediaOwner = smd.TryGetProperty("Media Owner", out var mo)
                    ? mo.TryGetProperty("value", out var mov) ? mov.GetString() ?? "" : ""
                    : "";
                if (!mediaOwner.Equals("vayyari_fashions", StringComparison.OrdinalIgnoreCase) &&
                    !mediaOwner.Equals("vayyari_littles", StringComparison.OrdinalIgnoreCase) &&
                    !mediaOwner.Equals("editionsbyvayyari", StringComparison.OrdinalIgnoreCase) &&
                    !mediaOwner.Equals("vayyaristudio", StringComparison.OrdinalIgnoreCase))
                    continue;

                string commentText = smd.TryGetProperty("Comment", out var ct)
                    ? ct.TryGetProperty("value", out var ctv) ? ctv.GetString() ?? "" : ""
                    : "";

                long ts = smd.TryGetProperty("Time", out var time)
                    ? time.TryGetProperty("timestamp", out var tsv) ? tsv.GetInt64() : 0
                    : 0;

                DateTime commentedAt = ts > 0
                    ? DateTimeOffset.FromUnixTimeSeconds(ts).UtcDateTime
                    : DateTime.UtcNow;

                var match = commentRegex.Match(commentText.TrimStart());
                if (!match.Success) continue;

                string username = match.Groups[1].Value;
                if (string.IsNullOrWhiteSpace(username)) continue;

                totalEntries++;

                // Keep earliest timestamp per user
                if (!commenterFirstSeen.TryGetValue(username, out var existing) || commentedAt < existing)
                    commenterFirstSeen[username] = commentedAt;
            }
        }

        Console.WriteLine($"Unique commenters parsed: {commenterFirstSeen.Count}");
        Console.WriteLine("Connecting to database...");

        using var conn = new NpgsqlConnection(GetConnString("deeplens_platform"));
        conn.Open();
        Console.WriteLine("Connected. Importing contacts...");

        int newContacts = 0;
        int skipped = 0;
        int errors = 0;

        foreach (var kv in commenterFirstSeen)
        {
            string username = kv.Key;
            DateTime firstCommentedAt = kv.Value;

            try
            {
                // Check if this username already exists in instagram_accounts
                Guid? existingIgId = null;
                using (var cmd = new NpgsqlCommand(
                    "SELECT id FROM instagram_accounts WHERE username = @Username LIMIT 1", conn))
                {
                    cmd.Parameters.AddWithValue("Username", username);
                    var result = cmd.ExecuteScalar();
                    if (result != null && result != DBNull.Value)
                        existingIgId = (Guid)result;
                }

                if (existingIgId != null)
                {
                    skipped++;
                    continue;
                }

                // Create new customer
                int nextDummyId = 0;
                using (var cmd = new NpgsqlCommand("SELECT nextval('customer_dummy_id_seq')", conn))
                    nextDummyId = Convert.ToInt32(cmd.ExecuteScalar());

                var customerId = Guid.NewGuid();

                // Parse username into first/last name parts (split on _ or .)
                var parts = username.Split(new[] { '_', '.' }, 2, StringSplitOptions.RemoveEmptyEntries);
                string firstName = parts.Length > 0 && parts[0].Any(char.IsLetter)
                    ? char.ToUpper(parts[0][0]) + parts[0].Substring(1)
                    : username;
                string? lastName = parts.Length > 1 && parts[1].Any(char.IsLetter) && parts[1].Length >= 2
                    ? char.ToUpper(parts[1][0]) + parts[1].Substring(1)
                    : null;

                string notes = $"--- Comment Activity ({firstCommentedAt:yyyy-MM-dd}) ---\nInstagram: @{username}";

                using (var cmd = new NpgsqlCommand(@"
                    INSERT INTO customers
                        (id, customer_id, first_name, last_name, instagram_id, notes, created_at, updated_at, gender)
                    VALUES
                        (@Id, @CustomerId, @FirstName, @LastName, @InstagramId, @Notes, NOW(), NOW(), 'Unknown')", conn))
                {
                    cmd.Parameters.AddWithValue("Id", customerId);
                    cmd.Parameters.AddWithValue("CustomerId", nextDummyId);
                    cmd.Parameters.AddWithValue("FirstName", firstName);
                    cmd.Parameters.AddWithValue("LastName", lastName != null ? (object)lastName : DBNull.Value);
                    cmd.Parameters.AddWithValue("InstagramId", username);
                    cmd.Parameters.AddWithValue("Notes", notes);
                    cmd.ExecuteNonQuery();
                }

                // Create instagram_accounts row (is_follower = false by default)
                using (var cmd = new NpgsqlCommand(@"
                    INSERT INTO instagram_accounts
                        (id, platform, username, full_name, profile_picture_url,
                         first_seen_at, updated_at, customer_id, is_primary, is_follower)
                    VALUES
                        (@Id, 'instagram', @Username, @Username, '',
                         @FirstSeenAt, NOW(), @CustomerId, true, false)", conn))
                {
                    cmd.Parameters.AddWithValue("Id", Guid.NewGuid());
                    cmd.Parameters.AddWithValue("Username", username);
                    cmd.Parameters.AddWithValue("CustomerId", customerId);
                    cmd.Parameters.AddWithValue("FirstSeenAt", firstCommentedAt);
                    cmd.ExecuteNonQuery();
                }

                // Add preferred language
                using (var cmd = new NpgsqlCommand(@"
                    INSERT INTO customer_languages (customer_id, language_code)
                    VALUES (@CustomerId, 'en-in')
                    ON CONFLICT (customer_id, language_code) DO NOTHING", conn))
                {
                    cmd.Parameters.AddWithValue("CustomerId", customerId);
                    cmd.ExecuteNonQuery();
                }

                newContacts++;

                if (newContacts % 500 == 0)
                    Console.WriteLine($"  Progress: {newContacts} created, {skipped} skipped...");
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"  [WARN] Skipped @{username}: {ex.Message}");
                errors++;
            }
        }

        Console.WriteLine();
        Console.WriteLine($"[COMPLETE] Commenter import finished.");
        Console.WriteLine($"  Total unique commenters   : {commenterFirstSeen.Count}");
        Console.WriteLine($"  New contacts created      : {newContacts}");
        Console.WriteLine($"  Already existed/skipped   : {skipped}");
        Console.WriteLine($"  Errors/skipped            : {errors}");
    }

    private static void ImportLikedCommentContacts(string filePath)
    {
        if (!File.Exists(filePath))
            throw new FileNotFoundException($"File not found: {filePath}");

        Console.WriteLine($"Parsing: {Path.GetFileName(filePath)}");

        var json = File.ReadAllText(filePath);
        var doc = System.Text.Json.JsonDocument.Parse(json);

        if (!doc.RootElement.TryGetProperty("likes_comment_likes", out var likesArray))
            throw new InvalidDataException("Expected 'likes_comment_likes' array not found in JSON.");

        // Group by username → earliest timestamp
        var commenterFirstSeen = new Dictionary<string, DateTime>(StringComparer.OrdinalIgnoreCase);

        foreach (var entry in likesArray.EnumerateArray())
        {
            string username = entry.TryGetProperty("title", out var titleProp)
                ? titleProp.GetString() ?? ""
                : "";
            if (string.IsNullOrWhiteSpace(username)) continue;

            if (!entry.TryGetProperty("string_list_data", out var stringListData)) continue;

            foreach (var item in stringListData.EnumerateArray())
            {
                long ts = item.TryGetProperty("timestamp", out var tsProp) ? tsProp.GetInt64() : 0;
                DateTime likedAt = ts > 0
                    ? DateTimeOffset.FromUnixTimeSeconds(ts).UtcDateTime
                    : DateTime.UtcNow;

                if (!commenterFirstSeen.TryGetValue(username, out var existing) || likedAt < existing)
                    commenterFirstSeen[username] = likedAt;
            }
        }

        Console.WriteLine($"Unique commenters parsed: {commenterFirstSeen.Count}");
        Console.WriteLine("Connecting to database...");

        using var conn = new NpgsqlConnection(GetConnString("deeplens_platform"));
        conn.Open();
        Console.WriteLine("Connected. Importing contacts...");

        int newContacts = 0;
        int skipped = 0;
        int errors = 0;

        foreach (var kv in commenterFirstSeen)
        {
            string username = kv.Key;
            DateTime firstSeenAt = kv.Value;

            try
            {
                // Check if this username already exists
                Guid? existingIgId = null;
                using (var cmd = new NpgsqlCommand(
                    "SELECT id FROM instagram_accounts WHERE username = @Username LIMIT 1", conn))
                {
                    cmd.Parameters.AddWithValue("Username", username);
                    var result = cmd.ExecuteScalar();
                    if (result != null && result != DBNull.Value)
                        existingIgId = (Guid)result;
                }

                if (existingIgId != null)
                {
                    skipped++;
                    continue;
                }

                // Get next dummy ID
                int nextDummyId = 0;
                using (var cmd = new NpgsqlCommand("SELECT nextval('customer_dummy_id_seq')", conn))
                    nextDummyId = Convert.ToInt32(cmd.ExecuteScalar());

                var customerId = Guid.NewGuid();

                // Derive first/last name from username
                var parts = username.Split(new[] { '_', '.' }, 2, StringSplitOptions.RemoveEmptyEntries);
                string firstName = parts.Length > 0 && parts[0].Any(char.IsLetter)
                    ? char.ToUpper(parts[0][0]) + parts[0].Substring(1)
                    : username;
                string? lastName = parts.Length > 1 && parts[1].Any(char.IsLetter) && parts[1].Length >= 2
                    ? char.ToUpper(parts[1][0]) + parts[1].Substring(1)
                    : null;

                string notes = $"--- Liked Comment Activity ({firstSeenAt:yyyy-MM-dd}) ---\nInstagram: @{username}";

                // Create customer
                using (var cmd = new NpgsqlCommand(@"
                    INSERT INTO customers
                        (id, customer_id, first_name, last_name, instagram_id, notes, created_at, updated_at, gender)
                    VALUES
                        (@Id, @CustomerId, @FirstName, @LastName, @InstagramId, @Notes, NOW(), NOW(), 'Unknown')", conn))
                {
                    cmd.Parameters.AddWithValue("Id", customerId);
                    cmd.Parameters.AddWithValue("CustomerId", nextDummyId);
                    cmd.Parameters.AddWithValue("FirstName", firstName);
                    cmd.Parameters.AddWithValue("LastName", lastName != null ? (object)lastName : DBNull.Value);
                    cmd.Parameters.AddWithValue("InstagramId", username);
                    cmd.Parameters.AddWithValue("Notes", notes);
                    cmd.ExecuteNonQuery();
                }

                // Create instagram_accounts row (is_follower = false)
                using (var cmd = new NpgsqlCommand(@"
                    INSERT INTO instagram_accounts
                        (id, platform, username, full_name, profile_picture_url,
                         first_seen_at, updated_at, customer_id, is_primary, is_follower)
                    VALUES
                        (@Id, 'instagram', @Username, @Username, '',
                         @FirstSeenAt, NOW(), @CustomerId, true, false)", conn))
                {
                    cmd.Parameters.AddWithValue("Id", Guid.NewGuid());
                    cmd.Parameters.AddWithValue("Username", username);
                    cmd.Parameters.AddWithValue("CustomerId", customerId);
                    cmd.Parameters.AddWithValue("FirstSeenAt", firstSeenAt);
                    cmd.ExecuteNonQuery();
                }

                // Add preferred language
                using (var cmd = new NpgsqlCommand(@"
                    INSERT INTO customer_languages (customer_id, language_code)
                    VALUES (@CustomerId, 'en-in')
                    ON CONFLICT (customer_id, language_code) DO NOTHING", conn))
                {
                    cmd.Parameters.AddWithValue("CustomerId", customerId);
                    cmd.ExecuteNonQuery();
                }

                newContacts++;

                if (newContacts % 500 == 0)
                    Console.WriteLine($"  Progress: {newContacts} created, {skipped} skipped...");
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"  [WARN] Skipped @{username}: {ex.Message}");
                errors++;
            }
        }

        Console.WriteLine();
        Console.WriteLine("[COMPLETE] Liked-comment import finished.");
        Console.WriteLine($"  Total unique commenters   : {commenterFirstSeen.Count}");
        Console.WriteLine($"  New contacts created      : {newContacts}");
        Console.WriteLine($"  Already existed/skipped   : {skipped}");
        Console.WriteLine($"  Errors/skipped            : {errors}");
    }
}

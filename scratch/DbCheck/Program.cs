using System;
using System.Data;
using System.Threading.Tasks;
using Npgsql;

class Program {
    static async Task Main() {
        var connStr = "Host=192.168.0.170;Port=5432;Database=deeplens_platform;Username=postgres;Password=Krikank1$";
        try {
            using var conn = new NpgsqlConnection(connStr);
            await conn.OpenAsync();
            
            Console.WriteLine("--- History for kri_kan ---");
            using (var cmd = new NpgsqlCommand("SELECT h.job_id, h.status, h.items_processed, h.completed_at, w.username FROM scraper_history h JOIN competitor_watchlist w ON h.watchlist_id = w.id WHERE w.username = 'kri_kan' ORDER BY completed_at DESC LIMIT 1", conn))
            using (var reader = await cmd.ExecuteReaderAsync()) {
                if (await reader.ReadAsync()) {
                    Console.WriteLine($"JobID: {reader.GetGuid(0)}, Status: {reader.GetString(1)}, Items: {reader.GetInt32(2)}, Completed: {reader.GetDateTime(3)}, User: {reader.GetString(4)}");
                } else {
                    Console.WriteLine("No history found for kri_kan.");
                }
            }
            
            Console.WriteLine("\n--- Quota Usage ---");
            using (var cmd = new NpgsqlCommand("SELECT key, value FROM app_settings WHERE key = 'Meta:QuotaUsage'", conn)) {
                var result = await cmd.ExecuteScalarAsync();
                Console.WriteLine($"Quota Usage: {result ?? "Not found"}");
            }
            
        } catch (Exception e) {
            Console.WriteLine(e);
        }
    }
}

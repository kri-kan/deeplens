using Dapper;
using Npgsql;
using NUnit.Framework;
using FluentAssertions;

namespace Store.Api.Tests;

[TestFixture]
public class DatabaseMigrationTests
{
    private readonly string _storeConnStr = 
        Environment.GetEnvironmentVariable("STORE_DB_CONNECTION") 
        ?? "Host=192.168.0.170;Port=5432;Database=deeplens_store;Username=postgres;Password=Krikank1$";

    private readonly string _platformConnStr = 
        Environment.GetEnvironmentVariable("PLATFORM_DB_CONNECTION") 
        ?? "Host=192.168.0.170;Port=5432;Database=deeplens_platform;Username=postgres;Password=Krikank1$";

    [Test]
    public async Task StoreDb_ProductsTable_ContainsVariantAndLifecycleColumns()
    {
        await using var conn = new NpgsqlConnection(_storeConnStr);
        await conn.OpenAsync();

        var columns = (await conn.QueryAsync<string>(
            @"SELECT column_name 
              FROM information_schema.columns 
              WHERE table_schema = 'public' AND table_name = 'products';")).ToHashSet(StringComparer.OrdinalIgnoreCase);

        columns.Should().Contain("parent_catalog_id");
        columns.Should().Contain("catalog_color_group_id");
        columns.Should().Contain("parent_product_code");
        columns.Should().Contain("previous_lifecycle_status");
        columns.Should().Contain("take_down_expires_at");
        columns.Should().Contain("is_re_evaluation_pending");
    }

    [Test]
    public async Task StoreDb_ProductsTable_IndexesAndConstraints_AreConfigured()
    {
        await using var conn = new NpgsqlConnection(_storeConnStr);
        await conn.OpenAsync();

        var indexes = (await conn.QueryAsync<string>(
            @"SELECT indexname 
              FROM pg_indexes 
              WHERE schemaname = 'public' AND tablename = 'products';")).ToHashSet(StringComparer.OrdinalIgnoreCase);

        indexes.Should().Contain("idx_products_parent_color");
        indexes.Should().Contain("idx_products_parent_catalog_id");

        var constraints = (await conn.QueryAsync<string>(
            @"SELECT conname 
              FROM pg_constraint 
              WHERE conrelid = 'public.products'::regclass;")).ToHashSet(StringComparer.OrdinalIgnoreCase);

        constraints.Should().NotContain("products_vayyari_product_id_key", 
            "The 1:1 unique constraint on vayyari_product_id must be dropped to support multiple colorway variants per catalog product.");
    }

    [Test]
    public async Task StoreDb_ProductWaitlistsTable_ExistsWithExpectedSchema()
    {
        await using var conn = new NpgsqlConnection(_storeConnStr);
        await conn.OpenAsync();

        var tableExists = await conn.ExecuteScalarAsync<bool>(
            @"SELECT EXISTS (
                SELECT 1 
                FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'product_waitlists'
              );");

        tableExists.Should().BeTrue("product_waitlists table must exist");

        var columns = (await conn.QueryAsync<string>(
            @"SELECT column_name 
              FROM information_schema.columns 
              WHERE table_schema = 'public' AND table_name = 'product_waitlists';")).ToHashSet(StringComparer.OrdinalIgnoreCase);

        columns.Should().Contain("id");
        columns.Should().Contain("product_id");
        columns.Should().Contain("customer_id");
        columns.Should().Contain("created_at");

        var constraints = (await conn.QueryAsync<string>(
            @"SELECT conname 
              FROM pg_constraint 
              WHERE conrelid = 'public.product_waitlists'::regclass;")).ToHashSet(StringComparer.OrdinalIgnoreCase);

        constraints.Should().Contain("uq_product_waitlist_customer");
    }

    [Test]
    public async Task PlatformDb_ProductsTable_ContainsStorePublishUpdatedAtColumn()
    {
        await using var conn = new NpgsqlConnection(_platformConnStr);
        await conn.OpenAsync();

        var columns = (await conn.QueryAsync<string>(
            @"SELECT column_name 
              FROM information_schema.columns 
              WHERE table_schema = 'public' AND table_name = 'products';")).ToHashSet(StringComparer.OrdinalIgnoreCase);

        columns.Should().Contain("store_publish_updated_at");
    }
}

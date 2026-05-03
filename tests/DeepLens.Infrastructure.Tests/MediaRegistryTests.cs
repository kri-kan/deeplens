using NUnit.Framework;
using DeepLens.Infrastructure.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Caching.Memory;
using Moq;
using System;
using System.Threading.Tasks;
using System.Linq;
using System.Collections.Generic;
using Dapper;

namespace DeepLens.Infrastructure.Tests;

[TestFixture]
public class MediaRegistryTests
{
    private MetadataService _service = null!;
    private readonly string _testConnectionString = "Host=192.168.0.170;Port=5432;Database=deeplens_platform;Username=postgres;Password=Krikank1$";

    [SetUp]
    public void Setup()
    {
        var settings = new Dictionary<string, string?> {
            {"ConnectionStrings:DefaultConnection", _testConnectionString}
        };

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(settings)
            .Build();
        
        var loggerMock = new Mock<ILogger<MetadataService>>();
        var cache = new MemoryCache(new MemoryCacheOptions());
        
        _service = new MetadataService(configuration, loggerMock.Object, cache);
    }

    [Test]
    public async Task Test_MediaLinking_And_OrphanDetection()
    {
        // 1. Create a dummy media record
        var mediaId = Guid.NewGuid();
        using var db = new Npgsql.NpgsqlConnection(_testConnectionString);
        await db.OpenAsync();
        
        await db.ExecuteAsync(@"
            INSERT INTO media (id, storage_path, media_type, mime_type)
            VALUES (@Id, 'test/path.jpg', 1, 'image/jpeg')", new { Id = mediaId });

        try {
            // 2. Verify it's orphaned initially
            var initialOrphanCount = await _service.GetOrphanedMediaCountAsync();
            Assert.That(initialOrphanCount, Is.GreaterThanOrEqualTo(1));

            // 3. Link it to an entity
            var entityId = Guid.NewGuid();
            await _service.LinkMediaAsync(mediaId, entityId, "test_entity", true);

            // 4. Verify it's no longer orphaned
            var linkedOrphanCount = await _service.GetOrphanedMediaCountAsync();
            Assert.That(linkedOrphanCount, Is.EqualTo(initialOrphanCount - 1));

            // 5. Unlink it
            await _service.UnlinkMediaAsync(mediaId, entityId, "test_entity");

            // 6. Verify it's orphaned again
            var finalOrphanCount = await _service.GetOrphanedMediaCountAsync();
            Assert.That(finalOrphanCount, Is.EqualTo(initialOrphanCount));

            // 7. Trigger Cleanup and verify it's moved to deletion log
            var processed = await _service.TriggerMediaCleanupAsync();
            Assert.That(processed, Is.GreaterThanOrEqualTo(1));

            var inMediaTable = await db.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM media WHERE id = @Id", new { Id = mediaId });
            Assert.That(inMediaTable, Is.EqualTo(0));

            var inDeletionLog = await db.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM media_deletion_log WHERE media_id = @Id", new { Id = mediaId });
            Assert.That(inDeletionLog, Is.EqualTo(1));

        } finally {
            // Cleanup test data
            await db.ExecuteAsync("DELETE FROM media WHERE id = @Id", new { Id = mediaId });
            await db.ExecuteAsync("DELETE FROM media_links WHERE media_id = @Id", new { Id = mediaId });
            await db.ExecuteAsync("DELETE FROM media_deletion_log WHERE media_id = @Id", new { Id = mediaId });
        }
    }
}

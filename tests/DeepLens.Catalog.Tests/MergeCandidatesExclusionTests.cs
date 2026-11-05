using System;
using System.Linq;
using DeepLens.SearchApi.Controllers;
using DeepLens.WorkerService.Workers;
using Microsoft.Extensions.Logging;
using Moq;
using NUnit.Framework;

namespace DeepLens.Catalog.Tests;

[TestFixture]
public class MergeCandidatesExclusionTests
{
    [Test]
    public void PerceptualHashCache_InitSql_LoadsMediaPhashes()
    {
        string sql = PerceptualHashCache.InitSql;

        Assert.That(sql, Does.Contain("m.phash"), "PerceptualHashCache must select m.phash");
        Assert.That(sql, Does.Contain("ml.entity_type = 'product'"), "PerceptualHashCache must link to products");
    }

    [Test]
    public void WhatsAppProductController_MergeCandidatesSql_FiltersOutSoftDeletedAndArchivedProducts()
    {
        string sql = WhatsAppProductController.MergeCandidatesSql;

        Assert.That(sql, Does.Contain("pa.is_deleted"), "Product A must not be soft-deleted in merge queue");
        Assert.That(sql, Does.Contain("pa.is_archived"), "Product A must not be archived in merge queue");
        Assert.That(sql, Does.Contain("pb.is_deleted"), "Product B must not be soft-deleted in merge queue");
        Assert.That(sql, Does.Contain("pb.is_archived"), "Product B must not be archived in merge queue");
    }

    [Test]
    public void WhatsAppProductController_SimilarMatchesSql_ProjectsDeletedAndArchivedFlags()
    {
        string sql = WhatsAppProductController.SimilarMatchesSql;

        Assert.That(sql, Does.Contain("productAIsDeleted"), "Similar matches must project productAIsDeleted");
        Assert.That(sql, Does.Contain("productAIsArchived"), "Similar matches must project productAIsArchived");
        Assert.That(sql, Does.Contain("productBIsDeleted"), "Similar matches must project productBIsDeleted");
        Assert.That(sql, Does.Contain("productBIsArchived"), "Similar matches must project productBIsArchived");
    }

    [Test]
    public void WhatsAppProductController_SimilarMatchesSql_AllowsSuggestions_WithoutExcludingInactiveFromWhereClause()
    {
        string sql = WhatsAppProductController.SimilarMatchesSql;

        // In SimilarMatchesSql, we project the flags so the UI can render inactive candidates
        // as faded/badged suggestions, rather than filtering them out completely in the WHERE clause.
        Assert.That(sql, Does.Not.Contain("pa.is_deleted = false"), "SimilarMatchesSql must not hide soft-deleted candidates from suggestions");
        Assert.That(sql, Does.Not.Contain("pa.is_archived = false"), "SimilarMatchesSql must not hide archived candidates from suggestions");
        Assert.That(sql, Does.Not.Contain("pb.is_deleted = false"), "SimilarMatchesSql must not hide soft-deleted candidates from suggestions");
        Assert.That(sql, Does.Not.Contain("pb.is_archived = false"), "SimilarMatchesSql must not hide archived candidates from suggestions");
    }

    [Test]
    public void PerceptualHashCache_InitSql_RemainsLeanWithoutCarryingLifecycleFlags()
    {
        string sql = PerceptualHashCache.InitSql;

        // Media cache must remain lean (m.id, ml.entity_id as ProductId, m.phash, p.category)
        // without carrying product lifecycle flags per media row.
        Assert.That(sql, Does.Not.Contain("is_deleted"), "PerceptualHashCache must not track is_deleted per media");
        Assert.That(sql, Does.Not.Contain("is_archived"), "PerceptualHashCache must not track is_archived per media");
    }


    [Test]
    public void PerceptualHashCache_RemoveProduct_PurgesProductEntries()
    {
        var loggerMock = new Mock<ILogger<PerceptualHashCache>>();
        var cache = new PerceptualHashCache("Host=dummy", loggerMock.Object);

        var prodA = Guid.NewGuid();
        var prodB = Guid.NewGuid();
        cache.Add(Guid.NewGuid(), prodA, "hash1", "Sarees");
        cache.Add(Guid.NewGuid(), prodA, "hash2", "Sarees");
        cache.Add(Guid.NewGuid(), prodB, "hash3", "Sarees");

        Assert.That(cache.GetAll().Count(), Is.EqualTo(3));

        cache.RemoveProduct(prodA);

        var remaining = cache.GetAll().ToList();
        Assert.That(remaining.Count, Is.EqualTo(1));
        Assert.That(remaining[0].ProductId, Is.EqualTo(prodB));
    }
}

using System;
using System.Text.Json;
using DeepLens.Contracts.Events;
using NUnit.Framework;

namespace DeepLens.Catalog.Tests;

[TestFixture]
public class StorePublishContractsTests
{
    [Test]
    public void StoreProductPublishRequestedEvent_SerializesWithCamelCase()
    {
        var evt = new StoreProductPublishRequestedEvent(
            Guid.NewGuid(),
            Guid.NewGuid(),
            "sync_updates",
            Guid.NewGuid(),
            "VF69F5",
            "admin@deep-lens.ai",
            DateTime.UtcNow
        );

        var json = JsonSerializer.Serialize(evt);
        Assert.That(json, Does.Contain("\"eventId\":"));
        Assert.That(json, Does.Contain("\"jobId\":"));
        Assert.That(json, Does.Contain("\"action\":\"sync_updates\""));
        Assert.That(json, Does.Contain("\"productCode\":\"VF69F5\""));
        Assert.That(json, Does.Contain("\"requestedBy\":\"admin@deep-lens.ai\""));

        var deserialized = JsonSerializer.Deserialize<StoreProductPublishRequestedEvent>(json);
        Assert.That(deserialized, Is.Not.Null);
        Assert.That(deserialized!.EventId, Is.EqualTo(evt.EventId));
        Assert.That(deserialized.Action, Is.EqualTo(evt.Action));
    }

    [Test]
    public void StoreProductSyncCompletedEvent_SerializesWithCamelCase()
    {
        var evt = new StoreProductSyncCompletedEvent(
            Guid.NewGuid(),
            Guid.NewGuid(),
            "sync_updates",
            Guid.NewGuid(),
            "VF69F5",
            true,
            "media_updated",
            DateTime.UtcNow,
            6,
            DateTime.UtcNow
        );

        var json = JsonSerializer.Serialize(evt);
        Assert.That(json, Does.Contain("\"isReviewPending\":true"));
        Assert.That(json, Does.Contain("\"reviewReason\":\"media_updated\""));
        Assert.That(json, Does.Contain("\"syncedMediaCount\":6"));

        var deserialized = JsonSerializer.Deserialize<StoreProductSyncCompletedEvent>(json);
        Assert.That(deserialized, Is.Not.Null);
        Assert.That(deserialized!.IsReviewPending, Is.True);
        Assert.That(deserialized.ReviewReason, Is.EqualTo("media_updated"));
    }
}

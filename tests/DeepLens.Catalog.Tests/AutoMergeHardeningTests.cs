using System;
using System.Collections.Generic;
using DeepLens.WorkerService.Workers;
using NUnit.Framework;

namespace DeepLens.Catalog.Tests;

[TestFixture]
public class AutoMergeHardeningTests
{
    [Test]
    public void PriceGuard_WhenPricesDifferSubstantially_RejectsAutoMerge()
    {
        // Example from requirement: ₹549 vs ₹950
        decimal sourcePrice = 549m;
        decimal targetPrice = 950m;

        bool isCompatible = WhatsAppGroupWorker.IsPriceCompatible(sourcePrice, targetPrice, WhatsAppGroupWorker.MAX_PRICE_TOLERANCE);

        Assert.That(isCompatible, Is.False, "₹549 vs ₹950 should be rejected because relative difference is > 20%");
    }

    [Test]
    public void PriceGuard_WhenPricesWithinTolerance_AllowsAutoMerge()
    {
        // Example within 20% (e.g. ₹550 vs ₹500, diff is 50/550 = 9.1%)
        decimal sourcePrice = 500m;
        decimal targetPrice = 550m;

        bool isCompatible = WhatsAppGroupWorker.IsPriceCompatible(sourcePrice, targetPrice, WhatsAppGroupWorker.MAX_PRICE_TOLERANCE);

        Assert.That(isCompatible, Is.True, "₹500 vs ₹550 should be accepted within 20% tolerance");
    }

    [Test]
    public void PriceGuard_WhenIdenticalPrices_AllowsAutoMerge()
    {
        decimal sourcePrice = 950m;
        decimal targetPrice = 950m;

        bool isCompatible = WhatsAppGroupWorker.IsPriceCompatible(sourcePrice, targetPrice, WhatsAppGroupWorker.MAX_PRICE_TOLERANCE);

        Assert.That(isCompatible, Is.True);
    }

    [Test]
    public void PriceGuard_WhenEitherPriceMissing_AllowsAutoMerge()
    {
        // If price is not available on one or both sides, sanity check does not block
        Assert.That(WhatsAppGroupWorker.IsPriceCompatible(null, 950m), Is.True);
        Assert.That(WhatsAppGroupWorker.IsPriceCompatible(549m, null), Is.True);
        Assert.That(WhatsAppGroupWorker.IsPriceCompatible(null, null), Is.True);
        Assert.That(WhatsAppGroupWorker.IsPriceCompatible(0m, 950m), Is.True);
    }

    [Test]
    public void AutoMergeCriteria_MegaGroup2Votes_RejectsDueToLowRatio()
    {
        // Mega group with 10 photos matching 2 photos of Product A
        int totalPhotos = 10;
        int closeVotes = 2; // flat 2 votes
        double ratio = (double)closeVotes / totalPhotos; // 20%

        bool passesFloor = closeVotes >= WhatsAppGroupWorker.AUTO_MERGE_MIN_VOTES;
        bool passesRatio = ratio >= WhatsAppGroupWorker.AUTO_MERGE_MIN_RATIO;

        Assert.That(passesFloor, Is.True, "2 close votes passes floor of 2");
        Assert.That(passesRatio, Is.False, "20% ratio must fail 60% minimum ratio threshold");
        Assert.That(passesFloor && passesRatio, Is.False, "Mega group with only 2 votes must be REJECTED to stop runaway domino merges");
    }

    [Test]
    public void AutoMergeCriteria_TwoPhotoProductBothMatching_Passes()
    {
        // Typical product with 2 photos, both matching
        int totalPhotos = 2;
        int closeVotes = 2;
        double ratio = (double)closeVotes / totalPhotos; // 100%

        bool passesFloor = closeVotes >= WhatsAppGroupWorker.AUTO_MERGE_MIN_VOTES;
        bool passesRatio = ratio >= WhatsAppGroupWorker.AUTO_MERGE_MIN_RATIO;

        Assert.That(passesFloor, Is.True);
        Assert.That(passesRatio, Is.True);
        Assert.That(passesFloor && passesRatio, Is.True);
    }

    [Test]
    public void AutoMergeCriteria_ThreePhotoProductTwoMatching_Passes()
    {
        // 3 photos with 2 matches (66.7% >= 60%)
        int totalPhotos = 3;
        int closeVotes = 2;
        double ratio = (double)closeVotes / totalPhotos; // 66.7%

        bool passesFloor = closeVotes >= WhatsAppGroupWorker.AUTO_MERGE_MIN_VOTES;
        bool passesRatio = ratio >= WhatsAppGroupWorker.AUTO_MERGE_MIN_RATIO;

        Assert.That(passesFloor, Is.True);
        Assert.That(passesRatio, Is.True);
        Assert.That(passesFloor && passesRatio, Is.True);
    }

    [Test]
    public void AutoMergeCriteria_FourPhotoProductTwoMatching_RejectsDueToRatio()
    {
        // 4 photos with 2 matches (50% < 60%)
        int totalPhotos = 4;
        int closeVotes = 2;
        double ratio = (double)closeVotes / totalPhotos; // 50%

        bool passesFloor = closeVotes >= WhatsAppGroupWorker.AUTO_MERGE_MIN_VOTES;
        bool passesRatio = ratio >= WhatsAppGroupWorker.AUTO_MERGE_MIN_RATIO;

        Assert.That(passesFloor, Is.True);
        Assert.That(passesRatio, Is.False, "50% is less than 60% threshold");
        Assert.That(passesFloor && passesRatio, Is.False);
    }

    [Test]
    public void AutoMergeCriteria_SinglePhotoGroup_RejectsDueToFloor()
    {
        // 1 photo group matching 1 photo
        int closeVotes = 1;

        bool passesFloor = closeVotes >= WhatsAppGroupWorker.AUTO_MERGE_MIN_VOTES;

        Assert.That(passesFloor, Is.False, "Single photo group cannot auto-merge (requires floor of at least 2)");
    }

    [Test]
    public void PerceptualHashCache_RemoveMedia_PurgesDeduplicatedMedia()
    {
        var cache = new PerceptualHashCache("Server=dummy", new Moq.Mock<Microsoft.Extensions.Logging.ILogger<PerceptualHashCache>>().Object);
        var mediaId1 = Guid.NewGuid();
        var mediaId2 = Guid.NewGuid();
        var prodId = Guid.NewGuid();

        cache.Add(mediaId1, prodId, "hash1", "Sarees");
        cache.Add(mediaId2, prodId, "hash2", "Sarees");

        Assert.That(cache.GetAll().Count(), Is.EqualTo(2));

        cache.RemoveMedia(new[] { mediaId1 });

        var remaining = cache.GetAll().ToList();
        Assert.That(remaining.Count, Is.EqualTo(1));
        Assert.That(remaining[0].MediaId, Is.EqualTo(mediaId2));
    }
}

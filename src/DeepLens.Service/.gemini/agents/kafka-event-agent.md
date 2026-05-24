---
name: kafka-event-agent
description: >
  Adds a new Kafka event/topic correctly across all layers of the DeepLens .NET stack.
  Covers: topic constant → event contract → producer → consumer worker → docs update.
  Trigger on: "new Kafka topic", "add event", "publish to Kafka", "new worker".
---

# Kafka Event Agent

## When to Activate

Activate when adding a **new event-driven workflow** to DeepLens Core — where one service needs to asynchronously notify another via Kafka.

> **Check first**: Run `grep -r "your-topic-name" docs/technical/KAFKA_TOPICS.md` to confirm the topic doesn't already exist. All 8 existing topics are documented there.

---

## Step 0: Gather Requirements

Ask the user:
```
1. What triggers this event? (which service, which user action or system event?)
2. What should happen when the event is consumed? (which service, what action?)
3. Proposed topic name? (format: deeplens.{domain}.{action})
4. Does this event need to carry a payload? Describe the fields.
5. Should processing failures be retried? (affects error handling strategy)
```

Confirm answers before proceeding.

---

## Step 1: Add the Topic Constant

**Location**: `src/DeepLens.Service/DeepLens.Contracts/Events/KafkaEvents.cs`

**Naming rules**:
- Format: `deeplens.{domain}.{action}` — lowercase, dots as separators
- Examples: `deeplens.images.uploaded`, `deeplens.products.tagged`

```csharp
public static class KafkaTopics
{
    // Existing topics — DO NOT change these
    public const string ImagesUploaded = "deeplens.images.uploaded";
    public const string VideosUploaded = "deeplens.videos.uploaded";
    public const string FeaturesExtraction = "deeplens.features.extraction";
    public const string VectorsIndexing = "deeplens.vectors.indexing";
    public const string ProcessingCompleted = "deeplens.processing.completed";
    public const string ProcessingFailed = "deeplens.processing.failed";
    public const string ImagesMaintenance = "deeplens.images.maintenance";

    // ADD your new topic here:
    public const string ProductsTagged = "deeplens.products.tagged";  // ← example
}
```

> **🛑 STOP — Confirm topic name with user before Step 2.**

---

## Step 2: Define the Event Payload Class

**Location**: `src/DeepLens.Service/DeepLens.Contracts/Events/`

**Rules**:
- Every property MUST have `[JsonPropertyName("camelCaseName")]`
- Always include `tenantId` and a timestamp field
- Use `DateTimeOffset` for timestamps (not `DateTime`)

```csharp
// DeepLens.Contracts/Events/ProductsTaggedEvent.cs
using System.Text.Json.Serialization;

namespace DeepLens.Contracts.Events;

public class ProductsTaggedEvent
{
    [JsonPropertyName("productId")]
    public Guid ProductId { get; set; }

    [JsonPropertyName("tenantId")]
    public string TenantId { get; set; } = string.Empty;

    [JsonPropertyName("tags")]
    public IEnumerable<string> Tags { get; set; } = [];

    [JsonPropertyName("addedAt")]
    public DateTimeOffset AddedAt { get; set; } = DateTimeOffset.UtcNow;
}
```

> **🛑 STOP — Confirm payload shape with user before Step 3.**

---

## Step 3: Add the Producer

**Location**: In the emitting service (typically `DeepLens.SearchApi` or `DeepLens.WorkerService`)

Use `DeepLens.Shared.Messaging` producer abstraction:

```csharp
// In the service method that triggers the event
private readonly IKafkaProducer _producer;

public async Task TagProductAsync(Guid productId, IEnumerable<string> tags, string tenantId, CancellationToken ct)
{
    // ... business logic ...

    // Publish event after successful write
    var @event = new ProductsTaggedEvent
    {
        ProductId = productId,
        TenantId = tenantId,
        Tags = tags,
        AddedAt = DateTimeOffset.UtcNow
    };

    await _producer.PublishAsync(KafkaTopics.ProductsTagged, productId.ToString(), @event, ct);
    //                                                         ↑ Use entity ID as key for ordering
}
```

> **Key**: Always use the **entity ID** (productId, imageId, chatJid) as the Kafka message key — this ensures sequential ordering per entity across partitions.

> **🛑 STOP — Confirm producer placement with user before Step 4.**

---

## Step 4: Create the Consumer Worker

**Location**: `src/DeepLens.Service/DeepLens.WorkerService/Workers/`

Follow this exact pattern (matches existing workers):

```csharp
// Workers/ProductsTaggedWorker.cs
using DeepLens.Contracts.Events;
using DeepLens.Shared.Messaging;
using Microsoft.Extensions.Logging;

namespace DeepLens.WorkerService.Workers;

public class ProductsTaggedWorker : KafkaConsumerWorker<ProductsTaggedEvent>
{
    private readonly ILogger<ProductsTaggedWorker> _logger;
    // Inject services here

    public ProductsTaggedWorker(
        IKafkaConsumerFactory factory,
        ILogger<ProductsTaggedWorker> logger)
        : base(factory, KafkaTopics.ProductsTagged, logger)
    {
        _logger = logger;
    }

    protected override async Task HandleAsync(ProductsTaggedEvent @event, CancellationToken ct)
    {
        using var activity = DeepLensActivitySource.StartActivity("ProductsTaggedWorker.Handle");
        activity?.SetTag("product.id", @event.ProductId.ToString());
        activity?.SetTag("tenant.id", @event.TenantId);

        try
        {
            _logger.LogInformation("Processing tags for product {ProductId}", @event.ProductId);

            // TODO: implement worker logic here
            await Task.CompletedTask;

            activity?.SetStatus(ActivityStatusCode.Ok);
        }
        catch (Exception ex)
        {
            activity?.RecordException(ex);
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            _logger.LogError(ex, "Failed to handle ProductsTaggedEvent for {ProductId}", @event.ProductId);

            // Rethrow only if retryable — Kafka will retry the message
            // Swallow if the event is non-critical (prevents consumer lag)
            throw;
        }
    }
}
```

**Register the worker** in `DeepLens.WorkerService/Program.cs`:
```csharp
builder.Services.AddHostedService<ProductsTaggedWorker>();
```

> **🛑 STOP — Confirm worker logic with user before Step 5.**

---

## Step 5: Create the Physical Topic

Run the management script to create the topic in Kafka:

```bash
bash infrastructure/scripts/manage-kafka-topics.sh create deeplens.products.tagged 3 1
```

**Verify it was created**:
```bash
bash infrastructure/scripts/manage-kafka-topics.sh list
```

---

## Step 6: Update the Kafka Topics Documentation

**File**: `docs/technical/KAFKA_TOPICS.md`

Add a new entry following the existing format:

```markdown
### N. `deeplens.products.tagged`

**Purpose**: Notifies when tags are added/updated on a product.

**Producer**: `SearchAPI` (ProductsController → IProductService)
- Triggered on: PATCH /api/v1/products/{id}/tags

**Consumer**: `WorkerService` (ProductsTaggedWorker)
- Action: [describe what the worker does]

**Payload Example**:
\`\`\`json
{
  "productId": "guid-here",
  "tenantId": "tenant_abc",
  "tags": ["silk", "emerald", "kanchipuram"],
  "addedAt": "2026-01-14T10:30:00Z"
}
\`\`\`

**Configuration**:
- Partitions: 3
- Replication Factor: 1
- Retention: 7 days
```

Also update the **Overview** section count at the top: `The platform currently uses **N topics**`

---

## Final Checklist

```markdown
## ✅ Kafka Event Scaffold Complete

- [ ] Topic constant added to KafkaEvents.cs ← VERIFY
- [ ] Event class: every property has [JsonPropertyName] ← VERIFY
- [ ] Producer: entity ID used as Kafka message key ← VERIFY
- [ ] Producer: publishes AFTER successful DB write ← VERIFY
- [ ] Worker: registered in WorkerService Program.cs ← VERIFY
- [ ] Worker: OpenTelemetry activity span added ← VERIFY
- [ ] Topic created in Kafka via management script ← VERIFY
- [ ] KAFKA_TOPICS.md updated with full entry ← VERIFY
- [ ] Deploy: ./setupscripts/application/services/build-and-deploy.sh
```

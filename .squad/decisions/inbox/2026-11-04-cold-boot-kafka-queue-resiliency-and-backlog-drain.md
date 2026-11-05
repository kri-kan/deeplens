# Architectural Decision Record: Cold Boot Kafka Queue Resiliency & High-Throughput Backlog Drain

- **Date:** 2026-11-04
- **Author:** Krishna (Squad Lead)
- **Status:** Accepted & Deployed
- **Subsystems Affected:** `whatsapp-processor`, `DeepLens.WorkerService`, `Infrastructure Docker Compose`

## 1. Problem Statement
Following physical host reboots on Nov 3 (07:16 IST) and Nov 4 (15:19 IST) caused by power outages, the DeepLens catalog stopped receiving new products. Over 4,250 WhatsApp messages (including ~1,400 vendor photos) accumulated in `wa.messages` with `processing_status = 'ready'`.

### Root Cause Analysis
1. **Container vs Reboot**: The containers did NOT crash from software bugs or OOM. The host lost physical power (`journalctl -b -2` cut off abruptly at 07:09 IST; `journalctl -b -1` cut off abruptly at 14:54 IST).
2. **Kafka Cold-Boot Race Condition**: When Docker started all containers simultaneously upon boot, Kafka KRaft controller initialization took 15–20s. `MessageProcessingQueue.initialize()` wrapped connection in a strict 10s `Promise.race`. When the timeout fired, it permanently disabled message grouping with no retry mechanism.
3. **Queue Drainage Bottleneck**: Artificial 500ms `MESSAGE_DELAY_MS` and low default `BATCH_SIZE = 10` delayed queue drain.
4. **PerceptualHashCache Cold-Boot Failure**: PostgreSQL WAL crash recovery on cold boot returned `57P03: the database system is starting up`. `PerceptualHashCache.cs` set `_isInitialized = 1` prior to connection, permanently failing cache initialization without retry.
5. **Silent Health Check**: `/health` endpoint previously hardcoded `{ status: 'ok' }` masking pipeline deadlocks from Docker monitors.

## 2. Architecture Decisions & Implemented Changes

### A. Automatic Reconnection & Event-Driven Healing (`message-queue.service.ts`)
- Implemented `connectWithRetry()` with exponential backoff (2s up to 15s) executing asynchronously in background.
- Attached `CRASH` and `DISCONNECT` event listeners to Kafka consumer and producer to trigger automatic reconnect upon broker restarts.
- Optimized backlog throughput: set default `MESSAGE_DELAY_MS = 0` (local Kafka), `BATCH_SIZE = 50`, `POLL_INTERVAL = 2000ms`.
- Added immediate `setImmediate(poll)` chaining when a full batch is returned to drain backlogs continuously.

### B. Product Write-Back & DeepLens Integration Hardening
- Hardened `ProductCreatedConsumerService` and `DeepLensIntegrationService` with background retry loops and disconnect event listeners.

### C. Cold-Boot Database Resilience (`PerceptualHashCache.cs` & `WhatsAppGroupWorker.cs`)
- Added 10-attempt retry loop with 3s backoff in `PerceptualHashCache.InitializeAsync`.
- Added `EnsureInitializedAsync` lazy initialization check before processing Kafka messages in `WhatsAppGroupWorker.cs`.

### D. Deep Health Checking & Docker Integration
- Enhanced `/health` endpoint in `src/whatsapp-processor/src/index.ts` to verify database `SELECT 1`, `messageQueue.isHealthy()`, and `productCreatedConsumer.isHealthy()`.
- Added Docker healthcheck in `setupscripts/application/whatsapp/docker-compose.yaml`.

## 3. Verification & Results
- Deployed via `./infrastructure/deploy.sh worker-service` and `./infrastructure/deploy.sh whatsapp-processor`.
- Container `deeplens-whatsapp-default-vayyari` status: `Up (healthy)`.
- Health endpoint `http://127.0.0.1:3005/health` returns `HTTP 200` with `status: "healthy"`.
- Drained all 4,251 backlogged messages from `ready` to `processed`.
- `public.products` creation resumed immediately; new catalog products created and verified in PostgreSQL.

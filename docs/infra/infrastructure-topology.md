# DeepLens & Store Infrastructure Topology

## Overview
This document outlines the core infrastructure topology, networking, storage, messaging, and multi-tenant database partitioning across the unified DeepLens monorepo.

## 1. Port Allocations & Services

| Service / Component | Port | Protocol | Description |
|---|---|---|---|
| **DeepLens.SearchApi** | 5000 | HTTP | Core DeepLens search and catalog REST API (.NET 8) |
| **DeepLens.WorkerService** | 5001 | HTTP / Internal | Background ingestion, OCR, MinIO sync worker (.NET 8) |
| **NextGen.Identity** | 5002 | HTTP | Authentication, JWT, RBAC service (.NET 8) |
| **DeepLens.ReasoningService**| 8000 | HTTP / FastAPI | Python LLM/VLM reasoning & extraction service |
| **Store.Api** | 5005 | HTTP | Stateless e-commerce customer-facing API (.NET 8) |
| **Vayyari (Web Preview)** | 8081 | HTTP | Expo / Tamagui admin and catalog mobile/web app |
| **Store (Preview / Web)** | 8082 | HTTP | Expo / Tamagui customer-facing e-commerce app |
| **Storybook (Store UI)** | 6006 | HTTP | Isolated UI component workbench |
| **PostgreSQL** | 5432 | TCP | Primary database server |
| **Redis** | 6379 | TCP | Distributed caching, session store, rate limiting |
| **MinIO (S3 API)** | 9000 | HTTP | Object storage for product media, catalogs, raw assets |
| **MinIO (Console)** | 9001 | HTTP | MinIO Web Management Console |
| **Kafka Broker** | 9092 | TCP | High-throughput distributed event streaming broker |
| **Zookeeper** | 2181 | TCP | Kafka cluster coordination |

---

## 2. Multi-Tenancy & Database Topology (PostgreSQL)

The monorepo operates with dedicated schema and database boundaries on PostgreSQL 16:

- **`deeplens_db`**:
  - `public.media_items`: Master catalog media, embeddings, image hashes, OCR text.
  - `public.skus`, `public.variants`: SKU hierarchy, vendor mappings, competitor price match.
  - `public.competitor_snapshots`: Historical prices and competitor metadata.
  - `public.whatsapp_messages`: Staging and sync for WhatsApp catalog ingestion.

- **`store_db`**:
  - `store.products`: Public facing product entries, slugs, SEO tags, localized copy.
  - `store.orders`, `store.order_items`: Customer orders, payment states, delivery timelines.
  - `store.customers`, `store.customer_addresses`: Customer identity, saved addresses, preferences.
  - `store.carts`, `store.cart_items`: Ephemeral and persistent session shopping carts.
  - `store.campaigns`, `store.promotions`: Marketing campaigns, discount codes, banner assets.

---

## 3. Object Storage (MinIO S3)

- **`deeplens-media`**: Master high-resolution product photography, WhatsApp raw images, competitor screenshot archives.
- **`store-assets`**: Optimized WebP/AVIF images, CDN-ready thumbnails, promotional hero banners, swatch previews.
- **Access Policies**: Public read on `store-assets/public/*`, Presigned URLs for authenticated admin upload workflows.

---

## 4. Message Bus & Event Streaming (Apache Kafka)

Key topics connecting DeepLens Admin, Ingestion Workers, and Store.Api:

- `deeplens.catalog.sku-updated`: Published by DeepLens when SKU data/pricing changes. Consumed by Store.Api to update read models.
- `deeplens.media.processed`: Triggered after thumbnail and vibrancy generation.
- `store.order.created`: Published by Store.Api on checkout. Consumed by DeepLens ERP/fulfillment workers.
- `store.inventory.reserved`: Stock reservation lock events during checkout.

---

## 5. CI/CD & Deployment Pipeline

- **Stateless Backend Publishing**:
  ```bash
  dotnet publish src/services/Store.Api/Store.Api.csproj -c Release -o /data/hosting/Store.Api --no-restore
  ```
- **Container Management**:
  Docker compose configurations live in `/home/krikan/productivity/deeplens/infrastructure/docker-compose.yml`.
- **Zero-Downtime Deployment**:
  Binaries published to `/data/hosting/{service}`, followed by container restart:
  ```bash
  docker compose restart {service}
  ```

# DeepLens Codebase & API Guide

**Technical reference for the DeepLens source code, project structure, and service endpoints.**

Last Updated: December 20, 2025

---

## 📂 Project Structure

### .NET Microservices (`src/`)
DeepLens is built using a clean architecture pattern across multiple services:

- **NextGen.Identity**: Centralized authentication and tenant management.
  - `.Core`: Domain models (Tenant, User, Token).
  - `.Data`: Dapper-based repositories, PostgreSQL migrations, and stored procedures for provisioning.
  - `.Api`: REST endpoints for login, profile management, and tenant provisioning.
- **DeepLens (Platform)**:
  - `.SearchApi`: High-traffic semantic search and image ingestion.
  - `.AdminApi`: Resource management and analytics.
  - `.WorkerService`: Background Kafka consumers for feature extraction and indexing.
  - `.Infrastructure`: Multi-tenant drivers for Qdrant, MinIO (Shared Bucket Strategy), and Kafka.
- **Shared Libraries**:
  - `.Shared.Common`: Cross-cutting utilities.
  - `.Shared.Messaging`: Kafka producers and abstract event handlers.
  - `.Shared.Telemetry`: Standardized OpenTelemetry configuration.

### Python AI Services (`src/`)
- **DeepLens.FeatureExtractionService**: FastAPI service using ResNet50/CLIP for vectorizing images.

### Frontend (`src/`)
- **DeepLens.WebUI**: React/TypeScript dashboard for administrators and tenants.

---

## 🔌 API Reference Summary

### Identity Service (Port 5198)
| Endpoint          | Method   | Purpose                               |
| :---------------- | :------- | :------------------------------------ |
| `/api/auth/login` | POST     | Authenticate and get JWT.             |
| `/api/tenants`    | GET/POST | List and provision new organizations. |

### Search & Ingestion Service (Port 5002)
| Endpoint                              | Method | Purpose                                            |
| :------------------------------------ | :----- | :------------------------------------------------- |
| `/api/v1/ingest/upload`               | POST   | Single image upload with metadata.                 |
| `/api/v1/ingest/bulk`                 | POST   | Parallel bulk ingestion with LLM-based enrichment. |
| `/api/v1/catalog/merge`               | POST   | Merge source SKU into target with image dedupe.    |
| `/api/v1/catalog/images/{id}/default` | PATCH  | Set primary image for quick sharing.               |
| `/api/v1/search`                      | POST   | Semantic image-to-image/text similarity search.    |

### Feature Extraction (Port 8001)
| Endpoint   | Method | Purpose                             |
| :--------- | :----- | :---------------------------------- |
| `/health`  | GET    | Check model status.                 |
| `/extract` | POST   | Raw image-to-vector transformation. |

---

## 🛠️ Implementation Details

### Data Access (Dapper)
We use pure Dapper with raw SQL for the Identity service to ensure maximum performance. 
Example Repository pattern:
```csharp
public async Task<User?> GetByEmailAsync(string email) {
    const string sql = "SELECT * FROM users WHERE email = @Email";
    return await connection.QuerySingleOrDefaultAsync<User>(sql, new { Email = email });
}
```

### Telemetry (OpenTelemetry)
Every critical operation is wrapped in an `Activity`. Traces flow from the `ApiGateway` into the `SearchApi`, through `Kafka`, and finally into the `Worker` and `AI Service`.

---

## 📋 Roadmap
- [x] Identity API & Tenant Provisioning.
- [ ] Kafka Core Integration.
- [ ] Multi-Modal Search (Text-to-Image).
- [ ] Real-time WebSocket notifications.

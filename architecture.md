# DeepLens Enterprise Architecture Documentation

## 🏗️ Architectural Vision
DeepLens is built on **Clean Architecture** principles to ensure high maintainability, testability, and scalability. The system is designed as a modular monolith in the backend and a service-isolated mobile application in the frontend.

---

## 🏛️ Backend Architecture (.NET 9)

We follow the **Onion Architecture** pattern to isolate core business logic from external infrastructure concerns.

### 1. **DeepLens.Domain**
- **Purpose**: Pure business entities, value objects, and domain logic.
- **Constraints**: ZERO dependencies on any other project or external framework (outside of basic .NET types).

### 2. **DeepLens.Application**
- **Purpose**: Use cases, business rule orchestration (Commands/Queries), and abstractions.
- **Core Patterns**: 
  - **CQRS**: Implemented via **MediatR**. Controllers send commands; handlers perform logic.
  - **Result Pattern**: We use `Result<T>` and `Error` value objects instead of exceptions for business validation results.
- **Dependencies**: Depends only on `Domain` and `Shared.Common`.

### 3. **DeepLens.Infrastructure**
- **Purpose**: External integrations and persistence implementations.
- **Responsibilities**:
  - **Persistence**: SQL handling via Dapper and `IDbConnectionFactory`.
  - **Storage**: MinIO SDK integrations.
  - **Messaging**: Kafka producers.
  - **ID Generation**: Dedicated `SequencedIdGenerator`.
- **Dependencies**: Depends on `Application` and `Domain`.

### 4. **DeepLens.SearchApi (API Layer)**
- **Purpose**: Entry point, HTTP configuration, and request/response mapping.
- **Best Practice**: Controllers are "thin" - they simply dispatch commands to MediatR and return standardized HTTP responses.
- **Dependencies**: Depends on `Application`, `Contracts`, and `Infrastructure` (for DI registration).

---

## 📱 Mobile Architecture (React Native / Expo)

### 1. **Service Layer Isolation**
- Screens and components NEVER call the `ApiClient` directly.
- They consume **Service Wrappers** (e.g., `productService.ts`) which handle business-level data transformation and error handling.

### 2. **Centralized Route Registry**
- All API endpoints are defined in `constants/api-routes.ts`. 
- No hardcoded strings are allowed in service files.

### 3. **Type Safety**
- Shared types reside in the `types/` directory (e.g., `types/products.ts`).
- Component props are strictly typed to avoid "prop drilling" uncertainty.

---

## 🛠️ Cross-Cutting Concerns

### 1. **Error Handling**
- **Backend**: Standardized `Error` records + Global exception middleware.
- **Frontend**: `ApiException` wrapper with standardized codes for UI-level messaging.

### 2. **Telemetry**
- **Tracing**: Custom `wrapInSpan` utility for distributed tracing (ready for OpenTelemetry).
- **Logging**: Structured logging via `ILogger` in backend and classified logs in frontend console.

---

## 📋 Refactoring Manifest (Done)
- [x] Implemented `Result<T>` pattern for flow control.
- [x] Decoupled `IdGeneratorService` God-class into `SequencedIdGenerator` (Infra) and `IOrderRepository`.
- [x] Modularized project registration via `AddApplication()` and `AddInfrastructure()`.
- [x] Extracted DTOs to `DeepLens.Contracts` for cross-layer safety.
- [x] Federated Instagram logic to `DeepLens.Application`.
- [x] Unified product types in React Native.

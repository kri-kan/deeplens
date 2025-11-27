# DeepLens Image Similarity Service - Development Plan

**Project:** Core Image Similarity Search Service  
**Start Date:** November 27, 2025  
**Status:** Planning Phase  
**Architecture:** Hybrid .NET + Python Microservices

---

## 🎯 Project Overview

Build a production-ready image similarity search service using:
- **.NET 8** for APIs, orchestration, and business logic
- **Python (FastAPI)** for AI/ML feature extraction and vector operations
- **Qdrant** for vector storage and similarity search
- **PostgreSQL** for metadata persistence
- **Redis** for caching
- **Kafka** for event-driven processing

---

## 📋 Current Status

### ✅ Completed
- [x] Architecture review and decision
- [x] Security strategy (hybrid JWT approach)
- [x] Service boundaries definition
- [x] Technology stack confirmation

### 🔄 In Progress
- [ ] Development plan creation
- [ ] ADR documentation

### ⏳ Upcoming
- [ ] Python Feature Extraction Service implementation
- [ ] Python Vector Similarity Service implementation

---

## 🗓️ Development Timeline (12 Weeks)

### **Phase 1A: Python Core Services (Weeks 1-2)**

**Goal:** Working AI/ML services without authentication

#### Week 1: Feature Extraction Service
- **Day 1-2:** Project setup & dependencies
  - FastAPI project structure
  - ONNX Runtime setup
  - Docker container configuration
  
- **Day 3-4:** ResNet50 implementation
  - Model loading from ONNX
  - Image preprocessing pipeline
  - Feature extraction endpoint
  
- **Day 5:** Testing & optimization
  - Unit tests with pytest
  - Performance benchmarks
  - Error handling

**Deliverables:**
- ✅ Working `/extract-features` endpoint
- ✅ ResNet50 model inference
- ✅ Docker image
- ✅ Unit tests

#### Week 2: Vector Similarity Service
- **Day 1-2:** Qdrant integration
  - Qdrant client setup
  - Collection management
  - Vector indexing
  
- **Day 3-4:** Similarity algorithms
  - Cosine similarity implementation
  - Search endpoints
  - Batch operations
  
- **Day 5:** Testing & documentation
  - Unit tests
  - Integration tests
  - API documentation

**Deliverables:**
- ✅ Working `/index-vector` endpoint
- ✅ Working `/search-similar` endpoint
- ✅ Qdrant integration
- ✅ Unit tests

---

### **Phase 1B: .NET Service Layer (Weeks 3-4)**

**Goal:** .NET services that orchestrate Python microservices

#### Week 3: Domain & Application Layers
- **Day 1-2:** Domain layer
  - Entities (ImageEntity)
  - Value objects (FeatureVector, ImageMetadata, ImageHash)
  - Domain logic
  
- **Day 3-4:** Application layer
  - Interfaces (IFeatureExtractionClient, ISimilaritySearchService)
  - Use cases (SearchSimilarImagesUseCase, ExtractFeaturesUseCase)
  - DTOs and mapping
  
- **Day 5:** Testing
  - Domain unit tests
  - Application layer tests

**Deliverables:**
- ✅ DeepLens.Similarity.Domain project
- ✅ DeepLens.Similarity.Application project
- ✅ DeepLens.Similarity.Contracts project
- ✅ Unit tests (xUnit)

#### Week 4: Infrastructure & API
- **Day 1-2:** Infrastructure layer
  - HTTP clients to Python services
  - EF Core repositories
  - Redis caching
  
- **Day 3-4:** API layer
  - REST endpoints
  - Request validation
  - Response mapping
  
- **Day 5:** Integration testing
  - End-to-end tests
  - Docker Compose setup
  - Integration tests

**Deliverables:**
- ✅ DeepLens.Similarity.Infrastructure project
- ✅ DeepLens.Similarity.Api project
- ✅ Working end-to-end flow
- ✅ Docker Compose environment

---

### **Phase 2A: Authentication & Security (Weeks 5-6)**

**Goal:** JWT-based authentication for all services

#### Week 5: Python Service Authentication
- **Day 1-2:** JWT validation middleware
  - PyJWT integration
  - JWKS fetching
  - Token validation
  
- **Day 3-4:** Optional auth mode
  - Environment variable configuration
  - Development vs production modes
  - Token parsing and claims extraction
  
- **Day 5:** Testing with auth
  - Auth integration tests
  - Mock JWT tokens
  - Error scenarios

**Deliverables:**
- ✅ JWT validation in Python services
- ✅ Optional auth mode (ENABLE_AUTH flag)
- ✅ Integration tests with auth

#### Week 6: .NET Authentication Integration
- **Day 1-2:** IdentityServer integration
  - JWT validation in .NET API
  - Token forwarding to Python services
  - User context extraction
  
- **Day 3-4:** Authorization policies
  - Scope-based authorization
  - Tenant isolation
  - Admin permissions
  
- **Day 5:** End-to-end auth testing
  - Full authentication flow tests
  - Authorization tests
  - Token refresh scenarios

**Deliverables:**
- ✅ JWT authentication in .NET API
- ✅ Token propagation to Python services
- ✅ Authorization policies
- ✅ Integration tests

---

### **Phase 2B: Advanced Features (Weeks 7-8)**

**Goal:** Enhanced AI capabilities and performance optimization

#### Week 7: Multiple Model Support
- **Day 1-3:** CLIP integration
  - CLIP model loading
  - Text-to-image search
  - Multi-modal features
  
- **Day 4-5:** Model management
  - Model switching
  - Model versioning
  - Performance comparison

**Deliverables:**
- ✅ CLIP model integration
- ✅ Multi-model support
- ✅ Model selection API

#### Week 8: Performance & Caching
- **Day 1-2:** Redis caching
  - Feature vector caching
  - Search result caching
  - Cache invalidation
  
- **Day 3-4:** Performance optimization
  - Batch processing
  - Connection pooling
  - Async operations
  
- **Day 5:** Load testing
  - Performance benchmarks
  - Stress testing
  - Optimization

**Deliverables:**
- ✅ Redis caching layer
- ✅ Performance optimizations
- ✅ Load test results

---

### **Phase 3: Production Readiness (Weeks 9-10)**

**Goal:** Observability, monitoring, and deployment

#### Week 9: Observability
- **Day 1-2:** Structured logging
  - Serilog configuration
  - Python logging setup
  - Log correlation
  
- **Day 3-4:** Metrics & tracing
  - OpenTelemetry integration
  - Prometheus metrics
  - Jaeger tracing
  
- **Day 5:** Dashboards
  - Grafana dashboards
  - Alert rules
  - Health checks

**Deliverables:**
- ✅ Structured logging
- ✅ OpenTelemetry integration
- ✅ Grafana dashboards

#### Week 10: Deployment & CI/CD
- **Day 1-2:** Kubernetes manifests
  - Deployment configs
  - Service definitions
  - ConfigMaps and Secrets
  
- **Day 3-4:** CI/CD pipeline
  - GitHub Actions workflows
  - Docker image builds
  - Automated testing
  
- **Day 5:** Documentation
  - API documentation
  - Deployment guides
  - Runbooks

**Deliverables:**
- ✅ Kubernetes deployment
- ✅ CI/CD pipeline
- ✅ Complete documentation

---

### **Phase 4: Kafka Integration (Weeks 11-12)**

**Goal:** Event-driven asynchronous processing

#### Week 11: Kafka Producers
- **Day 1-2:** Event publishing
  - ImageUploadedEvent
  - ImageProcessedEvent
  - Event schemas
  
- **Day 3-4:** .NET Kafka integration
  - Producer configuration
  - Event serialization
  - Error handling
  
- **Day 5:** Testing
  - Event publishing tests
  - Kafka integration tests

**Deliverables:**
- ✅ Kafka event producers
- ✅ Event schemas
- ✅ Integration tests

#### Week 12: Kafka Consumers
- **Day 1-3:** Background workers
  - Feature extraction consumer
  - Vector indexing consumer
  - Service token authentication
  
- **Day 4-5:** Testing & documentation
  - End-to-end async flow tests
  - Performance testing
  - Final documentation

**Deliverables:**
- ✅ Kafka consumers
- ✅ Background processing
- ✅ Complete system documentation

---

## 🎯 Immediate Tasks (This Week)

### 🔴 High Priority - Do Now

1. **Create Python Feature Extraction Service Structure**
   - [ ] Create project directory structure
   - [ ] Setup FastAPI app skeleton
   - [ ] Configure dependencies (requirements.txt)
   - [ ] Create Dockerfile
   - **Estimated:** 2 hours
   - **Assigned:** Next session

2. **Implement ResNet50 Feature Extractor**
   - [ ] Download ResNet50 ONNX model
   - [ ] Create feature extractor class
   - [ ] Implement image preprocessing
   - [ ] Add error handling
   - **Estimated:** 4 hours
   - **Assigned:** Next session

3. **Create Feature Extraction Endpoint**
   - [ ] POST /extract-features endpoint
   - [ ] Request/response models
   - [ ] Image upload handling
   - [ ] Basic validation
   - **Estimated:** 3 hours
   - **Assigned:** Next session

### 🟡 Medium Priority - This Week

4. **Update ADR Documentation**
   - [ ] ADR-001: Hybrid .NET + Python Architecture
   - [ ] ADR-002: JWT Authentication Strategy
   - [ ] ADR-003: Service Communication Pattern
   - **Estimated:** 2 hours
   - **Assigned:** Parallel to development

5. **Setup Python Unit Tests**
   - [ ] Configure pytest
   - [ ] Create test fixtures
   - [ ] Write model loading tests
   - **Estimated:** 2 hours
   - **Assigned:** After core implementation

---

## 📌 Next Tasks (Next Week)

1. **Python Vector Similarity Service**
   - [ ] Setup FastAPI structure
   - [ ] Integrate Qdrant client
   - [ ] Implement similarity algorithms
   - [ ] Create search endpoints

2. **Docker Compose Development Environment**
   - [ ] Python services
   - [ ] Qdrant
   - [ ] PostgreSQL
   - [ ] Redis

3. **Start .NET Domain Layer**
   - [ ] Create project structure
   - [ ] Define entities
   - [ ] Define value objects

---

## 🏗️ Architecture Decisions to Document

### Pending ADRs

1. **ADR-001: Hybrid .NET + Python Architecture** ⏳
   - Decision: Use .NET for APIs/orchestration, Python for AI/ML
   - Status: Agreed, needs documentation

2. **ADR-002: JWT Authentication Strategy** ⏳
   - Decision: Hybrid approach (user JWT + service JWT)
   - Phase 1: User JWT propagation only
   - Phase 2: Add service JWT for background jobs
   - Status: Agreed, needs documentation

3. **ADR-003: Development First, Auth Later** ⏳
   - Decision: Build core functionality first, add JWT validation later
   - Use ENABLE_AUTH environment variable for optional auth
   - Status: Agreed, needs documentation

4. **ADR-004: Service Communication Pattern** ⏳
   - Decision: HTTP/REST for synchronous, Kafka for async
   - Token forwarding via Authorization header
   - Status: Agreed, needs documentation

---

## 📊 Success Metrics

### Phase 1 (Weeks 1-4)
- ✅ Feature extraction latency < 500ms
- ✅ API response time < 1s
- ✅ Test coverage > 80%
- ✅ Docker images < 500MB

### Phase 2 (Weeks 5-8)
- ✅ Support 100 requests/second
- ✅ JWT validation < 50ms
- ✅ Cache hit rate > 70%
- ✅ Multiple model support

### Phase 3 (Weeks 9-12)
- ✅ 99.9% uptime
- ✅ Full observability stack
- ✅ Automated deployments
- ✅ Complete documentation

---

## 🚧 Risks & Mitigation

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| ONNX model performance issues | High | Medium | Benchmark early, optimize or switch to TorchServe |
| Qdrant scaling limitations | High | Low | Start with proven config, monitor performance |
| JWT validation overhead | Medium | Medium | Implement caching, use optional auth in dev |
| Docker image size | Low | High | Multi-stage builds, optimize dependencies |

### Schedule Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Underestimated AI/ML complexity | High | Medium | Phase 1 focus on ResNet50 only, add CLIP later |
| Authentication integration delays | Medium | Low | Build without auth first, add as middleware |
| Infrastructure setup time | Medium | Medium | Use existing infrastructure from PROJECT_PLAN |

---

## 📝 Notes & Decisions

### November 27, 2025
- ✅ Decided on hybrid .NET + Python architecture
- ✅ Agreed on JWT authentication strategy (user JWT + service JWT)
- ✅ Chose development-first approach (core before auth)
- ✅ Confirmed Python services will accept user JWT tokens
- ⏳ Need to create ADRs for architecture decisions

---

## 🔗 Related Documents

- [PROJECT_PLAN.md](PROJECT_PLAN.md) - Overall project vision and phases
- [ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md) - ADR log (needs update)
- [docs/ARCHITECTURE_OVERVIEW.md](docs/ARCHITECTURE_OVERVIEW.md) - System architecture
- [docs/RBAC_PLAN.md](docs/RBAC_PLAN.md) - Authentication and authorization
- [README.md](README.md) - Project overview

---

## 📞 Team & Contacts

- **Architecture Lead:** TBD
- **Backend Developer (.NET):** TBD
- **ML Engineer (Python):** TBD
- **DevOps Engineer:** TBD

---

**Last Updated:** November 27, 2025  
**Next Review:** After Phase 1A completion (Week 2)

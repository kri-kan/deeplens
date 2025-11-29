# DeepLens Stateless Service Architecture

This document describes the proper separation of concerns between Python feature extraction and .NET data layer services in DeepLens.

## 🏗️ Architecture Principles

### Stateless vs Stateful Services

```
┌─────────────────────────────────────────────────────────────────┐
│                    STATELESS SERVICES                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐                    │
│  │ Feature Extract │    │   API Gateway   │                    │
│  │                 │    │                 │                    │
│  │ • Pure ML only  │    │ • Route only    │                    │
│  │ • No storage    │    │ • Auth/RateLimit│                    │
│  │ • Horizontally  │    │ • Load Balance  │                    │
│  │   scalable      │    │ • Circuit Break │                    │
│  └─────────────────┘    └─────────────────┘                    │
│      Python FastAPI          .NET YARP                         │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                    STATEFUL DATA SERVICES                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │ Vector Storage  │    │ Metadata Store  │    │ Cache Layer │ │
│  │                 │    │                 │    │             │ │
│  │ • Qdrant Mgmt   │    │ • PostgreSQL    │    │ • Redis     │ │
│  │ • Collection    │    │ • Entity Track  │    │ • Session   │ │
│  │ • Similarity    │    │ • Relationships │    │ • Results   │ │
│  │ • Multi-Tenant  │    │ • Transactions  │    │ • Rate Limit│ │
│  └─────────────────┘    └─────────────────┘    └─────────────┘ │
│      .NET Service            .NET EF Core        .NET Service  │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 Data Flow Architecture

### Phase 1: Single Model Flow (Current Implementation)

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│             │    │             │    │             │    │             │
│   Client    │    │ API Gateway │    │ Search API  │    │ Feature     │
│ Application │────▶│   (.NET)    │────▶│   (.NET)    │────▶│ Extraction  │
│             │    │             │    │             │    │ (Python)    │
│             │    │ • Auth      │    │ • Validate  │    │ • ResNet50  │
│             │    │ • Rate Limit│    │ • Orchestrate│   │ • Generate  │
└─────────────┘    └─────────────┘    └─────────────┘    │   Vector    │
                                                         └─────────────┘
                                                                │
                                                                ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│             │    │             │    │             │    │ HTTP        │
│ Search      │◀───│ Vector      │◀───│ Metadata    │◀───│ Response    │
│ Results     │    │ Store       │    │ Store       │    │ (Vector +   │
│             │    │ (.NET)      │    │ (.NET)      │    │  Metadata)  │
│ • Top-K     │    │ • Qdrant    │    │ • PostgreSQL│    │             │
│ • Scores    │    │ • Collections│   │ • Image Info│    │             │
│ • Metadata  │    │ • Similarity│    │ • Tenant    │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

### Service Responsibilities

#### 🐍 Python Feature Extraction Service (Port 8001)
```python
# STATELESS - No database connections, no state storage
POST /extract-features
{
    "file": "<binary_image_data>",
    "image_id": "img_001",
    "return_metadata": true
}
# Response: 2048-dimensional vector + image metadata
```

**Responsibilities:**
- ✅ Load and run ML model (ResNet50)
- ✅ Image preprocessing (resize, normalize)
- ✅ Feature vector generation (2048 dims)
- ✅ Basic image metadata (width, height, format)
- ❌ NO vector storage
- ❌ NO similarity search
- ❌ NO tenant management

#### 🔵 .NET Vector Store Service (DeepLens.Infrastructure)
```csharp
// STATEFUL - Manages all Qdrant operations with tenant isolation
IVectorStoreService
{
    Task<bool> CreateCollectionAsync(tenantId, modelName, vectorDimension);
    Task<bool> IndexVectorAsync(tenantId, modelName, imageId, vector);
    Task<SimilaritySearchResult> SearchSimilarAsync(tenantId, modelName, queryVector);
}
```

**Responsibilities:**
- ✅ Qdrant collection management
- ✅ Multi-tenant isolation (`tenant_{id}_{model}_vectors`)
- ✅ Vector indexing and batch operations
- ✅ Similarity search with filtering
- ✅ Collection optimization and maintenance
- ✅ Error handling and logging

#### 🔧 PowerShell Tenant Manager (Infrastructure Orchestration)
```powershell
# HIGH-LEVEL - Calls .NET APIs instead of direct database calls
Initialize-DeepLensModelCollections -TenantId "acme-corp" -ModelName "resnet50"
# Internally calls: HTTP POST to DeepLens.AdminApi/collections
```

**Responsibilities:**
- ✅ Tenant provisioning orchestration
- ✅ Database creation (PostgreSQL)
- ✅ Collection setup via .NET API calls
- ✅ Health checks and monitoring
- ❌ NO direct Qdrant HTTP calls
- ❌ NO direct database operations

## 🔄 Request Flow Examples

### Image Upload & Indexing
```
1. Client uploads image to /api/v1/images
   ├─▶ DeepLens.SearchApi (.NET)
       ├─▶ Validate tenant, auth, rate limits
       ├─▶ Store metadata in PostgreSQL
       └─▶ HTTP POST to Python Feature Service
           ├─▶ Generate 2048-dim vector
           └─▶ Return vector + metadata
       ├─▶ VectorStoreService.IndexVectorAsync()
           └─▶ Store in Qdrant collection
       └─▶ Return image ID + status
```

### Similarity Search
```  
2. Client searches similar images /api/v1/search
   ├─▶ DeepLens.SearchApi (.NET)
       ├─▶ HTTP POST to Python Feature Service
           └─▶ Generate query vector from uploaded image
       ├─▶ VectorStoreService.SearchSimilarAsync()
           ├─▶ Query Qdrant collection
           └─▶ Return top-K matches with scores
       ├─▶ Enrich with metadata from PostgreSQL
       └─▶ Return complete search results
```

### Tenant Provisioning
```
3. Admin creates tenant /api/v1/admin/tenants
   ├─▶ DeepLens.AdminApi (.NET)
       ├─▶ Create tenant record in PostgreSQL
       ├─▶ VectorStoreService.CreateCollectionAsync()
           └─▶ Create Qdrant collection with proper naming
       └─▶ Initialize tenant configuration
```

## 🎯 Benefits of This Architecture

### Scalability
- **Python Services**: Stateless → horizontal scaling with load balancer
- **.NET Services**: Stateful → optimized connection pooling, caching
- **Database Layer**: Proper connection management and transactions

### Maintainability  
- **Clear Boundaries**: Each service has single responsibility
- **Technology Alignment**: ML in Python, business logic in .NET
- **Testability**: Easy to mock interfaces and unit test

### Performance
- **Python**: Optimized for ML inference only
- **.NET**: Efficient database operations with EF Core
- **Caching**: Redis integration at the .NET layer

### Multi-Tenancy
- **Consistent Naming**: `tenant_{id}_{model}_vectors`
- **Isolation**: Tenant context passed through all layers
- **Security**: Authentication and authorization in .NET layer

## 🔧 Configuration Integration

### appsettings.json (.NET Services)
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=deeplens;...",
    "Qdrant": "http://localhost:6333",
    "Redis": "localhost:6379"
  },
  "FeatureExtraction": {
    "ServiceUrl": "http://localhost:8001",
    "TimeoutSeconds": 30,
    "RetryCount": 3
  },
  "Qdrant": {
    "DefaultVectorSize": "2048",
    "DefaultDistance": "Cosine",
    "MaxCollectionsPerTenant": 5
  }
}
```

### config.py (Python Service)
```python
# MINIMAL - Only ML-related configuration
class Settings(BaseSettings):
    service_name: str = "feature-extraction-service"
    model_name: str = "resnet50"
    model_path: str = "./models/resnet50_v2.7.onnx"
    vector_dimension: int = 2048
    
    # NO database configurations
    # NO Qdrant configurations  
    # NO tenant configurations
```

## 🚀 Migration Strategy

### Phase 1: Current State → Target State
1. ✅ **VectorStoreService**: Implement .NET service (DONE)
2. ✅ **Python Cleanup**: Remove Qdrant code (Already stateless)
3. 🔄 **PowerShell Update**: Call .NET APIs instead of HTTP
4. 📝 **Documentation**: Update all integration examples

### Phase 2: Production Hardening
1. **Error Handling**: Comprehensive retry policies
2. **Monitoring**: OpenTelemetry across all services
3. **Performance**: Connection pooling, caching strategies
4. **Security**: mTLS between services, API keys

This architecture ensures that each service does what it does best while maintaining clear boundaries and responsibilities.
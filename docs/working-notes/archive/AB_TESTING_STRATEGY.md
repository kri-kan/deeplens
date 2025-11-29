"""
A/B Testing Strategy for Multi-Model Vector Systems

This document addresses the challenge: "In A/B testing, an image is vectorized 
into only one embedding initially - how do we compare across models?"
"""

## 🚨 The A/B Testing Challenge

### Traditional A/B Testing Problem
```
Scenario: Testing ResNet50 vs CLIP performance

1. Image arrives → Extract ResNet50 features → Store in ResNet50 collection
2. Want to A/B test: Does CLIP give better results?  
3. Problem: No CLIP vectors exist for comparison!

❌ Cannot compare ResNet50 query against CLIP database (different dimensions)
❌ Cannot retroactively extract CLIP features for all existing images
```

## 💡 Solution Strategies

### Strategy 1: Dual Vectorization (Recommended)

#### During A/B Test Period: Extract with BOTH Models
```python
class ABTestVectorizer:
    def __init__(self, ab_test_config):
        self.baseline_model = ab_test_config.baseline_model  # e.g., "resnet50" 
        self.test_model = ab_test_config.test_model         # e.g., "clip-vit-b32"
        self.ab_test_active = ab_test_config.enabled
        
    async def process_image(self, image_data, tenant_id):
        """Process image with both models during A/B test"""
        
        # Always extract with baseline model (production)
        baseline_features = await self.extract_features(
            image_data, self.baseline_model
        )
        await self.store_vector(
            baseline_features, self.baseline_model, tenant_id
        )
        
        # During A/B test: ALSO extract with test model  
        if self.ab_test_active:
            test_features = await self.extract_features(
                image_data, self.test_model
            )
            await self.store_vector(
                test_features, self.test_model, tenant_id
            )
            
        return {
            "baseline_model": self.baseline_model,
            "test_model": self.test_model if self.ab_test_active else None
        }
```

#### Search During A/B Test: Compare Both Results
```python
class ABTestSearchService:
    def __init__(self):
        self.baseline_model = "resnet50" 
        self.test_model = "clip-vit-b32"
        
    async def ab_test_search(self, query_image_data, tenant_id):
        """
        Search with both models and compare results
        """
        
        # Extract features with both models
        baseline_features = await self.extract_features(
            query_image_data, self.baseline_model
        )
        test_features = await self.extract_features(
            query_image_data, self.test_model  
        )
        
        # Search in respective collections in parallel
        baseline_results, test_results = await asyncio.gather(
            self.search_collection(
                f"tenant_{tenant_id}_vectors_{self.baseline_model}",
                baseline_features
            ),
            self.search_collection(
                f"tenant_{tenant_id}_vectors_{self.test_model}", 
                test_features
            )
        )
        
        # Return both result sets for comparison
        return ABTestResults(
            baseline_model=self.baseline_model,
            baseline_results=baseline_results,
            test_model=self.test_model, 
            test_results=test_results,
            metrics=self.calculate_metrics(baseline_results, test_results)
        )
```

### Strategy 2: Representative Sample Approach

#### Build Test Collection from Sample
```python
class SampleBasedABTest:
    def __init__(self, sample_percentage=10):
        self.sample_percentage = sample_percentage  # 10% of existing images
        
    async def initialize_ab_test(self, tenant_id, test_model):
        """
        Build test model collection using representative sample
        """
        
        # Get sample of existing images 
        existing_images = await self.get_random_sample(
            tenant_id, percentage=self.sample_percentage
        )
        
        # Extract features for sample with new model
        print(f"Re-vectorizing {len(existing_images)} images with {test_model}")
        
        batch_size = 50
        for i in range(0, len(existing_images), batch_size):
            batch = existing_images[i:i + batch_size]
            
            # Process batch
            tasks = [
                self.extract_and_store_with_test_model(img, test_model, tenant_id)
                for img in batch
            ]
            await asyncio.gather(*tasks)
            
            print(f"Processed {i + len(batch)}/{len(existing_images)} images")
        
        return f"Test collection built with {len(existing_images)} vectors"
    
    async def extract_and_store_with_test_model(self, image_data, test_model, tenant_id):
        """Extract features with test model and store in test collection"""
        
        # Download image from storage
        image_content = await self.download_image(image_data.storage_path)
        
        # Extract with test model
        features = await self.extract_features(image_content, test_model)
        
        # Store in test collection
        collection_name = f"tenant_{tenant_id}_vectors_{test_model}_test"
        await self.store_vector(
            image_id=image_data.id,
            features=features,
            collection_name=collection_name
        )
```

### Strategy 3: Progressive Migration Approach

#### Gradual Collection Building
```python
class ProgressiveMigrationABTest:
    def __init__(self):
        self.migration_rate = 100  # Images per hour to re-process
        
    async def start_progressive_migration(self, tenant_id, test_model):
        """
        Gradually build test collection while system is live
        """
        
        # Get all images that need test model vectors
        unprocessed_images = await self.get_images_without_model_vectors(
            tenant_id, test_model
        )
        
        print(f"Starting progressive migration for {len(unprocessed_images)} images")
        
        # Process in background at controlled rate
        for image_batch in self.batch_generator(unprocessed_images, batch_size=10):
            
            # Rate limit: Process batch then wait
            await self.process_migration_batch(image_batch, test_model, tenant_id)
            await asyncio.sleep(3600 / self.migration_rate)  # Throttle
            
            progress = self.calculate_migration_progress(tenant_id, test_model)
            print(f"Migration progress: {progress:.1f}%")
    
    async def search_with_fallback(self, query_image, tenant_id, test_model):
        """
        Search test model if available, fallback to baseline
        """
        
        # Check if sufficient vectors exist for meaningful test
        test_collection_size = await self.get_collection_size(
            f"tenant_{tenant_id}_vectors_{test_model}"
        )
        
        if test_collection_size < 1000:  # Minimum threshold
            print("Insufficient test vectors, using baseline model only")
            return await self.search_baseline_model(query_image, tenant_id)
        
        # Perform A/B test with available vectors
        return await self.ab_test_search(query_image, tenant_id, test_model)
```

## 📊 A/B Test Implementation Framework

### Configuration Management
```python
class ABTestConfiguration:
    def __init__(self):
        self.active_tests = {}
    
    def configure_ab_test(self, tenant_id: str, config: dict):
        """
        Configure A/B test for specific tenant
        
        Example config:
        {
            "test_name": "resnet50_vs_clip",
            "baseline_model": "resnet50",
            "test_model": "clip-vit-b32", 
            "traffic_split": 50,  # 50% of searches use test model
            "start_date": "2025-12-01",
            "end_date": "2025-12-15",
            "metrics": ["precision", "recall", "response_time"],
            "min_sample_size": 1000
        }
        """
        self.active_tests[tenant_id] = ABTestConfig(**config)
    
    def should_use_test_model(self, tenant_id: str, user_id: str) -> bool:
        """Deterministic traffic splitting"""
        if tenant_id not in self.active_tests:
            return False
            
        test_config = self.active_tests[tenant_id]
        
        # Hash-based consistent assignment
        user_hash = hash(f"{tenant_id}:{user_id}") % 100
        return user_hash < test_config.traffic_split
```

### Metrics Collection
```python
class ABTestMetricsCollector:
    def __init__(self):
        self.metrics_store = {}
    
    async def record_search_result(self, 
                                 tenant_id: str,
                                 model_used: str, 
                                 query_id: str,
                                 results: List[SearchResult],
                                 user_feedback: Optional[dict] = None):
        """Record metrics for A/B test analysis"""
        
        metrics = {
            "tenant_id": tenant_id,
            "model_used": model_used,
            "query_id": query_id,
            "timestamp": datetime.utcnow(),
            "result_count": len(results),
            "avg_similarity_score": np.mean([r.score for r in results]),
            "response_time_ms": results[0].processing_time_ms if results else 0,
            "user_feedback": user_feedback  # Click-through, ratings, etc.
        }
        
        await self.store_metrics(metrics)
    
    async def analyze_ab_test_results(self, tenant_id: str) -> dict:
        """Generate A/B test analysis report"""
        
        baseline_metrics = await self.get_metrics(tenant_id, "baseline")
        test_metrics = await self.get_metrics(tenant_id, "test")
        
        return {
            "baseline_model": {
                "avg_response_time": np.mean(baseline_metrics["response_time"]),
                "avg_similarity_score": np.mean(baseline_metrics["similarity_score"]),
                "user_satisfaction": np.mean(baseline_metrics["user_ratings"])
            },
            "test_model": {
                "avg_response_time": np.mean(test_metrics["response_time"]), 
                "avg_similarity_score": np.mean(test_metrics["similarity_score"]),
                "user_satisfaction": np.mean(test_metrics["user_ratings"])
            },
            "statistical_significance": self.calculate_significance(
                baseline_metrics, test_metrics
            )
        }
```

## 🎯 Recommended Implementation

### Phase 1: Start with Dual Vectorization (Week 1)
```python
# For new A/B tests: Extract with both models from day 1
ab_test_config = {
    "enabled": True,
    "baseline_model": "resnet50", 
    "test_model": "clip-vit-b32",
    "dual_extraction": True  # Extract with both models
}
```

### Phase 2: Add Sample-Based Testing (Week 2) 
```python  
# For existing datasets: Build test collection from sample
await build_test_collection_from_sample(
    tenant_id="test_tenant",
    test_model="clip-vit-b32", 
    sample_size=5000  # 5k images for meaningful comparison
)
```

### Phase 3: Progressive Migration (Ongoing)
```python
# Gradually build complete test collections in background
await start_progressive_migration(
    tenant_id="production_tenant",
    test_model="efficientnet-b7",
    migration_rate_per_hour=500
)
```

## Key Implementation Points

### ✅ What Works:
- **Dual Vectorization**: Extract with both models for new images
- **Sample Testing**: Use representative subset for comparison  
- **Progressive Migration**: Gradual background re-processing
- **Hash-Based Traffic Splitting**: Consistent user assignment

### ❌ What Doesn't Work:
- Trying to compare vectors across different model dimensions
- Re-processing entire datasets synchronously 
- A/B testing without sufficient sample size
- Ignoring statistical significance in results

### 🔧 Practical A/B Test Workflow:

1. **Setup**: Configure dual extraction for test period
2. **Collection Building**: Use sample or progressive migration
3. **Traffic Splitting**: Route users deterministically 
4. **Metrics Collection**: Track performance and user satisfaction
5. **Analysis**: Statistical comparison of results
6. **Decision**: Choose winning model and migrate fully

This approach solves the "single vectorization" problem while maintaining production stability! 🎯
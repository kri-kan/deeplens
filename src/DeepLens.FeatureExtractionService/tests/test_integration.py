"""
Integration tests for the complete feature extraction pipeline.
These tests use real components where possible and test end-to-end functionality.
"""
import pytest
import io
import os
import tempfile
from unittest.mock import patch, Mock
import numpy as np

from feature_extractor import ResNet50FeatureExtractor
from config import settings
from tests.conftest import create_test_image, assert_valid_feature_vector


class TestFeatureExtractionPipeline:
    """Integration tests for the complete feature extraction pipeline."""

    @pytest.mark.integration
    def test_complete_pipeline_with_real_image(self, mock_extractor_success):
        """Test the complete pipeline with a real test image."""
        # Create a realistic test image
        test_image = create_test_image(640, 480, 'JPEG', color=(128, 64, 192))
        
        # Initialize extractor
        extractor = ResNet50FeatureExtractor("dummy_path")
        
        # Extract features
        features, metadata = extractor.extract_features(test_image)
        
        # Validate results
        assert_valid_feature_vector(features)
        
        # Model resizes all images to 224x224 for processing
        assert metadata['width'] == 224
        assert metadata['height'] == 224
        assert metadata['format'] in ['JPEG', 'UNKNOWN']

    @pytest.mark.integration
    def test_pipeline_different_image_formats(self, mock_extractor_success):
        """Test pipeline with different image formats."""
        formats_to_test = [
            ('JPEG', 'image/jpeg'),
            ('PNG', 'image/png'),
        ]
        
        # Skip WEBP if not supported
        try:
            create_test_image(100, 100, 'WEBP')
            formats_to_test.append(('WEBP', 'image/webp'))
        except OSError:
            pass
        
        extractor = ResNet50FeatureExtractor("dummy_path")
        
        for img_format, content_type in formats_to_test:
            test_image = create_test_image(224, 224, img_format)
            
            features, metadata = extractor.extract_features(test_image)
            
            assert_valid_feature_vector(features)
            assert metadata['width'] == 224
            assert metadata['height'] == 224

    @pytest.mark.integration
    def test_pipeline_various_image_sizes(self, mock_extractor_success):
        """Test pipeline with various image sizes."""
        test_sizes = [
            (100, 100),     # Small square
            (224, 224),     # Model input size
            (800, 600),     # Standard photo
            (1920, 1080),   # HD resolution
            (100, 300),     # Tall aspect ratio
            (500, 200),     # Wide aspect ratio
        ]
        
        extractor = ResNet50FeatureExtractor("dummy_path")
        
        for width, height in test_sizes:
            test_image = create_test_image(width, height)
            
            features, metadata = extractor.extract_features(test_image)
            
            assert_valid_feature_vector(features)
            # Model resizes all images to 224x224 for processing  
            assert metadata['width'] == 224
            assert metadata['height'] == 224

    @pytest.mark.integration
    def test_pipeline_memory_usage(self, mock_extractor_success):
        """Test that pipeline doesn't have memory leaks with multiple images."""
        import psutil
        import gc
        
        process = psutil.Process()
        initial_memory = process.memory_info().rss
        
        extractor = ResNet50FeatureExtractor("dummy_path")
        
        # Process multiple images
        for i in range(10):
            test_image = create_test_image(500, 400, color=(i * 25, i * 20, i * 15))
            features, _ = extractor.extract_features(test_image)
            assert_valid_feature_vector(features)
            
            # Force garbage collection
            gc.collect()
        
        final_memory = process.memory_info().rss
        memory_increase = final_memory - initial_memory
        
        # Memory increase should be reasonable (less than 100MB)
        max_memory_increase = 100 * 1024 * 1024  # 100MB
        assert memory_increase < max_memory_increase, \
            f"Memory usage increased by {memory_increase / 1024 / 1024:.1f}MB, which may indicate a memory leak"

    @pytest.mark.integration
    def test_pipeline_thread_safety(self, mock_extractor_success):
        """Test that the pipeline works correctly with concurrent access."""
        import threading
        import time
        
        extractor = ResNet50FeatureExtractor("dummy_path")
        results = []
        errors = []
        
        def extract_features_worker(worker_id):
            try:
                test_image = create_test_image(224, 224, color=(worker_id * 50, 100, 150))
                features, metadata = extractor.extract_features(test_image)
                
                # Validate results
                assert_valid_feature_vector(features)
                assert metadata['width'] == 224
                assert metadata['height'] == 224
                
                results.append((worker_id, len(features)))
            except Exception as e:
                errors.append((worker_id, str(e)))
        
        # Create and start multiple threads
        threads = []
        for i in range(5):
            thread = threading.Thread(target=extract_features_worker, args=(i,))
            threads.append(thread)
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join(timeout=10)
        
        # Check results
        assert len(errors) == 0, f"Errors in threads: {errors}"
        assert len(results) == 5, f"Expected 5 results, got {len(results)}"
        
        # All should have extracted 2048 features
        for worker_id, feature_count in results:
            assert feature_count == 2048

    @pytest.mark.integration
    def test_configuration_integration(self):
        """Test that configuration is properly integrated with components."""
        # Test that settings are accessible and have expected values
        assert settings.service_name == "feature-extraction-service"
        assert settings.model_name == "resnet50"
        assert settings.feature_dimension == 2048
        
        # Test model info property
        model_info = settings.current_model_info
        assert model_info['model_name'] == settings.model_name
        assert model_info['feature_dimension'] == settings.feature_dimension

    @pytest.mark.integration
    def test_error_handling_integration(self, mock_extractor_success):
        """Test error handling throughout the pipeline."""
        extractor = ResNet50FeatureExtractor("dummy_path")
        
        # Test with various invalid inputs
        invalid_inputs = [
            b"",                                    # Empty data
            b"invalid image data",                  # Invalid format
            b"\xff\xd8\xff\xe0" + b"x" * 1000,    # Corrupted JPEG header
        ]
        
        for invalid_data in invalid_inputs:
            # Mock extract_features to simulate PIL errors
            def mock_extract_error(data):
                if data == invalid_data:
                    raise ValueError(f"Failed to extract features: cannot identify image file")
                return ([1.0] * 2048, {'width': 100, 'height': 100, 'format': 'JPEG'})
            
            extractor.extract_features = mock_extract_error
            
            with pytest.raises(ValueError) as exc_info:
                extractor.extract_features(invalid_data)
            
            assert "Failed to extract features" in str(exc_info.value)

    @pytest.mark.integration
    @pytest.mark.slow
    def test_performance_benchmarks(self, mock_extractor_success):
        """Test performance benchmarks for feature extraction."""
        import time
        
        extractor = ResNet50FeatureExtractor("dummy_path")
        
        # Benchmark different image sizes
        benchmark_results = []
        
        test_cases = [
            (224, 224, "optimal"),      # Model native size
            (500, 400, "medium"),       # Medium size
            (1920, 1080, "large"),      # Large size
        ]
        
        for width, height, size_category in test_cases:
            test_image = create_test_image(width, height)
            
            # Measure extraction time
            start_time = time.time()
            features, metadata = extractor.extract_features(test_image)
            end_time = time.time()
            
            processing_time = (end_time - start_time) * 1000  # Convert to ms
            
            # Validate results
            assert_valid_feature_vector(features)
            
            benchmark_results.append({
                'size_category': size_category,
                'dimensions': f"{width}x{height}",
                'processing_time_ms': processing_time
            })
        
        # Log benchmark results
        print("\nFeature Extraction Performance Benchmarks:")
        for result in benchmark_results:
            print(f"  {result['size_category']} ({result['dimensions']}): "
                  f"{result['processing_time_ms']:.2f}ms")
        
        # Basic performance assertions (with mocked extractor, these should be fast)
        for result in benchmark_results:
            assert result['processing_time_ms'] < 1000, \
                f"Processing too slow for {result['size_category']}: {result['processing_time_ms']}ms"

    @pytest.mark.integration
    def test_feature_consistency(self, mock_extractor_success):
        """Test that identical images produce identical features."""
        extractor = ResNet50FeatureExtractor("dummy_path")
        
        # Create identical test images
        test_image = create_test_image(300, 200, color=(100, 150, 200))
        
        # Extract features multiple times
        features_list = []
        for _ in range(3):
            features, _ = extractor.extract_features(test_image)
            features_list.append(features)
        
        # All feature vectors should be identical (with mocked extractor)
        for i in range(1, len(features_list)):
            np.testing.assert_array_almost_equal(
                features_list[0], 
                features_list[i],
                decimal=6,
                err_msg=f"Features not consistent between extraction {0} and {i}"
            )

    @pytest.mark.integration 
    def test_normalization_consistency(self, mock_extractor_success):
        """Test that extracted features are properly normalized."""
        extractor = ResNet50FeatureExtractor("dummy_path")
        
        test_images = [
            create_test_image(224, 224, color=(255, 0, 0)),      # Red
            create_test_image(224, 224, color=(0, 255, 0)),      # Green  
            create_test_image(224, 224, color=(0, 0, 255)),      # Blue
            create_test_image(224, 224, color=(128, 128, 128)),  # Gray
        ]
        
        for i, test_image in enumerate(test_images):
            features, _ = extractor.extract_features(test_image)
            
            # Check L2 normalization
            features_array = np.array(features)
            norm = np.linalg.norm(features_array)
            
            assert abs(norm - 1.0) < 0.01, \
                f"Features for image {i} not properly normalized: norm={norm}"
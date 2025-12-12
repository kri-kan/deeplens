"""
Integration tests for the FastAPI endpoints.
Tests the complete API functionality including request/response handling.
"""
import pytest
import json
import io
from fastapi.testclient import TestClient
from unittest.mock import patch

from tests.conftest import create_test_image, assert_api_response_structure


class TestHealthEndpoint:
    """Test cases for the /health endpoint."""

    @pytest.mark.api
    def test_health_check_success(self, api_client, mock_extractor_success):
        """Test health check returns success when model is loaded."""
        response = api_client.get("/health")
        
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "feature-extraction-service"
        assert "version" in data
        assert data["model_loaded"] is True

    @pytest.mark.api 
    def test_health_check_model_not_loaded(self, api_client, mock_extractor_failure):
        """Test health check when model fails to load."""
        response = api_client.get("/health")
        
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"  # Service is healthy even if model not loaded
        assert data["model_loaded"] is False

    @pytest.mark.api
    def test_health_check_performance(self, api_client, mock_extractor_success, test_config):
        """Test that health check responds quickly."""
        import time
        
        start_time = time.time()
        response = api_client.get("/health")
        end_time = time.time()
        
        response_time_ms = (end_time - start_time) * 1000
        
        assert response.status_code == 200
        assert response_time_ms < test_config.HEALTH_CHECK_MAX_TIME_MS


class TestExtractFeaturesEndpoint:
    """Test cases for the /extract-features endpoint."""

    @pytest.mark.api
    def test_extract_features_success(self, api_client, mock_extractor_success, sample_image_bytes):
        """Test successful feature extraction via API."""
        files = {"file": ("test.jpg", io.BytesIO(sample_image_bytes), "image/jpeg")}
        data = {"image_id": "test_001", "return_metadata": "true"}
        
        response = api_client.post("/extract-features", files=files, data=data)
        
        assert response.status_code == 200
        
        response_data = response.json()
        assert_api_response_structure(response_data)
        
        # Check specific values
        assert response_data["image_id"] == "test_001"
        assert response_data["model_name"] == "resnet50" 
        assert response_data["feature_dimension"] == 2048
        assert len(response_data["features"]) == 2048
        assert response_data["processing_time_ms"] >= 0
        
        # Check metadata is included
        assert "image_width" in response_data
        assert "image_height" in response_data
        assert "image_format" in response_data

    @pytest.mark.api
    def test_extract_features_without_metadata(self, api_client, mock_extractor_success, sample_image_bytes):
        """Test feature extraction without requesting metadata."""
        files = {"file": ("test.jpg", io.BytesIO(sample_image_bytes), "image/jpeg")}
        data = {"return_metadata": "false"}
        
        response = api_client.post("/extract-features", files=files, data=data)
        
        assert response.status_code == 200
        
        response_data = response.json()
        assert_api_response_structure(response_data)
        
        # Check metadata is NOT included
        assert "image_width" not in response_data
        assert "image_height" not in response_data
        assert "image_format" not in response_data

    @pytest.mark.api
    def test_extract_features_no_image_id(self, api_client, mock_extractor_success, sample_image_bytes):
        """Test feature extraction without providing image_id."""
        files = {"file": ("test.jpg", io.BytesIO(sample_image_bytes), "image/jpeg")}
        
        response = api_client.post("/extract-features", files=files)
        
        assert response.status_code == 200
        
        response_data = response.json()
        assert response_data["image_id"] is None

    @pytest.mark.api
    def test_extract_features_png_format(self, api_client, mock_extractor_success, sample_png_image_bytes):
        """Test feature extraction with PNG format."""
        files = {"file": ("test.png", io.BytesIO(sample_png_image_bytes), "image/png")}
        data = {"return_metadata": "true"}
        
        response = api_client.post("/extract-features", files=files, data=data)
        
        assert response.status_code == 200
        
        response_data = response.json()
        assert_api_response_structure(response_data)

    @pytest.mark.api
    def test_extract_features_unsupported_format(self, api_client, mock_extractor_success):
        """Test feature extraction with unsupported image format."""
        # Create fake GIF data
        fake_gif = b"GIF89a\x01\x00\x01\x00\x00\x00\x00\x21\xf9\x04\x01\x00\x00\x00\x00\x2c"
        
        files = {"file": ("test.gif", io.BytesIO(fake_gif), "image/gif")}
        
        response = api_client.post("/extract-features", files=files)
        
        assert response.status_code == 400
        
        error_data = response.json()
        assert "Unsupported image format" in error_data["detail"]

    @pytest.mark.api
    def test_extract_features_no_file(self, api_client, mock_extractor_success):
        """Test feature extraction without uploading a file."""
        data = {"image_id": "test_001"}
        
        response = api_client.post("/extract-features", data=data)
        
        assert response.status_code == 422  # Validation error

    @pytest.mark.api
    def test_extract_features_empty_file(self, api_client, mock_extractor_success):
        """Test feature extraction with empty file."""
        files = {"file": ("empty.jpg", io.BytesIO(b""), "image/jpeg")}
        
        response = api_client.post("/extract-features", files=files)
        
        # Should return 400 because empty file can't be processed
        assert response.status_code in [400, 500]

    @pytest.mark.api
    def test_extract_features_large_file(self, api_client, mock_extractor_success, large_image_bytes):
        """Test feature extraction with file exceeding size limit."""
        files = {"file": ("large.jpg", io.BytesIO(large_image_bytes), "image/jpeg")}
        
        # Only test if the large image actually exceeds our limit
        if len(large_image_bytes) > 10 * 1024 * 1024:  # 10MB limit
            response = api_client.post("/extract-features", files=files)
            
            assert response.status_code == 400
            
            error_data = response.json()
            assert "exceeds maximum allowed size" in error_data["detail"]
        else:
            pytest.skip("Large image not actually large enough for this test")

    @pytest.mark.api
    def test_extract_features_invalid_image_data(self, api_client, mock_extractor_success, invalid_image_bytes):
        """Test feature extraction with invalid image data."""
        files = {"file": ("invalid.jpg", io.BytesIO(invalid_image_bytes), "image/jpeg")}
        
        # Mock the extractor to raise ValueError for invalid data
        with patch('main.feature_extractor') as mock_extractor:
            mock_extractor.is_loaded.return_value = True
            mock_extractor.extract_features.side_effect = ValueError("Invalid image data")
            
            response = api_client.post("/extract-features", files=files)
        
        assert response.status_code == 400

    @pytest.mark.api
    def test_extract_features_model_not_loaded(self, api_client, mock_extractor_failure, sample_image_bytes):
        """Test feature extraction when model is not loaded."""
        files = {"file": ("test.jpg", io.BytesIO(sample_image_bytes), "image/jpeg")}
        
        response = api_client.post("/extract-features", files=files)
        
        assert response.status_code == 500
        
        error_data = response.json()
        assert "model not available" in error_data["detail"]

    @pytest.mark.api
    def test_extract_features_server_error(self, api_client, mock_extractor_success, sample_image_bytes):
        """Test feature extraction with unexpected server error."""
        files = {"file": ("test.jpg", io.BytesIO(sample_image_bytes), "image/jpeg")}
        
        # Mock the extractor to raise unexpected exception
        with patch('main.feature_extractor') as mock_extractor:
            mock_extractor.is_loaded.return_value = True
            mock_extractor.extract_features.side_effect = RuntimeError("Unexpected error")
            
            response = api_client.post("/extract-features", files=files)
        
        assert response.status_code == 500
        
        error_data = response.json()
        assert "Internal server error" in error_data["detail"]

    @pytest.mark.api
    @pytest.mark.parametrize("content_type", [
        "image/jpeg",
        "image/png", 
        "image/webp"
    ])
    def test_extract_features_supported_content_types(self, api_client, mock_extractor_success, content_type):
        """Test feature extraction with all supported content types.""" 
        # Create appropriate test image for content type
        if content_type == "image/png":
            test_image = create_test_image(100, 100, 'PNG')
        elif content_type == "image/webp":
            try:
                test_image = create_test_image(100, 100, 'WEBP')
            except OSError:
                pytest.skip("WEBP not supported in test environment")
        else:  # JPEG
            test_image = create_test_image(100, 100, 'JPEG')
        
        files = {"file": ("test_image", io.BytesIO(test_image), content_type)}
        
        response = api_client.post("/extract-features", files=files)
        
        assert response.status_code == 200

    @pytest.mark.api
    @pytest.mark.slow  
    def test_extract_features_performance(self, api_client, mock_extractor_success, sample_image_bytes, test_config):
        """Test that feature extraction completes within reasonable time."""
        import time
        
        files = {"file": ("test.jpg", io.BytesIO(sample_image_bytes), "image/jpeg")}
        
        start_time = time.time()
        response = api_client.post("/extract-features", files=files)
        end_time = time.time()
        
        response_time_ms = (end_time - start_time) * 1000
        
        assert response.status_code == 200
        assert response_time_ms < test_config.FEATURE_EXTRACTION_MAX_TIME_MS
        
        # Also check the reported processing time
        response_data = response.json()
        assert response_data["processing_time_ms"] < test_config.FEATURE_EXTRACTION_MAX_TIME_MS


class TestRootEndpoint:
    """Test cases for the root endpoint."""

    @pytest.mark.api
    def test_root_endpoint(self, api_client):
        """Test root endpoint returns service information."""
        response = api_client.get("/")
        
        assert response.status_code == 200
        
        data = response.json()
        assert "service" in data
        assert "version" in data
        assert "status" in data
        assert "endpoints" in data
        
        # Check endpoints are listed
        endpoints = data["endpoints"]
        assert "health" in endpoints
        assert "extract_features" in endpoints
        assert "docs" in endpoints


class TestErrorHandling:
    """Test cases for various error conditions."""

    @pytest.mark.api
    def test_404_endpoint(self, api_client):
        """Test accessing non-existent endpoint returns 404."""
        response = api_client.get("/nonexistent")
        
        assert response.status_code == 404

    @pytest.mark.api
    def test_method_not_allowed(self, api_client):
        """Test using wrong HTTP method returns 405.""" 
        # Try GET on extract-features (should be POST)
        response = api_client.get("/extract-features")
        
        assert response.status_code == 405

    @pytest.mark.api
    def test_malformed_multipart_request(self, api_client, mock_extractor_success):
        """Test handling of malformed multipart requests."""
        # Send request with wrong content type
        response = api_client.post(
            "/extract-features", 
            headers={"Content-Type": "application/json"},
            data='{"not": "multipart"}'
        )
        
        assert response.status_code == 422  # Validation error


class TestConcurrency:
    """Test cases for concurrent requests."""

    @pytest.mark.api
    @pytest.mark.slow
    def test_concurrent_health_checks(self, api_client, mock_extractor_success):
        """Test multiple concurrent health check requests."""
        import asyncio
        import httpx
        
        async def make_request():
            async with httpx.AsyncClient(app=api_client.app, base_url="http://test") as client:
                response = await client.get("/health")
                return response.status_code
        
        async def test_concurrent():
            # Make 10 concurrent requests
            tasks = [make_request() for _ in range(10)]
            results = await asyncio.gather(*tasks)
            return results
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            results = loop.run_until_complete(test_concurrent())
            
            # All requests should succeed
            assert all(status == 200 for status in results)
        finally:
            loop.close()

    @pytest.mark.api
    @pytest.mark.slow
    def test_concurrent_feature_extraction(self, api_client, mock_extractor_success, sample_image_bytes):
        """Test multiple concurrent feature extraction requests."""
        import asyncio
        import httpx
        
        async def make_request(image_id: str):
            async with httpx.AsyncClient(app=api_client.app, base_url="http://test") as client:
                files = {"file": ("test.jpg", io.BytesIO(sample_image_bytes), "image/jpeg")}
                data = {"image_id": image_id}
                
                response = await client.post("/extract-features", files=files, data=data)
                return response.status_code, response.json() if response.status_code == 200 else None
        
        async def test_concurrent():
            # Make 5 concurrent requests
            tasks = [make_request(f"test_{i}") for i in range(5)]
            results = await asyncio.gather(*tasks)
            return results
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            results = loop.run_until_complete(test_concurrent())
            
            # All requests should succeed
            status_codes, responses = zip(*results)
            assert all(status == 200 for status in status_codes)
            
            # Check that responses are valid and unique
            for i, response_data in enumerate(responses):
                if response_data:
                    assert response_data["image_id"] == f"test_{i}"
                    assert_api_response_structure(response_data)
        finally:
            loop.close()
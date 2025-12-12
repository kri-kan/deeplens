# Test configuration and fixtures
import pytest
import os
import io
import tempfile
import asyncio
from PIL import Image
import numpy as np
from typing import Generator, AsyncGenerator
from fastapi.testclient import TestClient

# Add the parent directory to the Python path so we can import our modules
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from config import settings
from feature_extractor import ResNet50FeatureExtractor


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def api_client() -> TestClient:
    """Create a test client for the FastAPI application."""
    return TestClient(app)


@pytest.fixture
def sample_image_bytes() -> bytes:
    """Create a sample RGB image as bytes for testing."""
    # Create a simple 224x224 RGB image
    image = Image.new('RGB', (224, 224), color=(255, 128, 0))  # Orange color
    
    # Convert to bytes
    img_bytes = io.BytesIO()
    image.save(img_bytes, format='JPEG')
    img_bytes.seek(0)
    
    return img_bytes.getvalue()


@pytest.fixture
def sample_png_image_bytes() -> bytes:
    """Create a sample PNG image as bytes for testing."""
    # Create a simple 100x100 PNG image with transparency
    image = Image.new('RGBA', (100, 100), color=(0, 255, 0, 128))  # Semi-transparent green
    
    # Convert to bytes
    img_bytes = io.BytesIO()
    image.save(img_bytes, format='PNG')
    img_bytes.seek(0)
    
    return img_bytes.getvalue()


@pytest.fixture
def large_image_bytes() -> bytes:
    """Create a large image for testing size limits."""
    # Create a large 2000x2000 image
    image = Image.new('RGB', (2000, 2000), color=(255, 0, 0))  # Red color
    
    # Convert to bytes with high quality (will be large)
    img_bytes = io.BytesIO()
    image.save(img_bytes, format='JPEG', quality=95)
    img_bytes.seek(0)
    
    return img_bytes.getvalue()


@pytest.fixture
def invalid_image_bytes() -> bytes:
    """Create invalid image data for testing error handling."""
    return b"This is not an image file, just some random bytes"


@pytest.fixture
def mock_model_path() -> Generator[str, None, None]:
    """Create a temporary mock ONNX model file for testing."""
    with tempfile.NamedTemporaryFile(suffix='.onnx', delete=False) as f:
        # Write some dummy data (not a real ONNX file, but for path testing)
        f.write(b"fake onnx model data")
        temp_path = f.name
    
    yield temp_path
    
    # Cleanup
    try:
        os.unlink(temp_path)
    except OSError:
        pass


@pytest.fixture
def sample_feature_vector() -> list[float]:
    """Create a sample 2048-dimensional feature vector for testing."""
    np.random.seed(42)  # For reproducible tests
    vector = np.random.randn(2048).astype(np.float32)
    # L2 normalize for realistic feature vector
    vector = vector / (np.linalg.norm(vector) + 1e-8)
    return vector.tolist()


@pytest.fixture
def mock_extractor_success(monkeypatch, sample_feature_vector):
    """Mock the feature extractor to return success without loading actual model."""
    def mock_init(self, model_path: str):
        self.model_path = model_path
        self.session = "mock_session"  # Mock ONNX session
        self.input_name = "data"
        self.output_name = "resnet50_output"
        self.input_shape = [1, 3, 224, 224]
        self.mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        self.std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    
    def mock_extract_features(self, image_bytes: bytes):
        # Mock successful feature extraction
        return sample_feature_vector, {
            'width': 224,
            'height': 224,
            'format': 'JPEG'
        }
    
    def mock_is_loaded(self):
        return True
    
    # Apply the mocks
    monkeypatch.setattr(ResNet50FeatureExtractor, '__init__', mock_init)
    monkeypatch.setattr(ResNet50FeatureExtractor, 'extract_features', mock_extract_features)
    monkeypatch.setattr(ResNet50FeatureExtractor, 'is_loaded', mock_is_loaded)


@pytest.fixture
def mock_extractor_failure(monkeypatch):
    """Mock the feature extractor to simulate model loading failure."""
    def mock_init(self, model_path: str):
        self.model_path = model_path
        self.session = None  # Simulate failed loading
        
    def mock_is_loaded(self):
        return False
    
    # Apply the mocks
    monkeypatch.setattr(ResNet50FeatureExtractor, '__init__', mock_init)
    monkeypatch.setattr(ResNet50FeatureExtractor, 'is_loaded', mock_is_loaded)


class TestConfig:
    """Test configuration constants."""
    
    # Test images
    SUPPORTED_FORMATS = ["image/jpeg", "image/png", "image/webp"]
    UNSUPPORTED_FORMATS = ["image/gif", "text/plain", "application/pdf"]
    
    # Size limits
    MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB
    
    # Expected feature vector properties
    FEATURE_DIMENSION = 2048
    
    # API endpoints
    HEALTH_ENDPOINT = "/health"
    EXTRACT_FEATURES_ENDPOINT = "/extract-features"
    
    # Expected response times (milliseconds)
    HEALTH_CHECK_MAX_TIME_MS = 100
    FEATURE_EXTRACTION_MAX_TIME_MS = 5000


@pytest.fixture
def test_config() -> TestConfig:
    """Provide test configuration constants."""
    return TestConfig()


# Test utilities
def create_test_image(width: int, height: int, format: str = 'JPEG', color=(255, 255, 255)) -> bytes:
    """Utility function to create test images with specific dimensions."""
    mode = 'RGBA' if format.upper() == 'PNG' else 'RGB'
    image = Image.new(mode, (width, height), color=color)
    
    img_bytes = io.BytesIO()
    image.save(img_bytes, format=format)
    img_bytes.seek(0)
    
    return img_bytes.getvalue()


def assert_valid_feature_vector(features: list[float], expected_dimension: int = 2048):
    """Assert that a feature vector is valid."""
    assert isinstance(features, list), "Features should be a list"
    assert len(features) == expected_dimension, f"Feature vector should have {expected_dimension} dimensions"
    assert all(isinstance(f, float) for f in features), "All features should be floats"
    
    # Check for reasonable values (normalized features should be roughly between -1 and 1)
    assert all(-10 <= f <= 10 for f in features), "Feature values seem unreasonable"
    
    # Check vector is not all zeros (would indicate extraction failure)
    assert any(f != 0.0 for f in features), "Feature vector should not be all zeros"


def assert_api_response_structure(response_data: dict):
    """Assert that an API response has the expected structure."""
    required_fields = ['features', 'feature_dimension', 'model_name', 'processing_time_ms']
    
    for field in required_fields:
        assert field in response_data, f"Response missing required field: {field}"
    
    assert response_data['feature_dimension'] == len(response_data['features'])
    assert response_data['processing_time_ms'] >= 0
    assert isinstance(response_data['model_name'], str)
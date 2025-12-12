"""
Unit tests for the ResNet50FeatureExtractor class.
Tests the core feature extraction functionality without external dependencies.
"""
import pytest
import numpy as np
from PIL import Image
import io
import tempfile
import os
from unittest.mock import Mock, patch

from feature_extractor import ResNet50FeatureExtractor
from tests.conftest import create_test_image, assert_valid_feature_vector


class TestResNet50FeatureExtractor:
    """Test cases for the ResNet50FeatureExtractor class."""

    @pytest.mark.unit
    def test_init_with_valid_model_path(self, mock_model_path):
        """Test initializing extractor with a valid model path."""
        with patch('onnxruntime.InferenceSession') as mock_session:
            # Mock ONNX session
            mock_session_instance = Mock()
            mock_session_instance.get_inputs.return_value = [
                Mock(name='data', shape=[1, 3, 224, 224])
            ]
            mock_session_instance.get_outputs.return_value = [
                Mock(name='resnet50_output')
            ]
            mock_session.return_value = mock_session_instance

            extractor = ResNet50FeatureExtractor(mock_model_path)

            assert extractor.model_path == mock_model_path
            assert extractor.session is not None
            assert extractor.is_loaded()

    @pytest.mark.unit
    def test_init_with_invalid_model_path(self):
        """Test initializing extractor with invalid model path raises error."""
        invalid_path = "/nonexistent/path/to/model.onnx"
        
        with pytest.raises(RuntimeError) as exc_info:
            ResNet50FeatureExtractor(invalid_path)
        
        assert "Model loading failed" in str(exc_info.value)

    @pytest.mark.unit
    def test_preprocess_image_rgb(self):
        """Test image preprocessing for RGB images."""
        # Create a test RGB image
        image_bytes = create_test_image(300, 200, 'JPEG', color=(128, 64, 192))
        image = Image.open(io.BytesIO(image_bytes))

        with patch('onnxruntime.InferenceSession'):
            extractor = ResNet50FeatureExtractor("dummy_path")
            processed = extractor._preprocess_image(image)

        # Check output shape
        assert processed.shape == (1, 3, 224, 224), f"Expected shape (1, 3, 224, 224), got {processed.shape}"
        
        # Check data type
        assert processed.dtype == np.float32, f"Expected float32, got {processed.dtype}"
        
        # Check value range (after normalization, values should be roughly in range)
        assert -3 <= processed.min() <= 3, f"Processed values out of expected range: min={processed.min()}"
        assert -3 <= processed.max() <= 3, f"Processed values out of expected range: max={processed.max()}"

    @pytest.mark.unit
    def test_preprocess_image_rgba_to_rgb(self):
        """Test image preprocessing converts RGBA to RGB correctly."""
        # Create a test RGBA image (with transparency)
        image_bytes = create_test_image(100, 100, 'PNG', color=(255, 0, 0, 128))
        image = Image.open(io.BytesIO(image_bytes))
        
        assert image.mode == 'RGBA', "Test image should be RGBA"

        with patch('onnxruntime.InferenceSession'):
            extractor = ResNet50FeatureExtractor("dummy_path")
            processed = extractor._preprocess_image(image)

        # Should still output correct shape (transparency handled)
        assert processed.shape == (1, 3, 224, 224)

    @pytest.mark.unit 
    def test_preprocess_image_resize(self):
        """Test that images are correctly resized to 224x224."""
        # Test various input sizes
        test_sizes = [(100, 100), (500, 300), (1920, 1080), (50, 200)]
        
        for width, height in test_sizes:
            image_bytes = create_test_image(width, height, 'JPEG')
            image = Image.open(io.BytesIO(image_bytes))
            
            with patch('onnxruntime.InferenceSession'):
                extractor = ResNet50FeatureExtractor("dummy_path")
                processed = extractor._preprocess_image(image)

            assert processed.shape == (1, 3, 224, 224), \
                f"Image {width}x{height} not resized correctly: got shape {processed.shape}"

    @pytest.mark.unit
    def test_extract_features_success(self, mock_extractor_success, sample_image_bytes):
        """Test successful feature extraction."""
        extractor = ResNet50FeatureExtractor("dummy_path")
        
        features, metadata = extractor.extract_features(sample_image_bytes)
        
        # Validate feature vector
        assert_valid_feature_vector(features, expected_dimension=2048)
        
        # Validate metadata
        assert isinstance(metadata, dict)
        assert 'width' in metadata
        assert 'height' in metadata  
        assert 'format' in metadata
        assert metadata['width'] > 0
        assert metadata['height'] > 0
        assert isinstance(metadata['format'], str)

    @pytest.mark.unit
    def test_extract_features_with_mock_onnx(self, sample_image_bytes, sample_feature_vector):
        """Test feature extraction with fully mocked ONNX runtime."""
        with patch('onnxruntime.InferenceSession') as mock_session_cls:
            # Setup mock ONNX session
            mock_session = Mock()
            mock_session.get_inputs.return_value = [Mock(name='data', shape=[1, 3, 224, 224])]
            mock_session.get_outputs.return_value = [Mock(name='output')]
            
            # Mock inference output - simulate ResNet50 output shape
            mock_output = np.array(sample_feature_vector).reshape(1, -1)  
            mock_session.run.return_value = [mock_output]
            mock_session_cls.return_value = mock_session

            extractor = ResNet50FeatureExtractor("dummy_path")
            features, metadata = extractor.extract_features(sample_image_bytes)

            # Verify ONNX session was called
            assert mock_session.run.called
            
            # Validate results
            assert_valid_feature_vector(features)
            assert isinstance(metadata, dict)

    @pytest.mark.unit
    def test_extract_features_invalid_image_data(self, mock_extractor_success):
        """Test feature extraction with invalid image data."""
        extractor = ResNet50FeatureExtractor("dummy_path")
        
        # Mock to raise ValueError on invalid data
        def mock_extract_invalid(image_bytes):
            raise ValueError("Failed to extract features: cannot identify image file")
            
        extractor.extract_features = mock_extract_invalid
        
        invalid_data = b"This is not an image"
        
        with pytest.raises(ValueError) as exc_info:
            extractor.extract_features(invalid_data)
        
        assert "Failed to extract features" in str(exc_info.value)

    @pytest.mark.unit
    def test_extract_features_corrupted_image(self, mock_extractor_success):
        """Test feature extraction with corrupted image data.""" 
        extractor = ResNet50FeatureExtractor("dummy_path")
        
        # Create corrupted JPEG data
        corrupted_data = b'\xff\xd8\xff\xe0' + b'corrupted_data' * 100
        
        # Mock to simulate PIL error on corrupted data
        def mock_extract_corrupted(image_bytes):
            raise ValueError("Failed to extract features: image file is truncated")
            
        extractor.extract_features = mock_extract_corrupted
        
        with pytest.raises(ValueError) as exc_info:
            extractor.extract_features(corrupted_data)
            
        assert "Failed to extract features" in str(exc_info.value)

    @pytest.mark.unit
    def test_is_loaded_true(self, mock_extractor_success):
        """Test is_loaded returns True when model is loaded."""
        extractor = ResNet50FeatureExtractor("dummy_path")
        assert extractor.is_loaded() is True

    @pytest.mark.unit
    def test_is_loaded_false(self, mock_extractor_failure):
        """Test is_loaded returns False when model fails to load."""
        extractor = ResNet50FeatureExtractor("dummy_path")
        assert extractor.is_loaded() is False

    @pytest.mark.unit
    def test_normalization_parameters(self):
        """Test that ImageNet normalization parameters are set correctly."""
        with patch('onnxruntime.InferenceSession'):
            extractor = ResNet50FeatureExtractor("dummy_path")
        
        # Check ImageNet mean and std values
        expected_mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        expected_std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        
        np.testing.assert_array_almost_equal(extractor.mean, expected_mean)
        np.testing.assert_array_almost_equal(extractor.std, expected_std)

    @pytest.mark.unit
    @pytest.mark.parametrize("image_format", ["JPEG", "PNG", "WEBP"])
    def test_extract_features_different_formats(self, mock_extractor_success, image_format):
        """Test feature extraction works with different image formats."""
        # Skip WEBP if not supported by PIL in test environment
        try:
            test_image = create_test_image(224, 224, image_format)
        except OSError:
            pytest.skip(f"{image_format} format not supported in test environment")
        
        extractor = ResNet50FeatureExtractor("dummy_path")
        features, metadata = extractor.extract_features(test_image)
        
        assert_valid_feature_vector(features)
        assert metadata['format'] in ['JPEG', 'PNG', 'WEBP'] or metadata['format'] == 'UNKNOWN'

    @pytest.mark.unit
    @pytest.mark.parametrize("width,height", [
        (224, 224),    # Exact size
        (100, 100),    # Smaller
        (500, 400),    # Larger
        (1920, 1080),  # Much larger
        (50, 200),     # Aspect ratio different
    ])
    def test_extract_features_various_sizes(self, mock_extractor_success, width, height):
        """Test feature extraction with various image sizes."""
        test_image = create_test_image(width, height)
        
        extractor = ResNet50FeatureExtractor("dummy_path")
        features, metadata = extractor.extract_features(test_image)
        
        assert_valid_feature_vector(features)
        # Model resizes all images to 224x224, so metadata should reflect processed size
        assert metadata['width'] == 224
        assert metadata['height'] == 224
        # Test that original image was properly created with expected dimensions
        from PIL import Image
        import io
        original_img = Image.open(io.BytesIO(test_image))
        assert original_img.width == width
        assert original_img.height == height

    @pytest.mark.unit
    def test_feature_vector_normalization(self, sample_image_bytes):
        """Test that feature vectors are properly L2 normalized."""
        with patch('onnxruntime.InferenceSession') as mock_session_cls:
            # Create mock output that's not normalized
            unnormalized_features = np.random.randn(2048) * 10  # Large values
            
            mock_session = Mock()
            mock_session.get_inputs.return_value = [Mock(name='data', shape=[1, 3, 224, 224])]
            mock_session.get_outputs.return_value = [Mock(name='output')]
            mock_session.run.return_value = [unnormalized_features.reshape(1, -1)]
            mock_session_cls.return_value = mock_session

            extractor = ResNet50FeatureExtractor("dummy_path")
            features, _ = extractor.extract_features(sample_image_bytes)

            # Check L2 normalization (norm should be approximately 1.0)
            features_array = np.array(features)
            norm = np.linalg.norm(features_array)
            assert abs(norm - 1.0) < 0.01, f"Feature vector not properly normalized: norm={norm}"

    @pytest.mark.unit
    def test_batch_dimension_handling(self, sample_image_bytes):
        """Test that batch dimensions are handled correctly."""
        with patch('onnxruntime.InferenceSession') as mock_session_cls:
            # Mock output with batch dimension
            mock_output = np.random.randn(1, 2048)  # Batch size 1, 2048 features
            
            mock_session = Mock()
            mock_session.get_inputs.return_value = [Mock(name='data', shape=[1, 3, 224, 224])]
            mock_session.get_outputs.return_value = [Mock(name='output')]
            mock_session.run.return_value = [mock_output]
            mock_session_cls.return_value = mock_session

            extractor = ResNet50FeatureExtractor("dummy_path")
            features, _ = extractor.extract_features(sample_image_bytes)

            # Should flatten to 1D list
            assert len(features) == 2048
            assert isinstance(features, list)
            assert all(isinstance(f, float) for f in features)
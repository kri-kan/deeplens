"""
Unit tests for configuration module.
Tests settings loading and validation.
"""
import pytest
import os
from unittest.mock import patch

from config import Settings, ModelConfig


class TestModelConfig:
    """Test cases for ModelConfig class."""

    @pytest.mark.unit
    def test_model_config_creation(self):
        """Test creating a ModelConfig with valid parameters."""
        config = ModelConfig(
            model_name="test_model",
            model_version="v1.0",
            feature_dimension=512,
            input_size=(224, 224),
            description="Test model"
        )

        assert config.model_name == "test_model"
        assert config.model_version == "v1.0"
        assert config.feature_dimension == 512
        assert config.input_size == (224, 224)
        assert config.description == "Test model"

    @pytest.mark.unit
    def test_model_config_defaults(self):
        """Test ModelConfig uses correct defaults."""
        config = ModelConfig(
            model_name="minimal_model",
            feature_dimension=128
        )

        assert config.model_version == "v1.0"
        assert config.input_size == (224, 224)
        assert config.normalization_mean == [0.485, 0.456, 0.406]
        assert config.normalization_std == [0.229, 0.224, 0.225]
        assert config.model_file == ""
        assert config.description == ""


class TestSettings:
    """Test cases for Settings class."""

    @pytest.mark.unit
    def test_default_settings(self):
        """Test default settings values."""
        settings = Settings()

        # Service configuration
        assert settings.service_name == "feature-extraction-service"
        assert settings.service_version == "0.1.0"
        assert settings.host == "0.0.0.0"
        assert settings.port == 8001

        # Model configuration
        assert settings.model_name == "resnet50"
        assert settings.model_version == "v2.7"
        assert settings.feature_dimension == 2048
        assert settings.model_path == "/app/models/resnet50-v2-7.onnx"

        # Performance settings
        assert settings.batch_size == 1
        assert settings.max_image_size == 10 * 1024 * 1024
        assert "image/jpeg" in settings.supported_formats
        assert "image/png" in settings.supported_formats

        # Authentication (disabled by default)
        assert settings.enable_auth is False
        assert settings.jwt_issuer is None

    @pytest.mark.unit
    def test_current_model_info_property(self):
        """Test current_model_info property returns correct information."""
        settings = Settings()
        
        model_info = settings.current_model_info
        
        assert isinstance(model_info, dict)
        assert model_info["model_name"] == "resnet50"
        assert model_info["model_version"] == "v2.7"
        assert model_info["feature_dimension"] == 2048
        assert model_info["input_size"] == (224, 224)
        assert "description" in model_info

    @pytest.mark.unit
    def test_settings_with_environment_variables(self):
        """Test settings loading from environment variables."""
        env_vars = {
            "SERVICE_NAME": "custom-service",
            "SERVICE_VERSION": "2.0.0",
            "HOST": "127.0.0.1", 
            "PORT": "8080",
            "MODEL_NAME": "custom_model",
            "FEATURE_DIMENSION": "512",
            "ENABLE_AUTH": "true",
            "LOG_LEVEL": "DEBUG"
        }
        
        with patch.dict(os.environ, env_vars):
            settings = Settings()

            assert settings.service_name == "custom-service"
            assert settings.service_version == "2.0.0"
            assert settings.host == "127.0.0.1"
            assert settings.port == 8080
            assert settings.model_name == "custom_model"
            assert settings.feature_dimension == 512
            assert settings.enable_auth is True
            assert settings.log_level == "DEBUG"

    @pytest.mark.unit
    def test_normalization_parameters(self):
        """Test ImageNet normalization parameters are correct."""
        settings = Settings()

        # Standard ImageNet mean and std
        expected_mean = [0.485, 0.456, 0.406]
        expected_std = [0.229, 0.224, 0.225]

        assert settings.normalization_mean == expected_mean
        assert settings.normalization_std == expected_std

    @pytest.mark.unit
    def test_supported_formats_list(self):
        """Test supported image formats list."""
        settings = Settings()

        expected_formats = ["image/jpeg", "image/png", "image/webp"]
        
        for format_type in expected_formats:
            assert format_type in settings.supported_formats

    @pytest.mark.unit 
    def test_input_size_tuple(self):
        """Test input size is correct tuple format."""
        settings = Settings()

        assert isinstance(settings.input_size, tuple)
        assert len(settings.input_size) == 2
        assert settings.input_size == (224, 224)

    @pytest.mark.unit
    def test_performance_settings_types(self):
        """Test performance settings have correct types."""
        settings = Settings()

        assert isinstance(settings.batch_size, int)
        assert isinstance(settings.max_image_size, int)
        assert isinstance(settings.supported_formats, list)
        
        assert settings.batch_size > 0
        assert settings.max_image_size > 0

    @pytest.mark.unit
    def test_authentication_settings(self):
        """Test authentication-related settings."""
        settings = Settings()

        # Default values
        assert settings.enable_auth is False
        assert settings.jwt_issuer is None
        assert settings.jwt_audience is None
        assert settings.jwks_url is None

        # Test with environment variables
        auth_env = {
            "ENABLE_AUTH": "true",
            "JWT_ISSUER": "https://identity.example.com",
            "JWT_AUDIENCE": "feature-extraction-service",
            "JWKS_URL": "https://identity.example.com/.well-known/jwks.json"
        }
        
        with patch.dict(os.environ, auth_env):
            auth_settings = Settings()
            
            assert auth_settings.enable_auth is True
            assert auth_settings.jwt_issuer == "https://identity.example.com"
            assert auth_settings.jwt_audience == "feature-extraction-service"
            assert auth_settings.jwks_url == "https://identity.example.com/.well-known/jwks.json"

    @pytest.mark.unit
    def test_case_insensitive_env_vars(self):
        """Test that environment variable names are case insensitive."""
        env_vars = {
            "service_name": "lowercase-service",  # lowercase
            "SERVICE_VERSION": "1.5.0",          # uppercase
            "Port": "9000"                       # mixed case
        }
        
        with patch.dict(os.environ, env_vars):
            settings = Settings()
            
            # All should work due to case_sensitive = False
            assert settings.service_name == "lowercase-service"
            assert settings.service_version == "1.5.0"
            assert settings.port == 9000

    @pytest.mark.unit
    def test_model_path_formats(self):
        """Test different model path formats."""
        # Test default
        settings = Settings()
        assert settings.model_path.endswith(".onnx")
        
        # Test with environment variable
        with patch.dict(os.environ, {"MODEL_PATH": "/custom/path/model.onnx"}):
            custom_settings = Settings()
            assert custom_settings.model_path == "/custom/path/model.onnx"

    @pytest.mark.unit
    def test_port_validation(self):
        """Test port number validation."""
        # Valid ports
        for port in ["8001", "8080", "3000"]:
            with patch.dict(os.environ, {"PORT": port}):
                settings = Settings()
                assert settings.port == int(port)

        # Invalid port (should use default or raise error)
        with patch.dict(os.environ, {"PORT": "not_a_number"}):
            with pytest.raises((ValueError, TypeError)):
                Settings()

    @pytest.mark.unit
    def test_feature_dimension_validation(self):
        """Test feature dimension validation."""
        # Valid dimensions
        for dim in ["512", "2048", "4096"]:
            with patch.dict(os.environ, {"FEATURE_DIMENSION": dim}):
                settings = Settings()
                assert settings.feature_dimension == int(dim)

        # Invalid dimension
        with patch.dict(os.environ, {"FEATURE_DIMENSION": "invalid"}):
            with pytest.raises((ValueError, TypeError)):
                Settings()
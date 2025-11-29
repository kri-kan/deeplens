"""
Configuration module for Feature Extraction Service
Stateless ML inference service for image feature extraction using ResNet50.
Loads settings from environment variables with defaults for development.
"""
from pydantic import BaseModel
from pydantic_settings import BaseSettings
from typing import Optional, Dict, List, Tuple


class ModelConfig(BaseModel):
    """Configuration for a specific ML model"""
    model_name: str
    model_version: str = "v1.0"
    feature_dimension: int
    input_size: Tuple[int, int] = (224, 224)
    normalization_mean: List[float] = [0.485, 0.456, 0.406]  # ImageNet defaults
    normalization_std: List[float] = [0.229, 0.224, 0.225]   # ImageNet defaults
    model_file: str = ""
    description: str = ""


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Service Configuration
    service_name: str = "feature-extraction-service"
    service_version: str = "1.0.0"
    host: str = "0.0.0.0"
    port: int = 8001  # Python services use 8xxx range (8001, 8002, etc.)
    
    # Model Configuration (ResNet50)
    model_name: str = "resnet50"
    model_version: str = "v2.7"
    model_path: str = "/app/models/resnet50-v2-7.onnx"
    feature_dimension: int = 2048
    
    # Model-specific parameters
    input_size: Tuple[int, int] = (224, 224)
    normalization_mean: List[float] = [0.485, 0.456, 0.406]  # ImageNet defaults
    normalization_std: List[float] = [0.229, 0.224, 0.225]   # ImageNet defaults
    
    # Model configuration
    @property
    def current_model_info(self) -> Dict[str, any]:
        """Current model information"""
        return {
            "model_name": self.model_name,
            "model_version": self.model_version,
            "feature_dimension": self.feature_dimension,
            "input_size": self.input_size,
            "description": "ResNet50 v2.7 pre-trained on ImageNet"
        }
    
    # Performance Configuration
    batch_size: int = 1
    max_image_size: int = 10 * 1024 * 1024  # 10 MB
    supported_formats: list[str] = ["image/jpeg", "image/png", "image/webp"]
    
    # Authentication (Future enhancement)
    enable_auth: bool = False
    jwt_issuer: Optional[str] = None
    jwt_audience: Optional[str] = None
    jwks_url: Optional[str] = None
    
    # Logging
    log_level: str = "INFO"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()

"""
Data models for Feature Extraction Service API
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Tuple


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    service: str
    version: str
    model_loaded: bool


class ExtractFeaturesRequest(BaseModel):
    """Request model for feature extraction"""
    image_id: Optional[str] = Field(None, description="Optional image identifier")
    return_metadata: bool = Field(False, description="Whether to return image metadata")


class ExtractFeaturesResponse(BaseModel):
    """Response model for feature extraction"""
    image_id: Optional[str] = Field(None, description="Image identifier if provided")
    features: List[float] = Field(..., description="Feature vector extracted from image (2048 dimensions)")
    feature_dimension: int = Field(2048, description="Dimension of feature vector")
    model_name: str = Field("resnet50", description="Model used for extraction")
    model_version: str = Field("v2.7", description="Version of the model used")
    processing_time_ms: float = Field(..., description="Processing time in milliseconds")
    
    # Optional image metadata
    image_width: Optional[int] = None
    image_height: Optional[int] = None
    image_format: Optional[str] = None
    



class ErrorResponse(BaseModel):
    """Error response model"""
    error: str
    detail: Optional[str] = None
    error_code: Optional[str] = None

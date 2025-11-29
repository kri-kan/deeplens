"""
Feature Extraction Service - FastAPI Application
Stateless ML inference service providing REST API for extracting ResNet50 features from images.
Part of DeepLens distributed architecture - handles only feature extraction, no data storage.
"""
import logging
import time
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.responses import JSONResponse
from pythonjsonlogger import jsonlogger

from config import settings
from models import (
    HealthResponse,
    ExtractFeaturesResponse,
    ErrorResponse
)
from feature_extractor import ResNet50FeatureExtractor

# Configure logging
logger = logging.getLogger()
logHandler = logging.StreamHandler()
formatter = jsonlogger.JsonFormatter(
    '%(asctime)s %(name)s %(levelname)s %(message)s'
)
logHandler.setFormatter(formatter)
logger.addHandler(logHandler)
logger.setLevel(settings.log_level)

# Global feature extractor instance
feature_extractor: Optional[ResNet50FeatureExtractor] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events"""
    global feature_extractor
    
    # Startup
    logger.info(f"Starting {settings.service_name} v{settings.service_version}")
    logger.info(f"Model path: {settings.model_path}")
    logger.info(f"Authentication enabled: {settings.enable_auth}")
    
    try:
        feature_extractor = ResNet50FeatureExtractor(settings.model_path)
        logger.info("Feature extractor initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize feature extractor: {str(e)}")
        # Note: In production, you might want to fail fast here
        # For development, we'll allow startup to continue
    
    yield
    
    # Shutdown
    logger.info(f"Shutting down {settings.service_name}")


# Create FastAPI app
app = FastAPI(
    title="Feature Extraction Service",
    description="Extracts deep learning features from images for similarity search",
    version=settings.service_version,
    lifespan=lifespan
)


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint
    Returns service status and model availability
    """
    return HealthResponse(
        status="healthy",
        service=settings.service_name,
        version=settings.service_version,
        model_loaded=feature_extractor is not None and feature_extractor.is_loaded()
    )


@app.post(
    "/extract-features",
    response_model=ExtractFeaturesResponse,
    responses={
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse}
    }
)
async def extract_features(
    file: UploadFile = File(..., description="Image file to extract features from"),
    image_id: Optional[str] = Form(None, description="Optional image identifier"),
    return_metadata: bool = Form(False, description="Whether to return image metadata")
):
    """
    Extract feature vector from an uploaded image
    
    - **file**: Image file (JPEG, PNG, or WebP)
    - **image_id**: Optional identifier for the image
    - **return_metadata**: Whether to include image dimensions and format in response
    
    Returns a feature vector suitable for similarity search
    """
    # Check if model is loaded
    if feature_extractor is None or not feature_extractor.is_loaded():
        raise HTTPException(
            status_code=500,
            detail="Feature extraction model not available"
        )
    
    # Validate content type
    if file.content_type not in settings.supported_formats:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image format: {file.content_type}. "
                   f"Supported formats: {', '.join(settings.supported_formats)}"
        )
    
    try:
        # Read file contents
        start_time = time.time()
        image_bytes = await file.read()
        
        # Validate file size
        if len(image_bytes) > settings.max_image_size:
            raise HTTPException(
                status_code=400,
                detail=f"Image size exceeds maximum allowed size of "
                       f"{settings.max_image_size / (1024*1024):.1f} MB"
            )
        
        # Extract features
        features, metadata = feature_extractor.extract_features(image_bytes)
        
        # Calculate processing time
        processing_time_ms = (time.time() - start_time) * 1000
        
        # Build response
        response = ExtractFeaturesResponse(
            image_id=image_id,
            features=features,
            feature_dimension=len(features),
            model_name=settings.model_name,
            processing_time_ms=round(processing_time_ms, 2)
        )
        
        # Add metadata if requested
        if return_metadata:
            response.image_width = metadata['width']
            response.image_height = metadata['height']
            response.image_format = metadata['format']
        
        logger.info(
            f"Feature extraction successful",
            extra={
                'image_id': image_id,
                'feature_dimension': len(features),
                'processing_time_ms': processing_time_ms
            }
        )
        
        return response
        
    except ValueError as e:
        # Feature extraction specific errors
        logger.warning(f"Feature extraction failed: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    
    except Exception as e:
        # Unexpected errors
        logger.error(f"Unexpected error during feature extraction: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error during feature extraction"
        )


@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": settings.service_name,
        "version": settings.service_version,
        "status": "running",
        "endpoints": {
            "health": "/health",
            "extract_features": "/extract-features",
            "docs": "/docs"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
        log_level=settings.log_level.lower()
    )

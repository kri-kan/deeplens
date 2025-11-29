"""
ResNet50 Feature Extractor using ONNX Runtime
Extracts deep learning features from images for similarity search
"""
import onnxruntime as ort
import numpy as np
from PIL import Image
import io
import logging
from typing import Tuple, List, Optional

logger = logging.getLogger(__name__)


class ResNet50FeatureExtractor:
    """
    Feature extractor using ResNet50 model in ONNX format.
    Extracts 2048-dimensional feature vectors from images.
    """
    
    def __init__(self, model_path: str):
        """
        Initialize the feature extractor with ONNX model
        
        Args:
            model_path: Path to the ONNX model file
        """
        self.model_path = model_path
        self.session: Optional[ort.InferenceSession] = None
        self.input_name: Optional[str] = None
        self.output_name: Optional[str] = None
        self.input_shape: Optional[Tuple[int, ...]] = None
        
        # ImageNet normalization parameters
        self.mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        self.std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        
        self._load_model()
    
    def _load_model(self) -> None:
        """Load the ONNX model and configure inference session"""
        try:
            logger.info(f"Loading ONNX model from: {self.model_path}")
            
            # Create inference session with CPU provider
            sess_options = ort.SessionOptions()
            sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
            
            self.session = ort.InferenceSession(
                self.model_path,
                sess_options=sess_options,
                providers=['CPUExecutionProvider']
            )
            
            # Get input/output names and shapes
            self.input_name = self.session.get_inputs()[0].name
            self.output_name = self.session.get_outputs()[0].name
            self.input_shape = self.session.get_inputs()[0].shape
            
            logger.info(f"Model loaded successfully")
            logger.info(f"Input: {self.input_name}, Shape: {self.input_shape}")
            logger.info(f"Output: {self.output_name}")
            
        except Exception as e:
            logger.error(f"Failed to load model: {str(e)}")
            raise RuntimeError(f"Model loading failed: {str(e)}")
    
    def _preprocess_image(self, image: Image.Image) -> np.ndarray:
        """
        Preprocess image for ResNet50 model
        
        Args:
            image: PIL Image object
            
        Returns:
            Preprocessed image tensor (1, 3, 224, 224)
        """
        # Resize to 224x224
        image = image.convert('RGB')
        image = image.resize((224, 224), Image.Resampling.BILINEAR)
        
        # Convert to numpy array and normalize to [0, 1]
        img_array = np.array(image, dtype=np.float32) / 255.0
        
        # Apply ImageNet normalization
        img_array = (img_array - self.mean) / self.std
        
        # Convert from HWC to CHW format
        img_array = np.transpose(img_array, (2, 0, 1))
        
        # Add batch dimension
        img_array = np.expand_dims(img_array, axis=0)
        
        return img_array
    
    def extract_features(self, image_bytes: bytes) -> Tuple[List[float], dict]:
        """
        Extract feature vector from image bytes
        
        Args:
            image_bytes: Raw image bytes
            
        Returns:
            Tuple of (feature_vector, metadata)
            - feature_vector: List of floats representing the feature vector
            - metadata: Dictionary with image metadata (width, height, format)
        """
        try:
            # Load image from bytes
            image = Image.open(io.BytesIO(image_bytes))
            
            # Extract metadata
            metadata = {
                'width': image.width,
                'height': image.height,
                'format': image.format or 'UNKNOWN'
            }
            
            # Preprocess image
            input_tensor = self._preprocess_image(image)
            
            # Run inference
            outputs = self.session.run(
                [self.output_name],
                {self.input_name: input_tensor}
            )
            
            # Extract feature vector (remove batch dimension and flatten)
            features = outputs[0].flatten()
            
            # Convert to list and normalize (L2 normalization for cosine similarity)
            features = features / (np.linalg.norm(features) + 1e-8)
            feature_list = features.tolist()
            
            return feature_list, metadata
            
        except Exception as e:
            logger.error(f"Feature extraction failed: {str(e)}")
            raise ValueError(f"Failed to extract features: {str(e)}")
    
    def is_loaded(self) -> bool:
        """Check if model is loaded and ready"""
        return self.session is not None

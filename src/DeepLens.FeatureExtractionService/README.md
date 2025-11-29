# Feature Extraction Service

Deep learning feature extraction service for image similarity search. Extracts 2048-dimensional feature vectors from images using ResNet50 model in ONNX format.

## Features

- **ResNet50 Feature Extraction**: Extract deep learning features using pre-trained ResNet50 model
- **ONNX Runtime**: Optimized inference with ONNX Runtime
- **REST API**: Simple HTTP API for feature extraction
- **No Authentication (Phase 1)**: Development-first approach, auth added in Phase 2
- **Health Checks**: Built-in health check endpoint
- **Structured Logging**: JSON-formatted logs for observability

## API Endpoints

### Health Check
```
GET /health
```
Returns service status and model availability.

### Extract Features
```
POST /extract-features
```
Extract feature vector from an uploaded image.

**Request:**
- `file`: Image file (multipart/form-data) - Required
- `image_id`: Optional identifier for the image - Optional
- `return_metadata`: Whether to return image metadata (width, height, format) - Optional

**Response:**
```json
{
  "image_id": "optional-id",
  "features": [0.123, 0.456, ...],  // 2048-dimensional vector
  "feature_dimension": 2048,
  "model_name": "resnet50",
  "processing_time_ms": 125.43,
  "image_width": 1920,      // if return_metadata=true
  "image_height": 1080,     // if return_metadata=true
  "image_format": "JPEG"    // if return_metadata=true
}
```

## Setup

### Prerequisites
- Python 3.11+
- ResNet50 ONNX model file

### Installation

#### Quick Setup (Recommended)

Run the automated setup script:
```powershell
.\setup-dev-environment.ps1
```

This will:
- Check Python installation (3.11+ required)
- Create a virtual environment
- Install all dependencies
- Create `.env` file from template
- Optionally download the ResNet50 ONNX model

Then activate the environment and run:
```powershell
.\venv\Scripts\Activate.ps1
python main.py
```

#### Manual Setup

1. Create and activate virtual environment:
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

2. Install dependencies:
```powershell
pip install -r requirements.txt
```

3. Download ResNet50 ONNX model:
```powershell
.\download-model.ps1
```

4. Configure environment:
```powershell
Copy-Item .env.example .env
# Edit .env with your configuration
```

5. Run the service:
```powershell
# Development mode with auto-reload
python main.py

# Or using uvicorn directly
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

#### VS Code Debugging

Press `F5` in VS Code to start debugging with breakpoints. The `.vscode/launch.json` is pre-configured for FastAPI development.

### Docker

Build and run with Docker:

```bash
# Build image
docker build -t feature-extraction-service:latest .

# Run container (mount model directory)
docker run -p 8001:8001 \
  -v $(pwd)/models:/app/models \
  -e MODEL_PATH=/app/models/resnet50-v2-7.onnx \
  feature-extraction-service:latest
```

## Configuration

Configuration is managed through environment variables or `.env` file:

| Variable | Description | Default |
|----------|-------------|---------|
| `SERVICE_NAME` | Service name | `feature-extraction-service` |
| `SERVICE_VERSION` | Service version | `0.1.0` |
| `HOST` | Bind host | `0.0.0.0` |
| `PORT` | Bind port | `8001` (Python services use 8xxx) |
| `MODEL_PATH` | Path to ONNX model | `/app/models/resnet50-v2-7.onnx` |
| `MODEL_NAME` | Model identifier | `resnet50` |
| `FEATURE_DIMENSION` | Output dimension | `2048` |
| `MAX_IMAGE_SIZE` | Max image size (bytes) | `10485760` (10 MB) |
| `ENABLE_AUTH` | Enable JWT auth (Phase 2) | `false` |
| `LOG_LEVEL` | Logging level | `INFO` |

## Usage Examples

### cURL

```bash
# Extract features from image
curl -X POST "http://localhost:8001/extract-features" \
  -F "file=@image.jpg" \
  -F "image_id=img_001" \
  -F "return_metadata=true"

# Health check
curl http://localhost:8001/health
```

### Python

```python
import requests

# Extract features
with open('image.jpg', 'rb') as f:
    files = {'file': f}
    data = {
        'image_id': 'img_001',
        'return_metadata': 'true'
    }
    response = requests.post(
        'http://localhost:8001/extract-features',
        files=files,
        data=data
    )
    
result = response.json()
print(f"Feature dimension: {result['feature_dimension']}")
print(f"Processing time: {result['processing_time_ms']} ms")
```

### C# (.NET)

```csharp
using var client = new HttpClient();
using var content = new MultipartFormDataContent();

// Add image file
var imageBytes = await File.ReadAllBytesAsync("image.jpg");
content.Add(new ByteArrayContent(imageBytes), "file", "image.jpg");
content.Add(new StringContent("img_001"), "image_id");
content.Add(new StringContent("true"), "return_metadata");

// Post request
var response = await client.PostAsync(
    "http://localhost:8001/extract-features",
    content
);

var result = await response.Content.ReadFromJsonAsync<ExtractFeaturesResponse>();
```

## Architecture

- **FastAPI**: Modern async web framework
- **ONNX Runtime**: Optimized model inference
- **Pydantic**: Request/response validation
- **PIL (Pillow)**: Image preprocessing
- **NumPy**: Numerical operations

## Development Roadmap

- [x] **Phase 1A**: Core feature extraction (Current)
  - ResNet50 ONNX model integration
  - REST API endpoints
  - No authentication
  
- [ ] **Phase 2A**: Authentication & Security
  - JWT token validation
  - Optional auth mode (ENABLE_AUTH)
  - IdentityServer integration
  
- [ ] **Phase 2B**: Advanced Features
  - CLIP model support
  - Batch processing
  - Model caching

## Testing

```bash
# Run with pytest (coming in Phase 1A - Task 3)
pytest tests/ -v

# Test coverage
pytest tests/ --cov=. --cov-report=html
```

## Monitoring

Service exposes structured JSON logs compatible with:
- Loki (log aggregation)
- Prometheus (metrics - future)
- OpenTelemetry (traces - future)

## License

Internal DeepLens project - Not for public distribution

## References

- [ONNX Model Zoo - ResNet50](https://github.com/onnx/models/tree/main/vision/classification/resnet)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [ONNX Runtime Python API](https://onnxruntime.ai/docs/api/python/)

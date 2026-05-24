---
name: deeplens-python-ai
description: >
  Patterns and conventions for the DeepLens Python AI services (Feature Extraction,
  Reasoning Service). Activate when working in src/DeepLens.FeatureExtractionService/
  or src/DeepLens.ReasoningService/.
---

# DeepLens Python AI Services — Developer Skill

## Overview

Two Python FastAPI microservices handle AI/ML inference:

| Service | Port | Purpose | Model |
|---|---|---|---|
| `DeepLens.FeatureExtractionService` | `8001` | Image → 2048-d vector | ResNet50 (ONNX) |
| `DeepLens.ReasoningService` | `8002` | Unstructured text → structured metadata | Phi-3 (LLM) |

Both are stateless FastAPI apps deployed via Docker in `setupscripts/application/docker-compose.yaml`.

---

## Project Structure (Feature Extraction)

```
src/DeepLens.FeatureExtractionService/
  main.py               ← FastAPI app, endpoint definitions
  feature_extractor.py  ← ONNX model loading & inference
  models.py             ← Pydantic request/response schemas
  config.py             ← Environment config (pydantic-settings)
  requirements.txt      ← Production deps
  requirements-dev.txt  ← Dev/test deps
  tests/                ← pytest test suite
```

---

## FastAPI Endpoint Pattern

```python
# main.py
from fastapi import FastAPI, File, UploadFile, HTTPException
from models import ExtractionResponse

app = FastAPI(title="DeepLens Feature Extraction Service")

@app.post("/extract-features", response_model=ExtractionResponse)
async def extract_features(file: UploadFile = File(...)):
    """Extract feature vectors from an uploaded image."""
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    image_bytes = await file.read()
    vector = feature_extractor.extract(image_bytes)
    
    return ExtractionResponse(
        vector=vector,
        dimensions=len(vector),
        model="resnet50-onnx"
    )

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "model_loaded": feature_extractor.is_loaded()
    }
```

---

## Pydantic Models for Request/Response

```python
# models.py
from pydantic import BaseModel
from typing import List

class ExtractionResponse(BaseModel):
    vector: List[float]
    dimensions: int
    model: str

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
```

---

## ONNX Runtime Inference Pattern

```python
# feature_extractor.py
import onnxruntime as ort
import numpy as np
from PIL import Image
import io

class FeatureExtractor:
    def __init__(self, model_path: str):
        self.session = ort.InferenceSession(model_path)
        self._loaded = True

    def extract(self, image_bytes: bytes) -> List[float]:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        image = image.resize((224, 224))                        # ResNet50 input size
        arr = np.array(image, dtype=np.float32) / 255.0        # Normalize to [0, 1]
        arr = (arr - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225]  # ImageNet stats
        arr = np.transpose(arr, (2, 0, 1))                      # HWC → CHW
        arr = np.expand_dims(arr, axis=0)                       # Add batch dim
        
        outputs = self.session.run(None, {"input": arr})
        return outputs[0].flatten().tolist()

    def is_loaded(self) -> bool:
        return self._loaded
```

---

## Config Pattern (pydantic-settings)

```python
# config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    model_path: str = "models/resnet50.onnx"
    host: str = "0.0.0.0"
    port: int = 8001
    log_level: str = "info"

    class Config:
        env_file = ".env"

settings = Settings()
```

---

## Virtual Environment (ALWAYS use venv)

```bash
cd src/DeepLens.FeatureExtractionService

# Create venv (first time only)
python -m venv venv

# Activate (Linux/Mac)
source venv/bin/activate

# Activate (Windows)
./venv/Scripts/Activate.ps1

# Install deps
pip install -r requirements.txt

# Run dev server
uvicorn main:app --reload --host 0.0.0.0 --port 8001
```

---

## Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=. --cov-report=html

# Run specific test
pytest tests/test_feature_extractor.py -v
```

Test strategy:
- **Unit**: Validate preprocessing transforms and model loading
- **Integration**: POST real images to `/extract-features` endpoint
- **Performance**: Target ~8-10 images/second throughput on dev hardware

---

## Adding a New AI Endpoint

1. Define the request/response Pydantic model in `models.py`
2. Implement inference logic in a new `*_extractor.py` file
3. Add the FastAPI route in `main.py`
4. Add unit tests in `tests/`
5. Update `requirements.txt` if new packages needed
6. Rebuild & redeploy via Docker:
```bash
cd setupscripts/application
docker compose build feature-extraction
docker compose up -d feature-extraction
```

---

## Kafka Consumer (Feature Extraction via Worker)

The Python service does **not** consume Kafka directly. The .NET `WorkerService` calls the Python HTTP endpoint.  
Flow: `Kafka (deeplens.features.extraction)` → `.NET Worker` → `POST /extract-features` → `.NET Worker` → `Kafka (deeplens.vectors.indexing)`

---

## Common Gotchas

1. **Always use venv** — global pip installs will conflict with system Python
2. **Model file not included in git** — download via `download-model.ps1` or Docker build
3. **ONNX model warm-up** — first inference is slow (~2-5s); subsequent calls are fast. The service pre-loads the model on startup.
4. **Image normalization** — must match ImageNet stats used during training: mean `[0.485, 0.456, 0.406]`, std `[0.229, 0.224, 0.225]`
5. **No direct Kafka access** — the Python service is a pure HTTP microservice; all event orchestration is done by the .NET Worker

---

## Related Documentation
- `src/DeepLens.FeatureExtractionService/README.md` — Setup guide
- `docs/technical/KAFKA_TOPICS.md` — How this service fits in the pipeline
- `docs/architecture/system-overview.md` — Architecture position (stateless AI sidecar)

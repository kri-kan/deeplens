# Feature Extraction Service Guide

**AI/ML specialized service for image vectorization and metadata extraction.**

Last Updated: December 20, 2025

---

## 🎯 Overview

The Feature Extraction service is a FastAPI-based Python microservice that transforms raw images into high-dimensional (2048-d) vectors using a **ResNet50** model in ONNX format.

### Key Capabilities
- **Inference**: High-speed vector generation via ONNX Runtime.
- **Image Preprocessing**: Auto-scaling and normalization of input files.
- **Health Monitoring**: Real-time status of model availability.

---

## 🚀 Quick Start

1. **Setup Environment**:
   ```bash
   python -m venv venv
   ./venv/Scripts/Activate.ps1
   pip install -r requirements.txt
   ```
2. **Download Model**:
   ```powershell
   ./download-model.ps1
   ```
3. **Run Service**:
   ```bash
   uvicorn main:app --port 8001 --reload
   ```

---

## 🧪 Testing & Validation

### Running Tests
```bash
pytest tests/ -v
```

### Testing Strategy
- **Unit Tests**: Validate image preprocessing and model loading.
- **Integration Tests**: Verify the `/extract-features` endpoint with real image samples.
- **Performance**: Validated to process ~8-10 images per second on standard developer hardware.

---

## 📊 API Reference

### `POST /extract-features`
**Request**: Multipart form-data with `file`.
**Response**:
```json
{
  "image_id": "optional-id",
  "features": [0.123, 0.456, ...],
  "feature_dimension": 2048,
  "model_name": "resnet50"
}
```

### `GET /health`
Returns `{"status": "healthy", "model_loaded": true}`.

---

## 📐 Roadmap
- [x] ResNet50 Implementation.
- [ ] CLIP Model Integration (Multi-modal).
- [ ] Batch processing API.
- [ ] OpenTelemetry Metrics integration.

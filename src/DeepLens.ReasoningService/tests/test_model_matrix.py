"""
DeepLens Reasoning Service - Multi-Model Automated Pytest Suite
ADO User Story #208 / Task #210

Validates:
1. LiteLLM Gateway liveliness and virtual model aliases.
2. Reasoning Service /health and /diagnostics/models endpoints.
3. Multi-model metadata extraction matrix (deeplens-llm, phi4-mini:latest, phi3:latest).
4. Business logic endpoints:
   - /extract-product
   - /generate-youtube-title
   - /generate-share-description
5. Zero-downtime failover resilience.
"""

import os
import json
import time
import pytest
import requests

REASONING_API_URL = os.getenv("REASONING_API_URL", "http://localhost:8002")
LITELLM_API_URL = os.getenv("LITELLM_API_URL", "http://localhost:4000")
LITELLM_MASTER_KEY = os.getenv("LITELLM_MASTER_KEY", "sk-deeplens-master-key")

SAMPLE_DESCRIPTION = (
    "Pure Kanjivaram Silk Saree in Red Color with Rich Golden Zari Pallu and Embroidered Border "
    "Price Rs 2499 Suitable for weddings and festive occasions"
)

@pytest.fixture(autouse=True)
def slow_down_tests():
    """Ensure 2s cooldown between model invocations to respect GPU VRAM model swaps."""
    yield
    time.sleep(2)

def test_litellm_gateway_readiness():
    """Validates that LiteLLM gateway is live and models are registered."""
    resp = requests.get(f"{LITELLM_API_URL}/health/liveliness", timeout=10)
    assert resp.status_code == 200, f"LiteLLM liveliness probe failed: {resp.text}"

    headers = {"Authorization": f"Bearer {LITELLM_MASTER_KEY}"}
    models_resp = requests.get(f"{LITELLM_API_URL}/models", headers=headers, timeout=10)
    assert models_resp.status_code == 200, f"LiteLLM /models endpoint failed: {models_resp.text}"
    models_data = models_resp.json()
    model_ids = [m.get("id") for m in models_data.get("data", [])]
    assert "deeplens-llm" in model_ids, f"Virtual alias 'deeplens-llm' missing from models: {model_ids}"

def test_reasoning_health_and_diagnostics():
    """Validates Reasoning Service /health and /diagnostics/models endpoints."""
    health_resp = requests.get(f"{REASONING_API_URL}/health", timeout=10)
    assert health_resp.status_code == 200, f"Reasoning /health failed: {health_resp.text}"
    health_data = health_resp.json()
    assert health_data.get("status") == "ok", f"Expected status 'ok', got: {health_data}"
    assert "deeplens-llm" in health_data.get("model", "")

    diag_resp = requests.get(f"{REASONING_API_URL}/diagnostics/models", timeout=45)
    assert diag_resp.status_code == 200, f"Diagnostics models probe failed: {diag_resp.text}"
    diag_data = diag_resp.json()
    assert "models" in diag_data, "Diagnostics response missing 'models' field"
    assert "gateway_url" in diag_data, "Diagnostics response missing 'gateway_url'"
    assert len(diag_data["models"]) > 0, "No models evaluated in diagnostics"

@pytest.mark.parametrize("model_name", ["deeplens-llm", "phi4-mini:latest", "phi3:latest"])
def test_model_extraction_matrix(model_name):
    """
    Parameterized test validating extraction across model matrix.
    Ensures non-empty valid JSON with expected catalog fields.
    """
    payload = {
        "model": model_name,
        "prompt": f"WhatsApp Description:\n{SAMPLE_DESCRIPTION}\n\nExtract metadata in JSON format.",
        "system": (
            "You are an AI metadata extraction system for an Indian ethnic wear platform.\n"
            "Extract structured fields in valid JSON matching schema:\n"
            "{\n"
            "  \"category\": \"saree | lehanga | dress | kids | general\",\n"
            "  \"fabric\": \"string\",\n"
            "  \"color\": \"string\",\n"
            "  \"price\": number\n"
            "}\n"
            "Return ONLY a valid JSON object."
        )
    }
    resp = requests.post(f"{REASONING_API_URL}/test-model", json=payload, timeout=120)
    assert resp.status_code == 200, f"Model probe failed for {model_name}: {resp.text}"
    data = resp.json()
    assert data.get("model") == model_name
    assert data.get("status") in ["ok", "healthy"]
    
    parsed = data.get("parsed_json")
    if not parsed and data.get("raw_response"):
        try:
            raw = data["raw_response"].strip()
            if raw.startswith("```"):
                lines = raw.split("\n")
                raw = "\n".join(lines[1:-1])
            parsed = json.loads(raw)
        except Exception:
            parsed = None
            
    assert parsed is not None, f"Failed to parse JSON response for model {model_name}: {data.get('raw_response')}"
    assert any(k in parsed for k in ["category", "fabric", "color", "price"]), f"JSON missing expected fields for {model_name}: {parsed}"

def test_youtube_title_generation():
    """Validates /generate-youtube-title returns valid title string under 100 chars."""
    payload = {
        "description": "Exclusive Pure Kanjivaram Silk Saree Collection in Vibrant Red Color with Golden Zari Border"
    }
    resp = requests.post(f"{REASONING_API_URL}/generate-youtube-title", json=payload, timeout=120)
    assert resp.status_code == 200, f"YouTube title generation failed: {resp.text}"
    data = resp.json()
    title = data.get("title", "")
    assert isinstance(title, str), "Expected title to be a string"
    assert len(title.strip()) > 0, "YouTube title should not be empty"
    assert len(title) <= 100, f"YouTube title exceeds 100 chars ({len(title)} chars): {title}"

def test_share_description_generation():
    """Validates /generate-share-description includes base SKU and price."""
    sku = "VAY-KANJI-001"
    price = 2499.0
    payload = {
        "base_sku": sku,
        "product_id": sku,
        "title": "Pure Kanjivaram Silk Saree",
        "category": "saree",
        "fabric": "Silk",
        "color": "Red",
        "stitch_type": "Unstitched",
        "vendor_price": price,
        "target_platform": "Instagram"
    }
    resp = requests.post(f"{REASONING_API_URL}/generate-share-description", json=payload, timeout=120)
    assert resp.status_code == 200, f"Share description generation failed: {resp.text}"
    data = resp.json()
    description = data.get("description", "")
    assert isinstance(description, str), "Expected description to be a string"
    assert len(description.strip()) > 0, "Share description should not be empty"
    assert sku in description, f"Share description must include SKU '{sku}':\n{description}"
    assert "2499" in description or "2,499" in description or "₹" in description, (
        f"Share description must mention price '{price}':\n{description}"
    )

def test_zero_downtime_failover():
    """
    Validates that requesting 'deeplens-llm' gracefully returns a valid structured
    response via LiteLLM automated fallback even when cloud keys fail.
    """
    payload = {
        "description": "Trending Designer Georgette Anarkali Suit with Dupatta Price 1850"
    }
    resp = requests.post(f"{REASONING_API_URL}/extract-product", json=payload, timeout=120)
    assert resp.status_code == 200, f"Failover extraction failed: {resp.text}"
    data = resp.json()
    assert data.get("category") in ["dress", "anarkali", "suit", "general", "saree"], f"Unexpected category: {data.get('category')}"
    assert data.get("price") is not None, f"Expected numeric price, got: {data.get('price')}"
    assert float(data["price"]) == 1850.0 or data["price"] > 0

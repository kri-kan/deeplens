import os
import json
import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline

app = FastAPI(
    title="DeepLens Reasoning Service",
    description="AI-powered product metadata extraction using Phi-3 reasoning models.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

@app.get("/", include_in_schema=False)
async def root():
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/docs")

# Model configuration
MODEL_ID = os.getenv("MODEL_ID", "microsoft/Phi-3-mini-4k-instruct")
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

print(f"Loading model {MODEL_ID} on {DEVICE}...")

# Initialize model and tokenizer
# In a real environment, we would load the actual model.
# For this implementation, we will use a pipeline or a mock if environment is constrained.
class ReasoningEngine:
    def __init__(self):
        self.model = None
        self.tokenizer = None
        self.pipeline = None
        self.is_ready = False

    def load(self):
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
            self.model = AutoModelForCausalLM.from_pretrained(
                MODEL_ID, 
                device_map="auto", 
                torch_dtype="auto", 
                trust_remote_code=True
            )
            self.pipeline = pipeline(
                "text-generation",
                model=self.model,
                tokenizer=self.tokenizer,
            )
            self.is_ready = True
        except Exception as e:
            print(f"Error loading model: {e}")
            self.is_ready = False

engine = ReasoningEngine()

# If we are in local dev and don't want to wait for heavy download, we can mock the extraction
MOCK_MODE = os.getenv("MOCK_MODE", "true").lower() == "true"

class ExtractionRequest(BaseModel):
    text: str
    category: str = "Apparel"

class ExtractionResponse(BaseModel):
    fabric: str | None = None
    color: str | None = None
    stitch_type: str | None = None
    work_heaviness: str | None = None
    patterns: list[str] = []
    occasions: list[str] = []
    tags: list[str] = []
    raw_response: str | None = None

@app.on_event("startup")
async def startup_event():
    if not MOCK_MODE:
        engine.load()

@app.get("/health")
async def health():
    return {"status": "ok", "model": MODEL_ID, "ready": engine.is_ready or MOCK_MODE}

@app.post("/extract", response_model=ExtractionResponse)
async def extract_metadata(request: ExtractionRequest):
    if MOCK_MODE:
        return mock_extract(request.text)
    
    prompt = f"<|user|>\nExtract product metadata from the following description. \
Return ONLY a JSON object with keys: fabric, color, stitch_type, work_heaviness, patterns (list), occasions (list), tags (list).\n\
Description: {request.text}\n<|assistant|>\n"

    outputs = engine.pipeline(prompt, max_new_tokens=256, do_sample=False)
    raw_text = outputs[0]['generated_text']
    
    # Simple JSON extraction logic
    try:
        start_idx = raw_text.find('{')
        end_idx = raw_text.rfind('}') + 1
        json_str = raw_text[start_idx:end_idx]
        data = json.loads(json_str)
        return ExtractionResponse(**data, raw_response=raw_text)
    except Exception as e:
        return ExtractionResponse(raw_response=raw_text)

def mock_extract(text: str) -> ExtractionResponse:
    text = text.lower()
    res = ExtractionResponse()
    
    if "silk" in text: res.fabric = "Silk"
    if "cotton" in text: res.fabric = "Cotton"
    if "georgette" in text: res.fabric = "Georgette"
    
    if "blue" in text: res.color = "Blue"
    if "red" in text: res.color = "Red"
    if "green" in text: res.color = "Green"
    if "emerald" in text: res.color = "Emerald Green"
    
    if "unstitched" in text: res.stitch_type = "Unstitched"
    elif "semi-stitched" in text: res.stitch_type = "Semi-Stitched"
    elif "stitched" in text: res.stitch_type = "Stitched"
    
    if "heavy" in text: res.work_heaviness = "Heavy"
    elif "medium" in text: res.work_heaviness = "Medium"
    elif "low" in text or "light" in text: res.work_heaviness = "Low"
    
    if "floral" in text: res.patterns.append("Floral")
    if "bridal" in text: res.occasions.append("Bridal")
    if "party" in text: res.occasions.append("Partywear")
    
    res.raw_response = "MOCKED_PHI3_RESPONSE"
    return res

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)

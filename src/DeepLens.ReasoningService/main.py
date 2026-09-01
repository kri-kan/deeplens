import os
import json
import asyncio
import re
import time
from datetime import datetime, timezone
import requests
import httpx
from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.responses import RedirectResponse
import psycopg2
from pydantic import BaseModel
from openai import AsyncOpenAI

app = FastAPI(
    title="DeepLens Reasoning Service",
    description="AI-powered product metadata extraction using LiteLLM Gateway.",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse(url="/docs")


# Database configurations for logging
DB_CONNECTION_STRING_RAW = os.getenv("DB_CONNECTION_STRING")

def get_pg_conn_string():
    if not DB_CONNECTION_STRING_RAW:
        return None
    # Parse C# Host=...;Database=...;Username=...;Password=...
    parts = DB_CONNECTION_STRING_RAW.split(';')
    params = {}
    for part in parts:
        if '=' in part:
            k, v = part.split('=', 1)
            k_lower = k.lower().strip()
            v = v.strip()
            if k_lower == 'host':
                params['host'] = v
            elif k_lower in ('database', 'db'):
                params['dbname'] = v
            elif k_lower in ('username', 'user', 'uid'):
                params['user'] = v
            elif k_lower in ('password', 'pwd'):
                params['password'] = v
    return " ".join(f"{k}={v}" for k, v in params.items())

def log_llm_call(endpoint: str, prompt: str, response: str, latency_ms: int):
    conn_str = get_pg_conn_string()
    if not conn_str:
        return
    try:
        conn = psycopg2.connect(conn_str)
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO public.llm_logs (endpoint, prompt, response, latency_ms) VALUES (%s, %s, %s, %s)",
            (endpoint, prompt, response, latency_ms)
        )
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error logging LLM call to DB: {e}", flush=True)

# LiteLLM Gateway configuration
LITELLM_BASE_URL = os.getenv("LITELLM_BASE_URL", "http://deeplens-litellm:4000/v1")
LITELLM_API_KEY = os.getenv("LITELLM_API_KEY", "sk-deeplens-master-key")
LITELLM_MODEL = os.getenv("LITELLM_MODEL", "deeplens-llm")

# Initialize AsyncOpenAI client
llm_client = AsyncOpenAI(
    base_url=LITELLM_BASE_URL,
    api_key=LITELLM_API_KEY,
    timeout=60.0,
    max_retries=1
)

GEMINI_SAFETY_SETTINGS = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"}
]

async def query_ollama_direct(model: str, messages: list[dict]) -> str | None:
    """Direct HTTP fallback to local Ollama GPU endpoint bypassing LiteLLM proxy."""
    endpoints = ["http://ollama-gpu:11434", "http://localhost:11434", "http://127.0.0.1:11434"]
    for base_url in endpoints:
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                res = await client.post(
                    f"{base_url}/api/chat",
                    json={
                        "model": model,
                        "messages": messages,
                        "format": "json",
                        "stream": False,
                        "options": {"temperature": 0.1}
                    }
                )
                if res.status_code == 200:
                    data = res.json()
                    content = data.get("message", {}).get("content", "").strip()
                    if content:
                        return content
        except Exception as e:
            print(f"Direct Ollama fallback to {base_url} with model {model} failed: {e}", flush=True)
            continue
    return None

async def call_llm(prompt: str, system: str = "", req: Request = None, model: str = None) -> str:
    """Execute chat completion via LiteLLM OpenAI-compatible gateway in JSON mode with automatic Ollama fallback."""
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    target_model = model or LITELLM_MODEL
    try:
        if req and await req.is_disconnected():
            raise HTTPException(status_code=499, detail="Client Closed Request")

        completion = await llm_client.chat.completions.create(
            model=target_model,
            messages=messages,
            response_format={"type": "json_object"},
            temperature=0.7,
            extra_body={"safety_settings": GEMINI_SAFETY_SETTINGS}
        )
        if completion.choices:
            choice = completion.choices[0]
            content = choice.message.content or ""
            if content and choice.finish_reason != "content_filter":
                return content
            elif choice.finish_reason == "content_filter":
                print(f"LiteLLM model {target_model} finished with content_filter. Falling over to Ollama...", flush=True)
    except HTTPException:
        raise
    except Exception as e:
        print(f"LiteLLM gateway with model {target_model} notice: {e}", flush=True)

    # Automatic Zero-Downtime Fallback directly to local Ollama GPU
    print(f"Engaging resilient direct local Ollama fallback for {target_model}...", flush=True)
    fallback_models = ["qwen2.5:0.5b", "phi4-mini:latest", "phi3:latest"]
    for fb_model in fallback_models:
        direct_content = await query_ollama_direct(fb_model, messages)
        if direct_content:
            return direct_content

    raise HTTPException(status_code=502, detail=f"Failed to communicate with LLM gateway and Ollama fallback for model {target_model}")

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

class SuggestRequest(BaseModel):
    descriptions: list[str]

class SuggestResponse(BaseModel):
    title: str
    keywords: str
    raw_response: str | None = None

class ProductExtractionRequest(BaseModel):
    description: str

class ProductExtractionResponse(BaseModel):
    category: str | None = "general"
    subCategory: str | None = "General"
    price: float | None = None
    isPlusShipping: bool = True
    title: str | None = None
    fabric: str | None = "Unknown"
    stitchType: str | None = "Unstitched"
    color: str | None = None
    sizes: list[str] = []
    tags: list[str] = []
    raw_response: str | None = None

class YoutubeTitleRequest(BaseModel):
    description: str

class YoutubeTitleResponse(BaseModel):
    title: str
    raw_response: str | None = None

class ShareDescriptionRequest(BaseModel):
    product_id: str | None = None
    base_sku: str | None = None
    title: str | None = None
    vendor_price: float | None = None
    target_platform: str | None = "instagram"
    raw_description: str | None = None
    category: str | None = None
    fabric: str | None = None
    stitch_type: str | None = None
    color: str | None = None

class ShareDescriptionResponse(BaseModel):
    description: str
    raw_response: str | None = None

class TestModelRequest(BaseModel):
    model: str = "deeplens-llm"
    prompt: str = "Pure Kanchi Pattu saree in navy blue. Price 4500."
    system: str = "Extract JSON metadata: {\"category\": str, \"price\": float, \"fabric\": str}"

class TestModelResponse(BaseModel):
    model: str
    status: str
    latency_ms: int
    raw_response: str | None = None
    parsed_json: dict | list | None = None
    error: str | None = None

class RunAllModelsRequest(BaseModel):
    prompt: str = "Pure Kanchi Pattu saree in navy blue with gold zari border. Price 4500."
    system: str | None = None
    models: list[str] | None = None


INDIAN_FASHION_GLOSSARY = {
    "fabrics": [
        "Cotton", "Silk", "Georgette", "Organza", "Crepe (crape, creap)", "Dola Silk",
        "Tissue Silk", "Chinon (chinnon)", "Chiffon", "Velvet", "Paithani", "Tussar (tasar)",
        "Bandhani", "Banarasi (bnarasi)", "Kanjivaram (kanchipuram)", "Linen",
        "Viscose", "Satin (sartin, sattin)", "Chanderi", "Khadi", "Net", "Vichitra",
        "Gajji", "Mysore", "Mul"
    ],
    "styles": [
        "Saree (sari)", "Lehenga (lehanga)", "Lehenga Choli", "Dupatta", "Blouse",
        "Gown", "Frock", "Kurti (kurta)", "Anarkali", "Salwar Suit", "Palazzo Set (plazo)",
        "Crop Top Lehenga", "Co-ord Set (cord set)", "Half Saree"
    ],
    "work_types": [
        "Zari Weaving (jari)", "Embroidery (emrodairy)", "Mirror Work", "Ajrakh Print",
        "Gota Patti (patti)", "Sequence Work (sequins, sequnce)", "Hand Work (handwork)",
        "Cut Work (cutdana)", "Jacquard (jequrd)", "Kalamkari", "Coding", "Butti (butta)",
        "Crush", "Beads", "Latkan", "Floral (flower)", "Foil Print", "Maggam", "Moti (pearl)",
        "Aari", "Meenakari (minakari)", "Thread Work", "Digital Print", "Lace"
    ]
}

SYSTEM_PROMPT_SUGGEST = (
    "You are an expert Indian ethnic fashion merchandiser and cataloging assistant. "
    "Your task is to generate a short, highly descriptive title and relevant hashtags for a group of social media posts (reels/posts) representing similar products.\n\n"
    "GLOSSARY OF INDIAN ETHNIC WEAR TERMS TO ASSIST YOU:\n"
    f"- Fabrics: {', '.join(INDIAN_FASHION_GLOSSARY['fabrics'])}\n"
    f"- Styles: {', '.join(INDIAN_FASHION_GLOSSARY['styles'])}\n"
    f"- Work/Crafts: {', '.join(INDIAN_FASHION_GLOSSARY['work_types'])}\n\n"
    "CRITICAL RULES FOR TITLE:\n"
    "1. Create a short, compacted title (maximum 6 words) summarizing the core product. Strip away marketing fluff, price details, and long sentences.\n"
    "2. Retain specific adjectives and weaves (e.g., 'Semi Chiniya', 'Kanchi', 'Handwoven') if present, but do NOT just echo back the full description. Compact it into a clean, professional noun phrase.\n"
    "   - Example: If text is 'beautiful semi chiniya silk sarees available with heavy zari work', title should be 'Semi Chiniya Silk Saree'.\n\n"
    "CRITICAL RULES FOR KEYWORDS:\n"
    "1. You MUST include the exact type of product as one of the keywords if it can be inferred (e.g., saree, lehenga, dress, kids, kurti, gown, etc.).\n"
    "2. Select up to 5 most relevant keywords for categorization. Return them as a comma-separated string (CSV). If the description lacks sufficient details, it is perfectly fine to return an empty string.\n"
    "3. STRICTLY AVOID common or promotional words like 'vayyarifashion', 'vayyarifashions', 'free shipping', 'cod available', 'viral', 'trending', 'reels', 'dm to order', etc.\n"
    "4. DO NOT use hash prefixes (#). Just output the raw words separated by commas.\n"
    "5. ONLY suggest 'designerwear' or 'partywear' if the text explicitly mentions heavy work, designer brands, bridal, wedding, party, or premium craftsmanship. Do not use them for basic/casual wear.\n\n"
    "OUTPUT FORMAT:\n"
    "You must respond ONLY with a valid JSON object matching the schema below. Do not include markdown formatting like ```json or any explanations.\n\n"
    "REQUIRED JSON SCHEMA:\n"
    "{\n"
    "  \"title\": \"String\",\n"
    "  \"keywords\": \"String\"\n"
    "}"
)

SYSTEM_PROMPT_EXTRACT = (
    "Extract product metadata from the following description. "
    "Return ONLY a valid JSON object matching this schema:\n"
    "{\n"
    "  \"fabric\": \"String or null\",\n"
    "  \"color\": \"String or null\",\n"
    "  \"stitch_type\": \"String or null\",\n"
    "  \"work_heaviness\": \"String or null\",\n"
    "  \"patterns\": [\"String\"],\n"
    "  \"occasions\": [\"String\"],\n"
    "  \"tags\": [\"String\"]\n"
    "}\n"
    "Do not include markdown blocks or any other text."
)

SYSTEM_PROMPT_PRODUCT_EXTRACT = (
    "You are an expert product catalog extraction AI. Analyze the given WhatsApp product description from a vendor and extract the following product details in JSON format.\n\n"
    "GLOSSARY OF INDIAN ETHNIC WEAR TERMS TO ASSIST YOU:\n"
    f"- Fabrics: {', '.join(INDIAN_FASHION_GLOSSARY['fabrics'])}\n"
    f"- Styles: {', '.join(INDIAN_FASHION_GLOSSARY['styles'])}\n"
    f"- Work/Crafts: {', '.join(INDIAN_FASHION_GLOSSARY['work_types'])}\n\n"
    "Analyze the following clothing product description and extract the details strictly into JSON format.\n\n"
    "Output Requirements:\n"
    "1. \"category\": Main product category. MUST be EXACTLY ONE of: \"saree\", \"dress\", \"lehanga\", \"kids\", or \"general\". Do not use any other category names.\n"
    "   CRITICAL CATEGORIZATION RULES:\n"
    "   - IGNORE EMOJIS (like 👗) when determining the category. Base your decision STRICTLY on the text keywords.\n"
    "   - 'kids': This is an umbrella category for ANY children's clothing. If 'kids', 'kidwear', 'boys', 'girls', 'baby', 'infant', 'toddler', children's sizes (e.g., 'size 14y', '10y', '12y'), OR any age 16 years or below (e.g., '1-16 years', '6 months', '16 yrs') is mentioned, it MUST be 'kids' (even if it's a dress, saree, or lehenga).\n"
    "   - 'lehanga': Any explicit mention of 'lehenga', 'lehanga', 'lehnga', 'lahenga', 'choli', 'ghagra', 'chaniya choli', 'pavadai', 'half saree', or 'voni' MUST be categorized as 'lehanga' (unless it's for kids).\n"
    "   - 'saree': Any explicit mention of 'saree', 'sari', 'sarees', or related hashtags like '#partywearsaree' MUST be categorized as 'saree'.\n"
    "   - 'dress': Exclusively for adult dresses. Includes 'cord set', 'co-ord set', 'coord', 'skirt with top', 'kurti', 'kurthi', 'kurta', 'gown', 'maxi', 'frock', 'suit', 'salwar', 'churidar', 'palazzo', 'plazo', 'sharara', 'dress'. Use ONLY if one of these keywords is explicitly present.\n"
    "   - 'general': Use this as the DEFAULT FALLBACK category if the text does not contain any specific keywords for lehanga, saree, dress, or kids. Do NOT assume 'dress' if the actual garment type is unclear or not mentioned.\n"
    "2. \"subCategory\": Subcategory or type (e.g. Silk Saree, Cotton Kurti, Georgette Dress, Semi-Stitched Lehenga). Try to determine this from the text, otherwise use 'Unspecified'.\n"
    "3. \"price\": The base selling price of the product (excluding shipping charges). Treat the money as a pure number directly from the text regardless of currency symbols (like $, €, Rs, INR, /-, etc.). Do NOT perform currency conversion or scaling (e.g. do NOT convert $25 to 2500; extract the exact value 25). Do NOT sum up or calculate total price with shipping. Output ONLY the numeric value (e.g., 1450, 599.50). If no price is mentioned, use null.\n"
    "4. \"isPlusShipping\": A boolean (true or false). Set to false ONLY IF 'free shipping', 'shipping free', 'free ship', or similar is explicitly mentioned. Set to true if shipping is extra, 'plus shipping', '+ $', '+ shipping', or if shipping is NOT mentioned at all.\n"
    "5. \"title\": A concise, clean, and professional product title in English of MAXIMUM 5 WORDS summarizing the core product. CRITICAL: Base the title ONLY on the explicitly mentioned fabric, work, and item type. Do NOT append words like 'Dress', 'Saree', or 'Lehenga' to the title if they are not explicitly present in the text. Do NOT include vendor codes, price, emojis, or marketing fluff (like 'New Design', 'Grab it', 'Full Stock'). Example: 'Red Banarasi Silk Saree', 'Girls Cotton Floral Frock', 'Velvet Maggam Work Gown'.\n"
    "6. \"fabric\": The material/fabric (e.g. Silk, Georgette, Cotton). MUST be a single string, NOT an array. If multiple, combine them (e.g. \"Cotton Silk\"). If unknown, use \"Unknown\".\n"
    "7. \"stitchType\": The stitch type (e.g. Unstitched, Semi-Stitched, Stitched, Free Size). MUST be a single string, NOT an array. If unknown, use \"Unknown\".\n"
    "8. \"color\": The color of the product as a single string (e.g. \"Red\", \"Navy Blue\"). MUST be a single string, NOT an array. Use null if unknown.\n"
    "9. \"sizes\": An array of available sizes (e.g. [\"M\", \"L\", \"XL\"]). If no sizes are mentioned, use an empty array [].\n"
    "10. \"tags\": An array of relevant search tags/keywords (e.g. [\"partywear\", \"wedding\", \"zari border\"]).\n\n"
    "FEW-SHOT EXAMPLES:\n"
    "Example 1 Input: \"Beautiful Georgette saree in navy blue with heavy zari border. Price 1200 + free shipping.\"\n"
    "Example 1 Output: { \"category\": \"saree\", \"subCategory\": \"Georgette Saree\", \"price\": 1200.0, \"isPlusShipping\": false, \"title\": \"Navy Blue Georgette Zari Saree\", \"fabric\": \"Georgette\", \"stitchType\": \"Unstitched\", \"color\": \"Navy Blue\", \"sizes\": [], \"tags\": [\"zari border\", \"partywear\"] }\n\n"
    "Example 2 Input: \"Kids cotton frocks, sizes 2-6 years. Rs 450 + shipping.\"\n"
    "Example 2 Output: { \"category\": \"kids\", \"subCategory\": \"Frocks\", \"price\": 450.0, \"isPlusShipping\": true, \"title\": \"Kids Cotton Frock\", \"fabric\": \"Cotton\", \"stitchType\": \"Stitched\", \"color\": null, \"sizes\": [\"2 years\", \"3 years\", \"4 years\", \"5 years\", \"6 years\"], \"tags\": [\"kids wear\", \"frock\"] }\n\n"
    "Example 3 Input: \"👗Choli👗\\nFabric:- Chinon\\n👗Lehenga👗\\nInner:- Micro Cotton\\nRate:-1449/- free shipping\"\n"
    "Example 3 Output: { \"category\": \"lehanga\", \"subCategory\": \"Lehenga Choli\", \"price\": 1449.0, \"isPlusShipping\": false, \"title\": \"Chinon Lehenga Choli\", \"fabric\": \"Chinon\", \"stitchType\": \"Unknown\", \"color\": null, \"sizes\": [], \"tags\": [\"lehenga choli\"] }\n\n"
    "Example 4 Input: \"Designer soft silk material. Top 2.5m, bottom 2m. Price 2500 + 100 shipping charge.\"\n"
    "Example 4 Output: { \"category\": \"general\", \"subCategory\": \"Unstitched Material\", \"price\": 2500.0, \"isPlusShipping\": true, \"title\": \"Designer Soft Silk Material\", \"fabric\": \"Silk\", \"stitchType\": \"Unstitched\", \"color\": null, \"sizes\": [], \"tags\": [\"designer\", \"soft silk\"] }\n\n"
    "Example 5 Input: \"To ,\\n\\nNew design launching \\n\\nPure soft georgette saree with zari weaving border and gota patti work. Rate /- 1250 fs\\n\\nFull stock ready grab it\"\n"
    "Example 5 Output: { \"category\": \"saree\", \"subCategory\": \"Georgette Saree\", \"price\": 1250.0, \"isPlusShipping\": false, \"title\": \"Pure Georgette Saree with Gota Patti Work\", \"fabric\": \"Georgette\", \"stitchType\": \"Unstitched\", \"color\": null, \"sizes\": [], \"tags\": [\"zari weaving\", \"gota patti\"] }\n\n"
    "Output ONLY the JSON object. Do not wrap in markdown or add explanations."
)

SYSTEM_PROMPT_YOUTUBE_TITLE = (
    "You are a YouTube Shorts expert. Generate a catchy, engaging, and high-CTR title for a YouTube Short based on the given description.\n"
    "Follow Google Shorts Title Guidelines:\n"
    "1. Keep it concise (under 60 characters is best).\n"
    "2. Use strong, relevant keywords at the beginning.\n"
    "3. Include #shorts at the end.\n"
    "4. Make it engaging or curiosity-driven.\n"
    "5. Do not use clickbait that misleads.\n\n"
    "Return ONLY a valid JSON object matching this schema:\n"
    "{\n"
    "  \"title\": \"String\"\n"
    "}\n"
    "Do not include markdown blocks or any other text."
)

SYSTEM_PROMPT_SHARE_DESCRIPTION = (
    "You are an expert social media copywriter for an Indian ethnic fashion brand (Vayyari).\n"
    "Generate high-converting, captivating captions tailored for social media (Instagram, WhatsApp, Facebook).\n\n"
    "CRITICAL RULES:\n"
    "1. You MUST ALWAYS include the Product Code/ID (e.g., 'Product ID: {base_sku}' or 'Code: {base_sku}'). NEVER omit it.\n"
    "2. Mention the product price in INR (₹{vendor_price}) clearly.\n"
    "3. Highlight key product features: Fabric, Category, Color, and Stitch Type if provided.\n"
    "4. Add relevant, high-traffic ethnic fashion hashtags at the end (e.g. #vayyari #saree #lehenga #indianfashion #ethnicwear).\n"
    "5. Keep the tone elegant, aspirational, and engaging with emojis.\n\n"
    "Return ONLY a valid JSON object matching this schema:\n"
    "{\n"
    "  \"description\": \"Full formatted caption with emojis and hashtags\"\n"
    "}\n"
    "Do not include markdown blocks or any other text."
)

def get_model_provider(model_name: str) -> str:
    m = model_name.lower()
    if "deeplens" in m:
        return "gemini/ollama"
    elif "gemini" in m:
        return "gemini"
    elif "phi" in m or "ollama" in m:
        return "ollama"
    return "openai"

async def probe_single_model(model_name: str, timeout_sec: float = 25.0) -> dict:
    start_time = time.time()
    provider = get_model_provider(model_name)
    try:
        completion_coro = llm_client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": "Respond with valid JSON: {\"status\": \"ok\"}"},
                {"role": "user", "content": "ping"}
            ],
            response_format={"type": "json_object"},
            temperature=0.1
        )
        completion = await asyncio.wait_for(completion_coro, timeout=timeout_sec)
        latency_ms = int((time.time() - start_time) * 1000)
        content = completion.choices[0].message.content or ""
        return {
            "status": "ok",
            "latency_ms": latency_ms,
            "provider": provider,
            "probe_response": content
        }
    except asyncio.TimeoutError:
        latency_ms = int((time.time() - start_time) * 1000)
        return {
            "status": "error",
            "latency_ms": latency_ms,
            "provider": provider,
            "error": f"Timeout after {timeout_sec}s"
        }
    except Exception as e:
        latency_ms = int((time.time() - start_time) * 1000)
        return {
            "status": "error",
            "latency_ms": latency_ms,
            "provider": provider,
            "error": str(e)
        }

@app.get("/health")
async def health():
    try:
        models_response = await llm_client.models.list()
        model_ids = [m.id for m in models_response.data] if hasattr(models_response, 'data') else []
        is_ready = True
        return {
            "status": "ok",
            "model": LITELLM_MODEL,
            "ready": is_ready,
            "backend": "litellm",
            "gateway_url": LITELLM_BASE_URL,
            "available_models": model_ids
        }
    except Exception as e:
        return {
            "status": "error",
            "model": LITELLM_MODEL,
            "ready": False,
            "backend": "litellm",
            "gateway_url": LITELLM_BASE_URL,
            "error": str(e)
        }

@app.get("/diagnostics/models")
async def diagnostics_models():
    target_models = ["deeplens-llm", "deeplens-fast", "gemini-2.5-flash", "phi3:latest", "phi4-mini:latest"]
    try:
        models_response = await asyncio.wait_for(llm_client.models.list(), timeout=5.0)
        if hasattr(models_response, 'data') and models_response.data:
            discovered = [m.id for m in models_response.data if hasattr(m, 'id')]
            for d in discovered:
                if d not in target_models:
                    target_models.append(d)
    except Exception as e:
        print(f"Warning: Failed to fetch models list from gateway: {e}", flush=True)

    probe_tasks = [probe_single_model(m, timeout_sec=25.0) for m in target_models]
    probe_results = await asyncio.gather(*probe_tasks)

    models_dict = {}
    for model_name, result in zip(target_models, probe_results):
        entry = {
            "status": result["status"],
            "latency_ms": result["latency_ms"],
            "provider": result["provider"],
        }
        if "error" in result:
            entry["error"] = result["error"]
        models_dict[model_name] = entry

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "gateway_url": LITELLM_BASE_URL,
        "models": models_dict
    }

@app.post("/test-model", response_model=TestModelResponse)
async def test_model(req: Request, request: TestModelRequest, background_tasks: BackgroundTasks):
    start_time = time.time()
    try:
        raw_text = await call_llm(prompt=request.prompt, system=request.system, req=req, model=request.model)
        latency_ms = int((time.time() - start_time) * 1000)
        
        background_tasks.add_task(log_llm_call, f"/test-model/{request.model}", request.prompt, raw_text, latency_ms)

        parsed = None
        try:
            raw_clean = raw_text.strip()
            match = re.search(r'```(?:json)?(.*?)```', raw_clean, re.DOTALL)
            if match:
                raw_clean = match.group(1).strip()
            parsed = json.loads(raw_clean)
        except Exception:
            parsed = None

        return TestModelResponse(
            model=request.model,
            status="ok",
            latency_ms=latency_ms,
            raw_response=raw_text,
            parsed_json=parsed,
            error=None
        )
    except Exception as e:
        latency_ms = int((time.time() - start_time) * 1000)
        return TestModelResponse(
            model=request.model,
            status="error",
            latency_ms=latency_ms,
            raw_response=None,
            parsed_json=None,
            error=str(e)
        )

@app.post("/diagnostics/run-all-models")
async def run_all_models(req: Request, request: RunAllModelsRequest = None):
    req_body = request or RunAllModelsRequest()
    prompt = req_body.prompt
    system_prompt = req_body.system or SYSTEM_PROMPT_PRODUCT_EXTRACT
    
    target_models = req_body.models
    if not target_models:
        target_models = ["deeplens-llm", "deeplens-fast", "gemini-2.5-flash", "phi3:latest", "phi4-mini:latest"]
        try:
            models_response = await asyncio.wait_for(llm_client.models.list(), timeout=5.0)
            if hasattr(models_response, 'data') and models_response.data:
                discovered = [m.id for m in models_response.data if hasattr(m, 'id')]
                for d in discovered:
                    if d not in target_models:
                        target_models.append(d)
        except Exception as e:
            print(f"Warning: Failed to fetch models list in run-all-models: {e}", flush=True)

    async def run_single_model_extraction(model_name: str) -> dict:
        start_time = time.time()
        provider = get_model_provider(model_name)
        try:
            raw_text = await call_llm(prompt=prompt, system=system_prompt, model=model_name)
            latency_ms = int((time.time() - start_time) * 1000)
            
            parsed = None
            try:
                raw_clean = raw_text.strip()
                match = re.search(r'```(?:json)?(.*?)```', raw_clean, re.DOTALL)
                if match:
                    raw_clean = match.group(1).strip()
                parsed = json.loads(raw_clean)
            except Exception:
                parsed = None

            return {
                "status": "ok",
                "latency_ms": latency_ms,
                "provider": provider,
                "extracted": parsed,
                "raw_response": raw_text
            }
        except Exception as e:
            latency_ms = int((time.time() - start_time) * 1000)
            return {
                "status": "error",
                "latency_ms": latency_ms,
                "provider": provider,
                "extracted": None,
                "raw_response": None,
                "error": str(e)
            }

    tasks = [run_single_model_extraction(m) for m in target_models]
    results_list = await asyncio.gather(*tasks)

    results_dict = {}
    successful = 0
    failed = 0
    fastest_model = None
    lowest_latency = float('inf')

    for m, res in zip(target_models, results_list):
        results_dict[m] = res
        if res["status"] == "ok":
            successful += 1
            if res["latency_ms"] < lowest_latency:
                lowest_latency = res["latency_ms"]
                fastest_model = m
        else:
            failed += 1

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "gateway_url": LITELLM_BASE_URL,
        "prompt": prompt,
        "results": results_dict,
        "summary": {
            "total_models": len(target_models),
            "successful_models": successful,
            "failed_models": failed,
            "fastest_model": fastest_model,
            "lowest_latency_ms": lowest_latency if lowest_latency != float('inf') else None
        }
    }


@app.post("/extract", response_model=ExtractionResponse)
async def extract_metadata(req: Request, request: ExtractionRequest, background_tasks: BackgroundTasks):
    prompt = f"Description: {request.text}\nExtract metadata according to the system prompt rules."

    start_time = time.time()
    raw_text = await call_llm(prompt=prompt, system=SYSTEM_PROMPT_EXTRACT, req=req)
    latency_ms = int((time.time() - start_time) * 1000)
    
    background_tasks.add_task(log_llm_call, "/extract", prompt, raw_text, latency_ms)
    
    try:
        data = json.loads(raw_text)
        return ExtractionResponse(**data, raw_response=raw_text)
    except Exception as e:
        return ExtractionResponse(raw_response=raw_text)

def generate_heuristic_metadata(descriptions: list[str]) -> tuple[str, str]:
    """Fallback generator that extracts clothing keywords and clean title from descriptions."""
    combined = " ".join(descriptions)
    matched_fabrics = [f for f in INDIAN_FASHION_GLOSSARY["fabrics"] if re.search(r'\b' + re.escape(f) + r'\b', combined, re.I)]
    matched_styles = [s for s in INDIAN_FASHION_GLOSSARY["styles"] if re.search(r'\b' + re.escape(s) + r'\b', combined, re.I)]
    matched_work = [w for w in INDIAN_FASHION_GLOSSARY["work_types"] if re.search(r'\b' + re.escape(w) + r'\b', combined, re.I)]

    title_parts = []
    if matched_fabrics:
        title_parts.append(matched_fabrics[0])
    if matched_work:
        title_parts.append(matched_work[0])
    if matched_styles:
        title_parts.append(matched_styles[0])
    else:
        title_parts.append("Collection")

    title = " ".join(title_parts).strip()
    if not title or title.lower() == "collection":
        first_line = ""
        for d in descriptions:
            lines = [l.strip() for l in d.splitlines() if l.strip() and not l.strip().startswith("#")]
            if lines:
                first_line = re.sub(r'[*#_]', '', lines[0]).strip()
                break
        title = first_line[:35].strip() if first_line else "New Story Collection"

    keywords_set = set()
    for item in matched_styles + matched_fabrics + matched_work:
        keywords_set.add(item.lower())
    if re.search(r'\bsarees?\b', combined, re.I):
        keywords_set.add("saree")
    if re.search(r'\bdress(es)?\b', combined, re.I):
        keywords_set.add("dress")
    if re.search(r'\bleh[ae]ngas?\b', combined, re.I):
        keywords_set.add("lehenga")
    if re.search(r'\bkurti?s?\b', combined, re.I):
        keywords_set.add("kurti")

    keywords = ", ".join(sorted(keywords_set))
    return title, keywords

@app.post("/suggest-group-metadata", response_model=SuggestResponse)
async def suggest_group_metadata(req: Request, request: SuggestRequest, background_tasks: BackgroundTasks):
    combined_desc = "\n---\n".join(request.descriptions)
    prompt = f"Descriptions:\n{combined_desc}\n\nGenerate the title and keywords."

    start_time = time.time()
    raw_text = ""
    try:
        raw_text = await call_llm(prompt=prompt, system=SYSTEM_PROMPT_SUGGEST, req=req)
    except Exception as e:
        print(f"call_llm error in /suggest-group-metadata: {e}", flush=True)

    latency_ms = int((time.time() - start_time) * 1000)
    background_tasks.add_task(log_llm_call, "/suggest-group-metadata", prompt, raw_text, latency_ms)
    
    try:
        clean_text = (raw_text or "").strip()
        match = re.search(r'```(?:json)?(.*?)```', clean_text, re.DOTALL)
        if match:
            clean_text = match.group(1).strip()

        json_match = re.search(r'\{.*\}', clean_text, re.DOTALL)
        if json_match:
            clean_text = json_match.group(0)

        data = json.loads(clean_text)
        title = data.get("title") or "New Collection"
        kw = data.get("keywords", "")
        if isinstance(kw, list):
            kw = ", ".join(str(item) for item in kw if item)
        else:
            kw = str(kw or "")

        return SuggestResponse(
            title=title,
            keywords=kw,
            raw_response=raw_text
        )
    except Exception as e:
        print(f"JSON Parse / Metadata Error in /suggest-group-metadata: {e}\nRaw Text: {raw_text}", flush=True)
        fallback_title, fallback_keywords = generate_heuristic_metadata(request.descriptions)
        return SuggestResponse(
            title=fallback_title,
            keywords=fallback_keywords,
            raw_response=raw_text
        )

@app.post("/extract-product", response_model=ProductExtractionResponse)
async def extract_product(req: Request, request: ProductExtractionRequest, background_tasks: BackgroundTasks, priority: int = 1):
    if not request.description or len(request.description.strip()) < 5:
        return ProductExtractionResponse(
            category="general",
            subCategory="General",
            price=None,
            isPlusShipping=True,
            title="New Product",
            fabric="Unknown",
            stitchType="Unstitched",
            color=None,
            sizes=[],
            tags=[],
            raw_response="Empty or too short description provided"
        )
    prompt = f"WhatsApp Description:\n{request.description}\n\nExtract metadata."

    start_time = time.time()
    raw_text = await call_llm(prompt=prompt, system=SYSTEM_PROMPT_PRODUCT_EXTRACT, req=req)
    latency_ms = int((time.time() - start_time) * 1000)
    
    background_tasks.add_task(log_llm_call, "/extract-product", prompt, raw_text, latency_ms)
    
    try:
        raw_text_clean = raw_text.strip()
        match = re.search(r'```(?:json)?(.*?)```', raw_text_clean, re.DOTALL)
        if match:
            raw_text_clean = match.group(1).strip()
            
        try:
            data = json.loads(raw_text_clean)
        except Exception:
            s = raw_text_clean.find("{")
            e = raw_text_clean.rfind("}")
            if s != -1 and e != -1 and e > s:
                data = json.loads(raw_text_clean[s:e+1])
            else:
                data = {"category": "general", "title": "New Product"}
        
        # Normalize snake_case keys to camelCase keys for Pydantic compatibility
        key_mapping = {
            "sub_category": "subCategory",
            "is_plus_shipping": "isPlusShipping",
            "stitch_type": "stitchType",
        }
        for snake_key, camel_key in key_mapping.items():
            if snake_key in data and camel_key not in data:
                data[camel_key] = data[snake_key]

        # Handle cases where LLM returns a list for string fields
        if isinstance(data.get("fabric"), list):
            data["fabric"] = " ".join(str(x) for x in data["fabric"])
        if isinstance(data.get("category"), list):
            data["category"] = " ".join(str(x) for x in data["category"])
        if isinstance(data.get("subCategory"), list):
            data["subCategory"] = " ".join(str(x) for x in data["subCategory"])
        if isinstance(data.get("stitchType"), list):
            data["stitchType"] = " ".join(str(x) for x in data["stitchType"])
        if isinstance(data.get("color"), list):
            data["color"] = " ".join(str(x) for x in data["color"])
        if isinstance(data.get("sizes"), str):
            data["sizes"] = [data["sizes"]]

        # Clean and format product title
        title_val = data.get("title")
        if title_val:
            fluff_patterns = [
                r'\bnew design(s)?\b', r'\blaunching\b', r'\bgrab it\b', 
                r'\bfull stock\b', r'\bready stock\b', r'\bread(y)? to dispatch\b',
                r'\bto ,\b', r'\bx viewing\b', r'\bviewing with\b',
                r'\bbeautifully rich\b', r'\ball occasional\b', r'\bfor wedding\b'
            ]
            for pattern in fluff_patterns:
                title_val = re.sub(pattern, '', title_val, flags=re.IGNORECASE)
            title_val = re.sub(r'\s+', ' ', title_val).strip()
            data["title"] = title_val.title()
        else:
            data["title"] = "New Product"

        # Clean up price format if it's returned as a string (e.g. "1200")
        price_val = data.get("price")
        if price_val is not None:
            try:
                if isinstance(price_val, str):
                    price_val = re.sub(r'[^\d.]', '', price_val)
                data["price"] = float(price_val)
            except ValueError:
                data["price"] = None
            
        desc_lower = request.description.lower()
        kids_indicators = [
            r'\bkids?\b', r'\bboys?\b', r'\bgirls?\b', r'\bchildren\b', r'\bbab(y|ies)\b',
            r'\btoddlers?\b', r'\binfants?\b',
            r'\b\d{1,2}\s*(month|year|yr|y)\b',
            r'\b(1[0-6]|[1-9])\s*(years?|yrs?|y)\b'
        ]
        is_kids = False
        for pattern in kids_indicators:
            if re.search(pattern, desc_lower):
                is_kids = True
                break
            
        category_str = str(data.get("category", "")).lower().strip()
        if is_kids:
            category_str = "kids"
        fallback_str = category_str

        if "kid" in fallback_str or "child" in fallback_str or "baby" in fallback_str or "boy" in fallback_str or "girl" in fallback_str:
            data["category"] = "kids"
        elif "lehenga" in fallback_str or "lehanga" in fallback_str or "lehnga" in fallback_str or "choli" in fallback_str or "chaniya" in fallback_str or "half saree" in fallback_str:
            data["category"] = "lehanga"
        elif "kurti" in fallback_str or "dress" in fallback_str or "suit" in fallback_str or "gown" in fallback_str or "salwar" in fallback_str or "anarkali" in fallback_str or "palazzo" in fallback_str:
            data["category"] = "dress"
        elif "saree" in fallback_str or "sari" in fallback_str or "banarasi" in fallback_str or "kanjivaram" in fallback_str:
            data["category"] = "saree"
        else:
            data["category"] = "general"
            
        return ProductExtractionResponse(**data, raw_response=raw_text)
    except Exception as e:
        print(f"JSON Parse Error for Product Extraction: {e}\nRaw Text: {raw_text}")
        raise HTTPException(status_code=500, detail=f"Failed to parse LLM response: {e}")

@app.post("/generate-youtube-title", response_model=YoutubeTitleResponse)
async def generate_youtube_title(req: Request, request: YoutubeTitleRequest):
    prompt = f"Description:\n{request.description}\n\nGenerate the title."

    raw_text = await call_llm(prompt=prompt, system=SYSTEM_PROMPT_YOUTUBE_TITLE, req=req)
    
    try:
        raw_clean = raw_text.strip()
        match = re.search(r'```(?:json)?(.*?)```', raw_clean, re.DOTALL)
        if match:
            raw_clean = match.group(1).strip()
        try:
            data = json.loads(raw_clean)
        except Exception:
            s = raw_clean.find("{")
            e = raw_clean.rfind("}")
            if s != -1 and e != -1 and e > s:
                data = json.loads(raw_clean[s:e+1])
            else:
                data = {}
        title = data.get("title", "").strip()
        if not title:
            lines = [l.strip() for l in raw_text.splitlines() if l.strip()]
            title = lines[0] if lines else "Exclusive Ethnic Wear Collection #shorts"
        if "#shorts" not in title.lower():
            title = f"{title} #shorts"
        if len(title) > 100:
            title = title[:97] + "..."
        return YoutubeTitleResponse(
            title=title,
            raw_response=raw_text
        )
    except Exception as e:
        print(f"JSON Parse Error for Youtube Title: {e}\nRaw Text: {raw_text}")
        return YoutubeTitleResponse(title="Exclusive Ethnic Wear Collection #shorts", raw_response=raw_text)

@app.post("/generate-share-description", response_model=ShareDescriptionResponse)
async def generate_share_description(req: Request, request: ShareDescriptionRequest):
    code = request.base_sku or request.product_id or "VAY-001"
    prompt = (
        f"Product Details:\n"
        f"- Product Code / ID: {code}\n"
        f"- Title: {request.title or 'Ethnic Wear'}\n"
        f"- Category: {request.category or 'Ethnic Wear'}\n"
        f"- Fabric: {request.fabric or 'Premium'}\n"
        f"- Color: {request.color or 'As shown'}\n"
        f"- Stitch Type: {request.stitch_type or 'Standard'}\n"
        f"- Price: ₹{request.vendor_price or 'Best Price'}\n"
        f"- Target Platform: {request.target_platform or 'Instagram'}\n"
        f"- Additional Notes: {request.raw_description or ''}\n\n"
        f"Generate the social media share caption ensuring Product ID '{code}' is prominently featured."
    )
    
    raw_text = await call_llm(prompt=prompt, system=SYSTEM_PROMPT_SHARE_DESCRIPTION, req=req)
    try:
        raw_clean = raw_text.strip()
        match = re.search(r'```(?:json)?(.*?)```', raw_clean, re.DOTALL)
        if match:
            raw_clean = match.group(1).strip()
        try:
            data = json.loads(raw_clean)
        except Exception:
            s = raw_clean.find("{")
            e = raw_clean.rfind("}")
            if s != -1 and e != -1 and e > s:
                data = json.loads(raw_clean[s:e+1])
            else:
                data = {}
        desc = data.get("description", "").strip()
        if not desc:
            desc = raw_text.strip()
        if code and code not in desc:
            desc = f"✨ Product Code: {code}\n\n" + desc
        return ShareDescriptionResponse(description=desc, raw_response=raw_text)
    except Exception as e:
        print(f"JSON Parse Error for Share Description: {e}\nRaw Text: {raw_text}")
        fallback_desc = f"✨ Product Code: {code}\n🌟 {request.title or 'Exclusive Collection'}\n💰 Price: ₹{request.vendor_price or ''}\n\nDM to order! #vayyari #ethnicwear"
        return ShareDescriptionResponse(description=fallback_desc, raw_response=raw_text)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)

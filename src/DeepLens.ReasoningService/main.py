import os
import json
import asyncio
import threading
import requests
from fastapi import FastAPI, HTTPException, BackgroundTasks
import psycopg2
import time
from pydantic import BaseModel

app = FastAPI(
    title="DeepLens Reasoning Service",
    description="AI-powered product metadata extraction using local Ollama instance.",
    version="1.1.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# ---------------------------------------------------------------------------
# Priority Queue for Ollama calls
# Priority 0 = HIGH  (manual / interactive requests)
# Priority 1 = LOW   (bulk / automated background requests)
# A single asyncio worker processes one Ollama call at a time so that a
# high-priority request always jumps ahead of queued low-priority ones.
# ---------------------------------------------------------------------------
_ollama_queue: asyncio.PriorityQueue = asyncio.PriorityQueue()
_queue_counter = 0   # tie-breaker so equal priorities preserve insertion order

async def _ollama_worker():
    """Single async worker that drains the priority queue sequentially."""
    while True:
        priority, _seq, prompt, system, future = await _ollama_queue.get()
        try:
            result = await asyncio.get_event_loop().run_in_executor(
                None, _call_ollama_sync, prompt, system
            )
            future.set_result(result)
        except Exception as exc:
            future.set_exception(exc)
        finally:
            _ollama_queue.task_done()

@app.on_event("startup")
async def _start_worker():
    asyncio.create_task(_ollama_worker())


@app.get("/", include_in_schema=False)
async def root():
    from fastapi.responses import RedirectResponse
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

# Model configuration
MODEL_ID = os.getenv("MODEL_ID", "phi4-mini:latest")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

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

INDIAN_FASHION_GLOSSARY = {
    "fabrics": [
        "Cotton", "Silk", "Georgette", "Organza", "Crepe", "Dola Silk", "Kota Checks", 
        "Tissue Silk", "Chinnon", "Chiffon", "Velvet", "Paithani", "Tussar", "Bandhani", 
        "Banarasi", "Chiniya Silk", "Kanjivaram", "Linen"
    ],
    "styles": [
        "Saree", "Lehenga", "Gown", "Frock", "Kurti", "Anarkali", "Salwar Suit", "Plazo Set", "Crop Top Lehenga"
    ],
    "work_types": [
        "Zari Weaving", "Embroidery", "Mirror Work", "Ajrakh Print", "Gota Patti", "Sequence Work", "Hand Work", "Cut Work"
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
    "   - 'kids': This is an umbrella category for ANY children's clothing. If 'kids', 'boys', 'girls', children's sizes (e.g., 'size 14y', '10y', '12y'), OR any age 16 years or below (e.g., '1-16 years', '6 months', '16 yrs') is mentioned, it MUST be 'kids' (even if it's a dress or lehenga).\n"
    "   - 'lehanga': Exclusively for adult lehengas. If it mentions kids, boys, girls, children's sizes, or age <= 16, use 'kids' instead.\n"
    "   - 'dress': Exclusively for adult dresses. Includes 'cord set', 'co-ord set', 'skirt with top', 'kurti dress', 'gown'. If it mentions kids, boys, girls, children's sizes (e.g., '14y'), or age <= 16, use 'kids' instead.\n"
    "   - 'saree': Any mention of 'saree', 'sari', or related hashtags like '#partywearsaree' MUST be categorized as 'saree'.\n"
    "2. \"subCategory\": Subcategory or type (e.g. Silk Saree, Cotton Kurti, Georgette Dress, Semi-Stitched Lehenga).\n"
    "3. \"price\": The base selling price of the product (excluding shipping charges). Treat the money as a pure number directly from the text regardless of currency symbols (like $, €, Rs, INR, /-, etc.). Do NOT perform currency conversion or scaling (e.g. do NOT convert $25 to 2500; extract the exact value 25). Do NOT sum up or calculate total price with shipping. Output ONLY the numeric value (e.g., 1450, 599.50). If no price is mentioned, use null.\n"
    "4. \"isPlusShipping\": A boolean (true or false). Set to false ONLY IF 'free shipping', 'shipping free', 'free ship', or similar is explicitly mentioned. Set to true if shipping is extra, 'plus shipping', '+ $', '+ shipping', or if shipping is NOT mentioned at all.\n"
    "5. \"title\": A concise, clean, and professional product title in English of MAXIMUM 5 WORDS summarizing the core product. Do NOT include vendor codes, price, emojis, or marketing fluff (like 'New Design', 'Grab it', 'Full Stock'). Example: 'Red Banarasi Silk Saree', 'Girls Cotton Floral Frock', 'Velvet Maggam Work Gown'.\n"
    "6. \"fabric\": The material/fabric (e.g. Silk, Georgette, Cotton). MUST be a single string, NOT an array. If multiple, combine them (e.g. \"Cotton Silk\"). If unknown, use \"Unknown\".\n"
    "6. \"stitchType\": The stitch type (e.g. Unstitched, Semi-Stitched, Stitched, Free Size). MUST be a single string, NOT an array.\n"
    "7. \"color\": The color of the product as a single string (e.g. \"Red\", \"Navy Blue\"). MUST be a single string, NOT an array. Use null if unknown.\n"
    "8. \"sizes\": An array of available sizes (e.g. [\"M\", \"L\", \"XL\"]). If no sizes are mentioned, use an empty array [].\n"
    "9. \"tags\": An array of relevant search tags/keywords (e.g. [\"partywear\", \"wedding\", \"zari border\"]).\n\n"
    "FEW-SHOT EXAMPLES:\n"
    "Example 1 Input: \"Beautiful Georgette saree in navy blue with heavy zari border. Price 1200 + free shipping.\"\n"
    "Example 1 Output: { \"category\": \"saree\", \"subCategory\": \"Georgette Saree\", \"price\": 1200.0, \"isPlusShipping\": false, \"title\": \"Navy Blue Georgette Zari Saree\", \"fabric\": \"Georgette\", \"stitchType\": \"Unstitched\", \"color\": \"Navy Blue\", \"sizes\": [], \"tags\": [\"zari border\", \"partywear\"] }\n\n"
    "Example 2 Input: \"Kids cotton frocks, sizes 2-6 years. Rs 450 + shipping.\"\n"
    "Example 2 Output: { \"category\": \"kids\", \"subCategory\": \"Frocks\", \"price\": 450.0, \"isPlusShipping\": true, \"title\": \"Kids Cotton Frock\", \"fabric\": \"Cotton\", \"stitchType\": \"Stitched\", \"color\": null, \"sizes\": [\"2 years\", \"3 years\", \"4 years\", \"5 years\", \"6 years\"], \"tags\": [\"kids wear\", \"frock\"] }\n\n"
    "Example 3 Input: \"Trending cord set with top and bottom. Size M L XL. Rs 800\"\n"
    "Example 3 Output: { \"category\": \"dress\", \"subCategory\": \"Co-ord Set\", \"price\": 800.0, \"isPlusShipping\": true, \"title\": \"Women's Co-ord Cord Set\", \"fabric\": \"Unknown\", \"stitchType\": \"Stitched\", \"color\": null, \"sizes\": [\"M\", \"L\", \"XL\"], \"tags\": [\"cord set\", \"co-ord set\"] }\n\n"
    "Example 4 Input: \"Beautiful party wear frock for girls (size 12-14y). Price 950 shipping free\"\n"
    "Example 4 Output: { \"category\": \"kids\", \"subCategory\": \"Frock\", \"price\": 950.0, \"isPlusShipping\": false, \"title\": \"Girls Party Wear Frock\", \"fabric\": \"Unknown\", \"stitchType\": \"Stitched\", \"color\": null, \"sizes\": [\"12 years\", \"13 years\", \"14 years\"], \"tags\": [\"partywear\", \"frock\"] }\n\n"
    "Example 5 Input: \"Designer soft silk saree. Price 2500 + 100 shipping charge.\"\n"
    "Example 5 Output: { \"category\": \"saree\", \"subCategory\": \"Silk Saree\", \"price\": 2500.0, \"isPlusShipping\": true, \"title\": \"Designer Soft Silk Saree\", \"fabric\": \"Silk\", \"stitchType\": \"Unstitched\", \"color\": null, \"sizes\": [], \"tags\": [\"designer\", \"partywear\"] }\n\n"
    "Example 6 Input: \"To ,\n\nNew design launching \n\nPure soft georgette saree with zari weaving border and gota patti work. Rate /- 1250 fs\n\nFull stock ready grab it\"\n"
    "Example 6 Output: { \"category\": \"saree\", \"subCategory\": \"Georgette Saree\", \"price\": 1250.0, \"isPlusShipping\": false, \"title\": \"Pure Georgette Saree with Gota Patti Work\", \"fabric\": \"Georgette\", \"stitchType\": \"Unstitched\", \"color\": null, \"sizes\": [], \"tags\": [\"zari weaving\", \"gota patti\"] }\n\n"
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

def _call_ollama_sync(prompt: str, system: str = "", cancel_event: threading.Event = None) -> str:
    """Synchronous Ollama call — runs inside a thread executor via the worker."""
    url = f"{OLLAMA_BASE_URL}/api/generate"
    payload = {
        "model": MODEL_ID,
        "prompt": prompt,
        "system": system,
        "format": "json",
        "stream": True,
        "options": {
            "num_ctx": 4096,
            "temperature": 0.1
        }
    }
    try:
        full_response = []
        with requests.post(url, json=payload, stream=True, timeout=120) as response:
            response.raise_for_status()
            for line in response.iter_lines():
                if cancel_event and cancel_event.is_set():
                    # Sever the TCP connection forcefully to abort generation
                    response.close()
                    raise Exception("Client cancelled the request.")
                if line:
                    chunk = json.loads(line)
                    full_response.append(chunk.get("response", ""))
                    if chunk.get("done"):
                        break
        return "".join(full_response)
    except Exception as e:
        print(f"Error calling Ollama API: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to communicate with LLM: {str(e)}")

from fastapi import Request
async def enqueue_ollama(prompt: str, system: str, priority: int, req: Request = None) -> str:
    """
    Submit an Ollama call to the priority queue and await its result.
    priority=0  → HIGH (manual / interactive, jumps ahead of bulk jobs)
    priority=1  → LOW  (bulk / automated background processing)
    """
    global _queue_counter
    loop = asyncio.get_event_loop()
    future: asyncio.Future = loop.create_future()
    cancel_event = threading.Event()
    _queue_counter += 1
    
    await _ollama_queue.put((priority, _queue_counter, prompt, system, future, cancel_event))
    
    if req is None:
        return await future

    while not future.done():
        if await req.is_disconnected():
            cancel_event.set()
            if not future.done():
                future.cancel()
            raise HTTPException(status_code=499, detail="Client Closed Request")
        await asyncio.sleep(0.5)
        
    if future.cancelled() or cancel_event.is_set():
        raise HTTPException(status_code=499, detail="Client Closed Request")
        
    return future.result()

@app.get("/health")
async def health():
    try:
        res = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
        res.raise_for_status()
        models = [m.get("name") for m in res.json().get("models", [])]
        is_ready = MODEL_ID in models
        return {"status": "ok", "model": MODEL_ID, "ready": is_ready, "backend": "ollama", "available_models": models}
    except Exception as e:
        return {"status": "error", "model": MODEL_ID, "ready": False, "error": str(e)}

@app.post("/extract", response_model=ExtractionResponse)
async def extract_metadata(req: Request, request: ExtractionRequest, background_tasks: BackgroundTasks):
    prompt = f"Description: {request.text}\nExtract metadata according to the system prompt rules."

    start_time = time.time()
    raw_text = await enqueue_ollama(prompt=prompt, system=SYSTEM_PROMPT_EXTRACT, priority=0)
    latency_ms = int((time.time() - start_time) * 1000)
    
    background_tasks.add_task(log_llm_call, "/extract", prompt, raw_text, latency_ms)
    
    try:
        data = json.loads(raw_text)
        return ExtractionResponse(**data, raw_response=raw_text)
    except Exception as e:
        return ExtractionResponse(raw_response=raw_text)

@app.post("/suggest-group-metadata", response_model=SuggestResponse)
async def suggest_group_metadata(req: Request, request: SuggestRequest, background_tasks: BackgroundTasks):
    combined_desc = "\n---\n".join(request.descriptions)
    prompt = f"Descriptions:\n{combined_desc}\n\nGenerate the title and keywords."

    start_time = time.time()
    # priority=0 → HIGH: manual curation request, always jumps ahead of bulk re-eval
    raw_text = await enqueue_ollama(prompt=prompt, system=SYSTEM_PROMPT_SUGGEST, priority=0)
    latency_ms = int((time.time() - start_time) * 1000)
    
    background_tasks.add_task(log_llm_call, "/suggest-group-metadata", prompt, raw_text, latency_ms)
    
    try:
        data = json.loads(raw_text)
        return SuggestResponse(
            title=data.get("title", "New Collection"),
            keywords=data.get("keywords", ""),
            raw_response=raw_text
        )
    except Exception as e:
        print(f"JSON Parse Error: {e}\nRaw Text: {raw_text}")
        raise HTTPException(status_code=500, detail="Failed to parse LLM response into JSON")

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
    # priority from query param: 0=HIGH (manual user action), 1=LOW (bulk automation, default)
    raw_text = await enqueue_ollama(prompt=prompt, system=SYSTEM_PROMPT_PRODUCT_EXTRACT, priority=priority, req=req)
    latency_ms = int((time.time() - start_time) * 1000)
    
    background_tasks.add_task(log_llm_call, "/extract-product", prompt, raw_text, latency_ms)
    
    try:
        raw_text_clean = raw_text.strip()
        import re
        match = re.search(r'```(?:json)?(.*?)```', raw_text_clean, re.DOTALL)
        if match:
            raw_text_clean = match.group(1).strip()
            
        data = json.loads(raw_text_clean)
        
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

    # priority=0 → HIGH: manual YouTube title generation
    raw_text = await enqueue_ollama(prompt=prompt, system=SYSTEM_PROMPT_YOUTUBE_TITLE, priority=0, req=req)
    
    try:
        data = json.loads(raw_text)
        return YoutubeTitleResponse(
            title=data.get("title", ""),
            raw_response=raw_text
        )
    except Exception as e:
        print(f"JSON Parse Error for Youtube Title: {e}\nRaw Text: {raw_text}")
        return YoutubeTitleResponse(title="", raw_response=raw_text)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)

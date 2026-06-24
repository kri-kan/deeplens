import os
import json
import requests
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(
    title="DeepLens Reasoning Service",
    description="AI-powered product metadata extraction using local Ollama instance.",
    version="1.1.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

@app.get("/", include_in_schema=False)
async def root():
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/docs")

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
    category: str | None = "others"
    subCategory: str | None = "General"
    price: float | None = None
    shippingInfo: str | None = "extra"
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
    "Extract and populate these fields in the JSON response:\n"
    "1. \"category\": Main product category. MUST be EXACTLY ONE of: \"saree\", \"dress\", \"lehanga\", \"kids\", or \"others\". Do not use any other category names.\n"
    "   CRITICAL CATEGORIZATION RULES:\n"
    "   - 'kids': This is an umbrella category for ANY children's clothing (e.g. kids dress, kids kurti, kids frock, kids gown, kids lehenga). If 'kids', 'boys', 'girls', or children's sizes are mentioned, it MUST be 'kids'.\n"
    "   - 'lehanga': Exclusively for adult lehengas. If it mentions kids, use 'kids' instead.\n"
    "   - 'dress': Exclusively for adult dresses. Includes 'cord set', 'co-ord set', 'skirt with top', 'kurti dress', 'gown'. If it mentions kids, use 'kids' instead.\n"
    "   - 'saree': Any mention of 'saree', 'sari', or related hashtags like '#partywearsaree' MUST be categorized as 'saree'.\n"
    "2. \"subCategory\": Subcategory or type (e.g. Silk Saree, Cotton Kurti, Georgette Dress, Semi-Stitched Lehenga).\n"
    "3. \"price\": The base price as a decimal number. If no price is mentioned, use null. Ignore formatting characters like Currency symbols.\n"
    "4. \"shippingInfo\": Use \"free\" if free shipping or delivery is mentioned. Use \"extra\" if shipping is extra, plus, or not free. Otherwise, use \"extra\" as default.\n"
    "5. \"fabric\": The material/fabric (e.g. Silk, Georgette, Cotton). MUST be a single string, NOT an array. If multiple, combine them (e.g. \"Cotton Silk\"). If unknown, use \"Unknown\".\n"
    "6. \"stitchType\": The stitch type (e.g. Unstitched, Semi-Stitched, Stitched, Free Size). MUST be a single string, NOT an array.\n"
    "7. \"color\": The color of the product as a single string (e.g. \"Red\", \"Navy Blue\"). MUST be a single string, NOT an array. Use null if unknown.\n"
    "8. \"sizes\": An array of available sizes (e.g. [\"M\", \"L\", \"XL\"]). If no sizes are mentioned, use an empty array [].\n"
    "9. \"tags\": An array of relevant search tags/keywords (e.g. [\"partywear\", \"wedding\", \"zari border\"]).\n\n"
    "FEW-SHOT EXAMPLES:\n"
    "Example 1 Input: \"Beautiful Georgette saree in navy blue with heavy zari border. Price 1200 + free shipping.\"\n"
    "Example 1 Output: { \"category\": \"saree\", \"subCategory\": \"Georgette Saree\", \"price\": 1200.0, \"shippingInfo\": \"free\", \"fabric\": \"Georgette\", \"stitchType\": \"Unstitched\", \"color\": \"Navy Blue\", \"sizes\": [], \"tags\": [\"zari border\", \"partywear\"] }\n\n"
    "Example 2 Input: \"Kids cotton frocks, sizes 2-6 years. Rs 450 + shipping.\"\n"
    "Example 2 Output: { \"category\": \"kids\", \"subCategory\": \"Frocks\", \"price\": 450.0, \"shippingInfo\": \"extra\", \"fabric\": \"Cotton\", \"stitchType\": \"Stitched\", \"color\": null, \"sizes\": [\"2 years\", \"3 years\", \"4 years\", \"5 years\", \"6 years\"], \"tags\": [\"kids wear\", \"frock\"] }\n\n"
    "Example 3 Input: \"Trending cord set with top and bottom. Size M L XL. Rs 800\"\n"
    "Example 3 Output: { \"category\": \"dress\", \"subCategory\": \"Co-ord Set\", \"price\": 800.0, \"shippingInfo\": \"extra\", \"fabric\": \"Unknown\", \"stitchType\": \"Stitched\", \"color\": null, \"sizes\": [\"M\", \"L\", \"XL\"], \"tags\": [\"cord set\", \"co-ord set\"] }\n\n"
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

def call_ollama(prompt: str, system: str = "") -> str:
    url = f"{OLLAMA_BASE_URL}/api/generate"
    payload = {
        "model": MODEL_ID,
        "prompt": prompt,
        "system": system,
        "format": "json",
        "stream": False,
        "options": {
            "num_ctx": 4096,
            "temperature": 0.1
        }
    }
    
    try:
        response = requests.post(url, json=payload, timeout=30)
        response.raise_for_status()
        data = response.json()
        return data.get("response", "")
    except Exception as e:
        print(f"Error calling Ollama API: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to communicate with LLM: {str(e)}")

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
async def extract_metadata(request: ExtractionRequest):
    prompt = f"Description: {request.text}\nExtract metadata according to the system prompt rules."
    
    raw_text = call_ollama(prompt=prompt, system=SYSTEM_PROMPT_EXTRACT)
    
    try:
        data = json.loads(raw_text)
        return ExtractionResponse(**data, raw_response=raw_text)
    except Exception as e:
        return ExtractionResponse(raw_response=raw_text)

@app.post("/suggest-group-metadata", response_model=SuggestResponse)
async def suggest_group_metadata(request: SuggestRequest):
    combined_desc = "\n---\n".join(request.descriptions)
    prompt = f"Descriptions:\n{combined_desc}\n\nGenerate the title and keywords."
    
    raw_text = call_ollama(prompt=prompt, system=SYSTEM_PROMPT_SUGGEST)
    
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
async def extract_product(request: ProductExtractionRequest):
    prompt = f"WhatsApp Description:\n{request.description}\n\nExtract metadata."
    
    raw_text = call_ollama(prompt=prompt, system=SYSTEM_PROMPT_PRODUCT_EXTRACT)
    
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
            "shipping_info": "shippingInfo",
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

        # Clean up price format if it's returned as a string (e.g. "Rs. 1200", "1200 + shipping")
        price_val = data.get("price")
        if isinstance(price_val, str):
            # Find numbers (with optional decimals) in the string
            numbers = re.findall(r'\d+(?:\.\d+)?', price_val)
            if numbers:
                data["price"] = float(numbers[0])
            else:
                data["price"] = None
            
        category_str = str(data.get("category", "")).lower().strip()
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
            data["category"] = "others"
            
        return ProductExtractionResponse(**data, raw_response=raw_text)
    except Exception as e:
        print(f"JSON Parse Error for Product Extraction: {e}\nRaw Text: {raw_text}")
        raise HTTPException(status_code=500, detail=f"Failed to parse LLM response: {e}")

@app.post("/generate-youtube-title", response_model=YoutubeTitleResponse)
async def generate_youtube_title(request: YoutubeTitleRequest):
    prompt = f"Description:\n{request.description}\n\nGenerate the title."
    
    raw_text = call_ollama(prompt=prompt, system=SYSTEM_PROMPT_YOUTUBE_TITLE)
    
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

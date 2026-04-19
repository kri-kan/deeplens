import random

# A comprehensive list of mobile device profiles for fingerprinting
DEVICE_PROFILES = [
    # Google Pixel series
    {"model": "Pixel 7 Pro", "os": "Android 13", "platform": "Android", "pf_ver": "13.0", "build": "TQ2A.230305.008"},
    {"model": "Pixel 7", "os": "Android 13", "platform": "Android", "pf_ver": "13.0", "build": "TQ1A.221205.011"},
    {"model": "Pixel 6 Pro", "os": "Android 12", "platform": "Android", "pf_ver": "12.0", "build": "SD1A.210817.036"},
    {"model": "Pixel 6", "os": "Android 12", "platform": "Android", "pf_ver": "12.0", "build": "SQ1D.211205.016"},
    {"model": "Pixel 5", "os": "Android 11", "platform": "Android", "pf_ver": "11.0", "build": "RD1A.201105.003"},
    
    # Samsung Galaxy series
    {"model": "SM-S918B", "os": "Android 13", "platform": "Android", "pf_ver": "13.0", "build": "TP1A.220624.014"}, # S23 Ultra
    {"model": "SM-S911B", "os": "Android 13", "platform": "Android", "pf_ver": "13.0", "build": "TP1A.220624.014"}, # S23
    {"model": "SM-S908B", "os": "Android 12", "platform": "Android", "pf_ver": "12.0", "build": "SP1A.210812.016"}, # S22 Ultra
    {"model": "SM-S901B", "os": "Android 12", "platform": "Android", "pf_ver": "12.0", "build": "SP1A.210812.016"}, # S22
    {"model": "SM-G998B", "os": "Android 11", "platform": "Android", "pf_ver": "11.0", "build": "RP1A.200720.012"}, # S21 Ultra
    {"model": "SM-G991B", "os": "Android 11", "platform": "Android", "pf_ver": "11.0", "build": "RP1A.200720.012"}, # S21
    {"model": "SM-A536B", "os": "Android 12", "platform": "Android", "pf_ver": "12.0", "build": "SP1A.210812.016"}, # A53 5G
    
    # Xiaomi / Redmi
    {"model": "2210132G", "os": "Android 13", "platform": "Android", "pf_ver": "13.0", "build": "TKQ1.220829.002"}, # Xiaomi 13 Pro
    {"model": "M2102J20SG", "os": "Android 11", "platform": "Android", "pf_ver": "11.0", "build": "RKQ1.201112.002"}, # Poco X3 Pro
    {"model": "Redmi Note 11", "os": "Android 11", "platform": "Android", "pf_ver": "11.0", "build": "RKQ1.211001.001"},
    
    # Motorola
    {"model": "moto g(60)", "os": "Android 11", "platform": "Android", "pf_ver": "11.0", "build": "RRI31.Q1-42-51-12"},
    {"model": "Edge 30", "os": "Android 12", "platform": "Android", "pf_ver": "12.0", "build": "S1RD32.55-68"},
    
    # Legacy / Common Scraper Targets (Very compatible)
    {"model": "Nexus 5", "os": "Android 6.0", "platform": "Android", "pf_ver": "6.0", "build": "MRA58N"},
]

# Common mobile screen resolutions (Logic: width, list of possible dpr)
VIEWPORT_CONFIGS = [
    {"width": 360, "height_range": (640, 800), "dpr": ["2", "3"]},
    {"width": 375, "height_range": (667, 812), "dpr": ["2", "3"]},
    {"width": 390, "height_range": (844, 900), "dpr": ["3"]},
    {"width": 412, "height_range": (732, 915), "dpr": ["2.625", "3.5"]},
    {"width": 430, "height_range": (932, 1000), "dpr": ["3"]},
]

ACCEPT_LANGUAGES = [
    "en-GB,en-IN;q=0.9,en-US;q=0.8,en;q=0.7",
    "en-US,en;q=0.9",
    "en-GB,en;q=0.9",
    "en-US,en;q=0.8,en-IN;q=0.7",
    "en-AU,en;q=0.9,en-US;q=0.8",
    "en-CA,en;q=0.9,en-US;q=0.8",
]

def get_mobile_fingerprint():
    """Generates a dynamic browser fingerprint (headers + cookies) to avoid tracking."""
    dev = random.choice(DEVICE_PROFILES)
    view = random.choice(VIEWPORT_CONFIGS)
    
    # Randomize Chrome version (keep it high as per original requirement, 140-160 range)
    chrome_major = random.randint(140, 160)
    chrome_full = f"{chrome_major}.0.{random.randint(6000, 7500)}.{random.randint(100, 250)}"
    
    # Resolve viewport
    width = view["width"]
    height = random.randint(*view["height_range"])
    dpr = random.choice(view["dpr"])
    
    # Build User-Agent
    ua = f"Mozilla/5.0 (Linux; {dev['os']}; {dev['model']} Build/{dev['build']}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{chrome_major}.0.0.0 Mobile Safari/537.36"
    
    headers = {
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": random.choice(ACCEPT_LANGUAGES),
        "cache-control": "no-cache",
        "dpr": dpr,
        "pragma": "no-cache",
        "priority": "u=0, i",
        "sec-ch-prefers-color-scheme": random.choice(["light", "dark"]),
        "sec-ch-ua": f'"Chromium";v="{chrome_major}", "Not-A.Brand";v="24", "Google Chrome";v="{chrome_major}"',
        "sec-ch-ua-full-version-list": f'"Chromium";v="{chrome_full}", "Not-A.Brand";v="24.0.0.0", "Google Chrome";v="{chrome_full}"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-model": f'"{dev["model"]}"',
        "sec-ch-ua-platform": f'"{dev["platform"]}"',
        "sec-ch-ua-platform-version": f'"{dev["pf_ver"]}"',
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
        "user-agent": ua,
        "viewport-width": str(width),
    }
    
    cookies = {
        "dpr": dpr,
        "wd": f"{width}x{height}",
    }
    
    return headers, cookies

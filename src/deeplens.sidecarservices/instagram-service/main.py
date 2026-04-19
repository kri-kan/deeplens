import logging
import os
import json
import re
import html
import requests
from time import time
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# Helper for dynamic browser fingerprinting
from fingerprints import get_mobile_fingerprint

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("InstagramSidecar")

app = FastAPI(
    title="DeepLens Instagram Sidecar Service",
    description="Mobile-UA scraper for public Instagram profiles with optional session-based burner account rotation.",
    version="2.0.0"
)

# --- Mock Mode ---
MOCK_ENABLED = os.getenv("DEBUG_MOCK_INSTAGRAM", "0") == "1"

# --- Session Account Pool ---
class SessionPool:
    def __init__(self):
        self.accounts = []
        self.current_index = 0
        self._load_accounts()

    def _load_accounts(self):
        raw = os.getenv("INSTAGRAM_ACCOUNTS", "[]")
        try:
            parsed = json.loads(raw)
            for acc in parsed:
                if "sessionid" in acc and "username" in acc:
                    self.accounts.append({
                        "username": acc["username"],
                        "sessionid": acc["sessionid"],
                        "csrftoken": acc.get("csrftoken", ""),
                        "penalty_until": 0,
                        "use_count": 0,
                    })
            logger.info(f"Loaded {len(self.accounts)} burner account(s) into session pool")
        except Exception as e:
            logger.error(f"Failed to parse INSTAGRAM_ACCOUNTS: {e}")

    def get_next_cookies(self, base_cookies: dict) -> tuple:
        """Returns (cookies, username) for the next available account (round-robin).
        Falls back to base_cookies if no accounts are configured."""
        if not self.accounts:
            return dict(base_cookies), None

        now = time()
        for _ in range(len(self.accounts)):
            acc = self.accounts[self.current_index]
            self.current_index = (self.current_index + 1) % len(self.accounts)
            if acc["penalty_until"] < now:
                acc["use_count"] += 1
                cookies = dict(base_cookies)
                cookies["sessionid"] = acc["sessionid"]
                if acc["csrftoken"]:
                    cookies["csrftoken"] = acc["csrftoken"]
                logger.info(f"Using burner account: {acc['username']}")
                return cookies, acc["username"]

        logger.warning("All burner accounts are throttled. Falling back to anonymous.")
        return dict(base_cookies), None

    def apply_penalty(self, username: str, duration: int = 1800):
        for acc in self.accounts:
            if acc["username"] == username:
                acc["penalty_until"] = time() + duration
                logger.warning(f"Account '{username}' penalized for {duration}s")

    def status(self):
        now = time()
        return {
            "total": len(self.accounts),
            "active": [a["username"] for a in self.accounts if a["penalty_until"] < now],
            "throttled": [a["username"] for a in self.accounts if a["penalty_until"] >= now],
            "anonymous_fallback": len(self.accounts) == 0,
        }

pool = SessionPool()

# --- Data Models ---
class InstagramProfile(BaseModel):
    user_id: str
    username: str
    full_name: str
    biography: str
    followers: int
    following: int
    posts_count: int
    external_url: Optional[str] = None
    is_private: bool
    is_verified: bool
    profile_pic_url: str

# --- Helpers ---
def get_mock_profile(username: str) -> dict:
    fake_id = str(sum(ord(c) for c in username) * 123456)
    return {
        "user_id": fake_id,
        "username": username,
        "full_name": f"Mock {username.capitalize()}",
        "biography": "Mock profile (rate limited or no accounts configured).",
        "followers": 1234,
        "following": 567,
        "posts_count": 42,
        "external_url": f"https://{username}.com",
        "is_private": False,
        "is_verified": True,
        "profile_pic_url": "https://via.placeholder.com/150",
    }

def scrape_profile(username: str) -> dict:
    """Scrape a public Instagram profile using dynamic mobile browser headers."""
    url = f"https://www.instagram.com/{username}/"
    
    headers, base_cookies = get_mobile_fingerprint()
    cookies, acc_username = pool.get_next_cookies(base_cookies)

    cookies["referer"] = url

    try:
        resp = requests.get(
            url,
            headers={**headers, "referer": url},
            cookies=cookies,
            timeout=15,
            allow_redirects=True
        )
    except requests.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Network error reaching Instagram: {e}")

    if resp.status_code == 404:
        raise HTTPException(status_code=404, detail=f"Profile '{username}' not found")

    if resp.status_code == 429:
        if acc_username:
            pool.apply_penalty(acc_username)
        raise HTTPException(status_code=429, detail="Instagram rate limit hit. Try again later.")

    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Instagram returned HTTP {resp.status_code}")

    raw_html = resp.text

    # --- Extract profile data from embedded JSON in page HTML ---
    # Instagram embeds structured data in a <script type="application/ld+json"> block
    user_id = ""
    full_name = ""
    biography = ""
    followers = 0
    following = 0
    posts_count = 0
    is_private = False
    is_verified = False
    profile_pic_url = ""
    external_url = None

    # Try to extract from `window.__additionalDataLoaded` or inline JSON blobs
    # Pattern 1: look for "user_id":"..." or "id":"..."
    uid_match = re.search(r'"user_id"\s*:\s*"(\d+)"', raw_html)
    if not uid_match:
        uid_match = re.search(r'"profilePage_(\d+)"', raw_html)
    if uid_match:
        user_id = uid_match.group(1)

    # Pattern 2: ld+json structured data
    ld_match = re.search(r'<script type="application/ld\+json">(.*?)</script>', raw_html, re.DOTALL)
    if ld_match:
        try:
            ld = json.loads(ld_match.group(1))
            full_name = ld.get("name", "")
            description = ld.get("description", "")
            biography = description
            main_entity = ld.get("mainEntityofPage", {})
            interaction_stats = ld.get("interactionStatistic", [])
            for stat in interaction_stats:
                itype = stat.get("interactionType", "")
                val = int(stat.get("userInteractionCount", 0))
                if "Follow" in itype:
                    followers = val
            profile_pic_url = ld.get("image", "")
        except Exception:
            pass

    # Pattern 3: og:description contains follower count
    if not followers:
        og_desc = re.search(r'<meta property="og:description" content="([^"]+)"', raw_html)
        if og_desc:
            text = og_desc.group(1)
            # Format: "X Followers, Y Following, Z Posts"
            nums = re.findall(r'([\d,]+)\s+(Follower|Following|Post)', text)
            for val, kind in nums:
                n = int(val.replace(",", ""))
                if kind == "Follower":
                    followers = n
                elif kind == "Following":
                    following = n
                elif kind == "Post":
                    posts_count = n

    # Pattern 4: og:image for profile pic
    if not profile_pic_url:
        og_img = re.search(r'<meta property="og:image" content="([^"]+)"', raw_html)
        if og_img:
            profile_pic_url = og_img.group(1)

    # Pattern 5: full name from og:title
    if not full_name:
        og_title = re.search(r'<meta property="og:title" content="([^"]+)"', raw_html)
        if og_title:
            full_name = og_title.group(1)

    # Clean up fields: Instagram embeds page title in og:title, strip the suffix
    if full_name:
        full_name = html.unescape(full_name)
        # og:title format: "Name (@handle) • Instagram photos and videos"
        full_name = re.sub(r'\s*\(@[^)]+\)\s*[\u2022\u00b7•·].*$', '', full_name).strip()
    biography = html.unescape(biography)

    if not user_id:
        logger.warning(f"Could not extract user_id for {username} from HTML. Instagram may have changed page structure.")

    return {
        "user_id": user_id,
        "username": username,
        "full_name": full_name,
        "biography": biography,
        "followers": followers,
        "following": following,
        "posts_count": posts_count,
        "external_url": external_url,
        "is_private": is_private,
        "is_verified": is_verified,
        "profile_pic_url": profile_pic_url,
    }

# --- Routes ---

@app.get("/")
async def root():
    return {
        "message": "DeepLens Instagram Sidecar (Mobile UA Scraper v2.0)",
        "pool": pool.status(),
        "mock_mode": MOCK_ENABLED,
    }

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "pool": pool.status(),
        "mock_mode": MOCK_ENABLED,
    }

@app.get("/profile/{username}", response_model=InstagramProfile)
async def get_profile(username: str):
    logger.info(f"Profile request: {username}")

    if MOCK_ENABLED:
        logger.warning(f"MOCK MODE active for {username}")
        return get_mock_profile(username)

    try:
        data = scrape_profile(username)
        return InstagramProfile(**data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8005)

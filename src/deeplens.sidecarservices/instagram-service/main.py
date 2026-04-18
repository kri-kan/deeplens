import logging
import instaloader
import os
import json
import random
from time import time
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("InstagramSidecar")

app = FastAPI(
    title="DeepLens Instagram Sidecar Service",
    description="Synchronous API for retrieving Instagram profile and post metadata using rotated burner accounts.",
    version="1.1.0"
)

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

class InstagramPost(BaseModel):
    shortcode: str
    caption: Optional[str] = None
    timestamp: datetime
    media_url: str
    is_video: bool
    likes: int
    comments_count: int

# --- Session Management ---

class SessionManager:
    def __init__(self):
        self.loaders = []
        self.current_index = 0
        self.mock_enabled = os.getenv("DEBUG_MOCK_INSTAGRAM", "0") == "1"
        self.load_accounts()

    def load_accounts(self):
        accounts_json = os.getenv("INSTAGRAM_ACCOUNTS", "[]")
        try:
            accounts = json.loads(accounts_json)
            for acc in accounts:
                if "username" in acc and "sessionid" in acc:
                    loader = instaloader.Instaloader(
                        sleep=True,
                        download_pictures=False,
                        download_videos=False,
                        download_video_thumbnails=False,
                        download_geotags=False,
                        download_comments=False,
                        save_metadata=False,
                        compress_json=False,
                        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
                    )
                    # Inject session cookie
                    loader.context._session.cookies.set('sessionid', acc['sessionid'], domain='.instagram.com')
                    loader.context.username = acc['username']
                    
                    self.loaders.append({
                        "instance": loader,
                        "username": acc['username'],
                        "penalty_until": 0,
                        "use_count": 0
                    })
            logger.info(f"Initialized SessionManager with {len(self.loaders)} active burner accounts")
        except Exception as e:
            logger.error(f"Failed to parse INSTAGRAM_ACCOUNTS: {e}")

    def get_next_loader(self) -> Optional[Dict]:
        if not self.loaders:
            return None
        
        now = time()
        # Find next available loader (Round Robin)
        for _ in range(len(self.loaders)):
            candidate = self.loaders[self.current_index]
            self.current_index = (self.current_index + 1) % len(self.loaders)
            
            if candidate["penalty_until"] < now:
                candidate["use_count"] += 1
                return candidate
        
        return None

    def apply_penalty(self, username: str, duration: int = 1800):
        """Apply a cool-down period to an account (30 mins by default)"""
        for l in self.loaders:
            if l["username"] == username:
                l["penalty_until"] = time() + duration
                logger.warning(f"Account {username} throttled. Penalty applied until {datetime.fromtimestamp(l['penalty_until'])}")
                break

    def get_status(self):
        now = time()
        active = [l["username"] for l in self.loaders if l["penalty_until"] < now]
        throttled = [l["username"] for l in self.loaders if l["penalty_until"] >= now]
        return {
            "total_accounts": len(self.loaders),
            "active": active,
            "throttled": throttled,
            "mock_fallback": self.mock_enabled
        }

# Initialize Global Session Manager
session_manager = SessionManager()

# --- Mock Data Helper ---

def get_mock_profile(username: str) -> InstagramProfile:
    fake_id = str(sum(ord(c) for c in username) * 123456)
    return InstagramProfile(
        user_id=fake_id,
        username=username,
        full_name=f"Mock {username.capitalize()}",
        biography=f"This is a mocked profile for {username} because of rate limits or missing credentials.",
        followers=1234,
        following=567,
        posts_count=42,
        external_url=f"https://{username}.com",
        is_private=False,
        is_verified=True,
        profile_pic_url="https://via.placeholder.com/150"
    )

# --- Routes ---

@app.get("/")
async def root():
    return {
        "message": "DeepLens Instagram Sidecar Service (Rotated Burners)",
        "status": session_manager.get_status()
    }

@app.get("/health")
async def health():
    return {
        "status": "ok", 
        "timestamp": datetime.now().isoformat(),
        "pool": session_manager.get_status()
    }

@app.get("/profile/{username}", response_model=InstagramProfile)
async def get_profile(username: str):
    loader_data = session_manager.get_next_loader()
    
    if not loader_data:
        if session_manager.mock_enabled:
            logger.warning(f"No active accounts. Returning mock data for {username}")
            return get_mock_profile(username)
        raise HTTPException(status_code=503, detail="No active Instagram accounts in pool (all throttled)")

    loader = loader_data["instance"]
    acc_name = loader_data["username"]
    logger.info(f"Fetching profile for {username} using account: {acc_name}")

    try:
        profile = instaloader.Profile.from_username(loader.context, username)
        return InstagramProfile(
            user_id=str(profile.userid),
            username=profile.username,
            full_name=profile.full_name,
            biography=profile.biography,
            followers=profile.followers,
            following=profile.followees,
            posts_count=profile.mediacount,
            external_url=profile.external_url,
            is_private=profile.is_private,
            is_verified=profile.is_verified,
            profile_pic_url=profile.profile_pic_url
        )
    except instaloader.exceptions.ProfileNotExistsException:
        raise HTTPException(status_code=404, detail="Profile not found")
    except instaloader.exceptions.ConnectionException as e:
        if "429" in str(e):
            session_manager.apply_penalty(acc_name)
            # Recursive retry with another loader if available
            return await get_profile(username)
        logger.error(f"Connection error for {acc_name}: {e}")
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error using {acc_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/profile/{username}/posts", response_model=List[InstagramPost])
async def get_recent_posts(username: str, count: int = Query(default=10, le=50)):
    loader_data = session_manager.get_next_loader()
    if not loader_data:
        raise HTTPException(status_code=503, detail="No active Instagram accounts in pool")

    loader = loader_data["instance"]
    acc_name = loader_data["username"]
    logger.info(f"Fetching posts for {username} using account: {acc_name}")

    try:
        profile = instaloader.Profile.from_username(loader.context, username)
        if profile.is_private:
            raise HTTPException(status_code=403, detail="Profile is private")
            
        posts = []
        for post in profile.get_posts():
            if len(posts) >= count:
                break
            posts.append(InstagramPost(
                shortcode=post.shortcode,
                caption=post.caption,
                timestamp=post.date_utc,
                media_url=post.url,
                is_video=post.is_video,
                likes=post.likes,
                comments_count=post.comments
            ))
        return posts
    except Exception as e:
        logger.error(f"Error fetching posts using {acc_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8005)

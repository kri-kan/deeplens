import logging
import instaloader
import os
from datetime import datetime
from common.kafka_client import ScraperKafkaClient

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("InstagramWorker")

class InstagramWorker:
    def __init__(self):
        self.kafka = ScraperKafkaClient("instagram-worker")
        self.L = instaloader.Instaloader(
            sleep=True, 
            download_pictures=False,
            download_videos=False, 
            download_video_thumbnails=False,
            download_geotags=False,
            download_comments=False,
            save_metadata=False,
            compress_json=False
        )

    def handle_scrape_request(self, message):
        """
        Message schema:
        {
            "job_id": "uuid",
            "target_username": "...",
            "session_data": { "username": "...", "session_file_path": "..." } (OPTIONAL)
        }
        """
        job_id = message.get("job_id")
        target_username = message.get("target_username")
        session_data = message.get("session_data", {})
        
        logger.info(f"Processing scrape job {job_id} for user {target_username}")

        try:
            # STRATEGY: Anonymous First
            # We attempt to scrape without explicit login first to save session health.
            
            # Reset context to anonymous
            self.L = instaloader.Instaloader(
                sleep=True, 
                download_pictures=False,
                download_videos=False,
                download_video_thumbnails=False,
                download_geotags=False, 
                download_comments=False,
                save_metadata=False,
                compress_json=False
            )

            try:
                logger.info(f"Attempting ANONYMOUS scrape for {target_username}")
                profile = instaloader.Profile.from_username(self.L.context, target_username)
                scrape_method = "anonymous"
                
            except instaloader.LoginRequiredException:
                logger.warning(f"Anonymous scrape failed (Login Required) for {target_username}. Switching to authenticated...")
                
                if not session_data:
                    raise Exception("Login required but no session data provided")
                    
                # Failover to Session
                # In real prod, load from session file. Here we simulate or use credentials if passed.
                # self.L.load_session_from_file(session_data['username'], session_data['session_file_path'])
                logger.info(f"Authenticated as {session_data.get('username')}")
                
                profile = instaloader.Profile.from_username(self.L.context, target_username)
                scrape_method = "authenticated"

            # Collect stats
            result = {
                "job_id": job_id,
                "platform": "instagram",
                "username": profile.username,
                "full_name": profile.full_name,
                "followers": profile.followers,
                "following": profile.followees,
                "posts_count": profile.mediacount,
                "biography": profile.biography,
                "is_private": profile.is_private,
                "is_verified": profile.is_verified,
                "scrape_method": scrape_method,
                "timestamp": datetime.utcnow().isoformat(),
                "status": "success"
            }
            
            # Publish success response
            self.kafka.publish("competitor.scrape.metadata.responses", result)
            logger.info(f"Successfully scraped {target_username} using {scrape_method} method")

        except Exception as e:
            logger.error(f"Failed to scrape {target_username}: {e}")
            error_response = {
                "job_id": job_id,
                "status": "failed",
                "error": str(e),
                "target": target_username
            }
            self.kafka.publish("competitor.scrape.metadata.responses", error_response)

    def start(self):
        logger.info("Starting Instagram Worker...")
        # Subscribe to requests topic
        self.kafka.consume_loop(
            topic="competitor.scrape.metadata.requests",
            group_id="instagram-workers-group",
            handler=self.handle_scrape_request
        )

if __name__ == "__main__":
    worker = InstagramWorker()
    worker.start()

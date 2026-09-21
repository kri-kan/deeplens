import argparse
import json
import logging
import os
import sys
from datetime import datetime
try:
    from common.kafka_client import ScraperKafkaClient
except ImportError:
    ScraperKafkaClient = None

try:
    import instaloader
except ImportError:
    instaloader = None

try:
    import psycopg2
    from psycopg2.extras import Json
except ImportError:
    psycopg2 = None
    Json = None

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("InstagramWorker")


class InstagramWorker:
    def __init__(self):
        self.kafka = None
        self.db_conn_str = os.getenv(
            "POSTGRES_CONNECTION",
            os.getenv("DATABASE_URL", "postgresql://postgres:Krikank1$@192.168.0.170:5432/deeplens_platform")
        )
        self.L = None
        self._init_instaloader()

    def _init_instaloader(self):
        if instaloader is None:
            logger.warning("instaloader package is not installed in current environment.")
            return
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

    def _get_kafka(self):
        if not self.kafka:
            self.kafka = ScraperKafkaClient("instagram-worker")
        return self.kafka

    @staticmethod
    def extract_collaborators(post):
        """
        Extract co-author producers and collaborators from an Instaloader Post object.
        Never relies on Meta Graph APIs.
        Returns a list of collaborator dicts with keys:
        - id: str
        - username: str
        - fullName: str
        - isVerified: bool
        - profilePictureUrl: str
        """
        collaborators = []
        seen_usernames = set()

        # Method 1: Inspect raw GraphQL node 'coauthor_producers'
        try:
            node = getattr(post, "_node", {}) or {}
            raw_coauthors = node.get("coauthor_producers") or []
            for co in raw_coauthors:
                if not isinstance(co, dict):
                    continue
                username = co.get("username")
                if username and username.lower() not in seen_usernames:
                    seen_usernames.add(username.lower())
                    collaborators.append({
                        "id": str(co.get("id", "")),
                        "username": username,
                        "fullName": co.get("full_name") or "",
                        "isVerified": bool(co.get("is_verified", False)),
                        "profilePictureUrl": co.get("profile_pic_url") or ""
                    })
        except Exception as e:
            logger.debug(f"Could not extract coauthor_producers from post._node: {e}")

        # Method 2: Inspect post.coauthor_producers property if present (Instaloader Profile objects)
        if not collaborators:
            try:
                coauthors = getattr(post, "coauthor_producers", None)
                if coauthors:
                    for p in coauthors:
                        username = getattr(p, "username", None)
                        if username and username.lower() not in seen_usernames:
                            seen_usernames.add(username.lower())
                            collaborators.append({
                                "id": str(getattr(p, "userid", "")),
                                "username": username,
                                "fullName": getattr(p, "full_name", "") or "",
                                "isVerified": bool(getattr(p, "is_verified", False)),
                                "profilePictureUrl": getattr(p, "profile_pic_url", "") or ""
                            })
            except Exception as e:
                logger.debug(f"Could not extract coauthor_producers from post object: {e}")

        return collaborators

    @staticmethod
    def extract_tagged_users(post):
        """Extract usernames tagged inside photo/video media."""
        tagged = []
        try:
            if hasattr(post, "tagged_users") and post.tagged_users:
                tagged = list(post.tagged_users)
        except Exception as e:
            logger.debug(f"Could not extract tagged_users: {e}")
        return tagged

    def format_post(self, post):
        """Format an instaloader Post object into a standardized metadata dictionary."""
        collaborators = self.extract_collaborators(post)
        tagged_users = self.extract_tagged_users(post)

        shortcode = getattr(post, "shortcode", "")
        caption = getattr(post, "caption", "") or ""
        date_utc = getattr(post, "date_utc", None)
        likes = getattr(post, "likes", 0) or 0
        comments = getattr(post, "comments", 0) or 0
        is_video = getattr(post, "is_video", False)
        media_url = getattr(post, "video_url", None) if is_video else getattr(post, "url", None)
        thumbnail_url = getattr(post, "url", None)
        owner_username = getattr(post, "owner_username", "")
        typename = getattr(post, "typename", "")

        media_type = "video" if is_video else ("carousel" if typename == "GraphSidecar" else "image")

        return {
            "platform_id": shortcode,
            "url": f"https://www.instagram.com/p/{shortcode}/" if shortcode else "",
            "caption": caption,
            "posted_at": date_utc.isoformat() if date_utc else None,
            "like_count": likes,
            "comment_count": comments,
            "media_type": media_type,
            "media_url": media_url,
            "thumbnail_url": thumbnail_url,
            "is_reel": bool(is_video),
            "owner_username": owner_username,
            "collaborators": collaborators,
            "tagged_users": tagged_users
        }

    def persist_posts_to_db(self, posts_data, target_username, watchlist_id=None):
        """
        Persists scraped posts and their collaborators directly to PostgreSQL competitor_videos.
        """
        if not psycopg2 or not self.db_conn_str:
            logger.info("PostgreSQL direct persistence skipped (psycopg2 or connection string unavailable).")
            return 0

        try:
            with psycopg2.connect(self.db_conn_str) as conn:
                with conn.cursor() as cur:
                    # Resolve watchlist_id if not provided
                    if not watchlist_id:
                        cur.execute(
                            "SELECT id FROM competitor_watchlist WHERE LOWER(username) = LOWER(%s) LIMIT 1",
                            (target_username,)
                        )
                        row = cur.fetchone()
                        if row:
                            watchlist_id = row[0]
                        else:
                            # Auto-create watchlist entry if absent
                            cur.execute(
                                """
                                INSERT INTO competitor_watchlist (username, platform, is_active, profile_category, created_at, updated_at)
                                VALUES (%s, 'instagram', true, 'Competitors', NOW(), NOW())
                                ON CONFLICT (username, platform) DO UPDATE SET updated_at = NOW()
                                RETURNING id
                                """,
                                (target_username,)
                            )
                            watchlist_id = cur.fetchone()[0]

                    upsert_sql = """
                        INSERT INTO competitor_videos (
                            watchlist_id, platform, platform_video_id, url, description, 
                            media_type, thumbnail_url, media_url, like_count, comment_count, 
                            posted_at, is_reel, raw_metadata, collaborators, status
                        ) VALUES (
                            %s, 'instagram', %s, %s, %s,
                            %s, %s, %s, %s, %s,
                            %s, %s, %s::jsonb, %s::jsonb, 'active'
                        )
                        ON CONFLICT (platform, platform_video_id) DO UPDATE
                        SET like_count = EXCLUDED.like_count,
                            comment_count = EXCLUDED.comment_count,
                            media_url = COALESCE(EXCLUDED.media_url, competitor_videos.media_url),
                            thumbnail_url = COALESCE(EXCLUDED.thumbnail_url, competitor_videos.thumbnail_url),
                            raw_metadata = COALESCE(EXCLUDED.raw_metadata, competitor_videos.raw_metadata),
                            collaborators = CASE 
                                WHEN EXCLUDED.collaborators IS NOT NULL AND EXCLUDED.collaborators != '[]'::jsonb 
                                THEN EXCLUDED.collaborators 
                                ELSE COALESCE(competitor_videos.collaborators, '[]'::jsonb) 
                            END,
                            updated_at = NOW();
                    """

                    saved_count = 0
                    for p in posts_data:
                        raw_meta = json.dumps(p)
                        collabs_json = json.dumps(p.get("collaborators", []))
                        cur.execute(
                            upsert_sql,
                            (
                                watchlist_id,
                                p["platform_id"],
                                p["url"],
                                p["caption"],
                                p["media_type"].upper(),
                                p["thumbnail_url"],
                                p["media_url"],
                                p["like_count"],
                                p["comment_count"],
                                p["posted_at"] or datetime.utcnow(),
                                p["is_reel"],
                                raw_meta,
                                collabs_json
                            )
                        )
                        saved_count += 1

                    conn.commit()
                    logger.info(f"Persisted {saved_count} posts and collaborator records to database for @{target_username}")
                    return saved_count
        except Exception as e:
            logger.error(f"Failed to persist posts to PostgreSQL: {e}")
            return 0

    def scrape_single_post(self, shortcode):
        """Scrape a single post or reel by shortcode and extract its collaborators."""
        self._init_instaloader()
        logger.info(f"Scraping single post/reel {shortcode}...")
        post = instaloader.Post.from_shortcode(self.L.context, shortcode)
        formatted = self.format_post(post)
        logger.info(
            f"Scraped {shortcode}: {len(formatted['collaborators'])} collaborators found: "
            f"{[c['username'] for c in formatted['collaborators']]}"
        )
        return formatted

    def handle_scrape_request(self, message):
        """
        Message schema:
        {
            "job_id": "uuid",
            "target_username": "...",
            "target_shortcode": "..." (OPTIONAL),
            "scrape_posts": true (OPTIONAL, default true),
            "max_posts": 25 (OPTIONAL),
            "session_data": { "username": "...", "session_file_path": "..." } (OPTIONAL)
        }
        """
        job_id = message.get("job_id", "manual")
        target_username = message.get("target_username")
        target_shortcode = message.get("target_shortcode")
        session_data = message.get("session_data", {})
        scrape_posts = message.get("scrape_posts", True)
        max_posts = message.get("max_posts", 25)

        logger.info(f"Processing scrape job {job_id} for user '{target_username}' / shortcode '{target_shortcode}'")

        try:
            self._init_instaloader()

            # Case 1: Single post scrape requested
            if target_shortcode and not target_username:
                single_post = self.scrape_single_post(target_shortcode)
                result = {
                    "job_id": job_id,
                    "platform": "instagram",
                    "shortcode": target_shortcode,
                    "post": single_post,
                    "timestamp": datetime.utcnow().isoformat(),
                    "status": "success"
                }
                if self.db_conn_str:
                    owner = single_post.get("owner_username") or "unknown"
                    self.persist_posts_to_db([single_post], owner)
                try:
                    self._get_kafka().publish("competitor.scrape.metadata.responses", result)
                except Exception as k_err:
                    logger.warning(f"Kafka publish skipped: {k_err}")
                return result

            # Case 2: Account scrape
            scrape_method = "anonymous"
            try:
                logger.info(f"Attempting ANONYMOUS scrape for @{target_username}")
                profile = instaloader.Profile.from_username(self.L.context, target_username)
            except instaloader.LoginRequiredException:
                logger.warning(f"Anonymous scrape failed (Login Required) for @{target_username}. Switching to authenticated...")
                if not session_data:
                    raise Exception("Login required but no session data provided")
                logger.info(f"Authenticated as {session_data.get('username')}")
                profile = instaloader.Profile.from_username(self.L.context, target_username)
                scrape_method = "authenticated"

            # Scrape recent posts & reels to retain collaborators
            posts_data = []
            if scrape_posts:
                try:
                    logger.info(f"Scraping up to {max_posts} posts for @{target_username} to retain collaborators...")
                    post_count = 0
                    for post in profile.get_posts():
                        if max_posts and post_count >= max_posts:
                            break
                        post_dict = self.format_post(post)
                        posts_data.append(post_dict)
                        post_count += 1
                    total_collabs = sum(len(p.get("collaborators", [])) for p in posts_data)
                    logger.info(f"Scraped {len(posts_data)} posts for @{target_username}. Retained {total_collabs} collaborators.")
                except Exception as post_err:
                    logger.warning(f"Warning during post extraction for @{target_username}: {post_err}")

            # Collect profile stats and posts
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
                "posts": posts_data,
                "items_found": len(posts_data),
                "timestamp": datetime.utcnow().isoformat(),
                "status": "success"
            }

            # Direct PostgreSQL persistence
            if posts_data:
                self.persist_posts_to_db(posts_data, target_username)

            # Publish to Kafka
            try:
                self._get_kafka().publish("competitor.scrape.metadata.responses", result)
                logger.info(f"Published scrape result to Kafka for @{target_username}")
            except Exception as k_err:
                logger.warning(f"Kafka publish skipped: {k_err}")

            logger.info(f"Successfully scraped @{target_username} using {scrape_method} method")
            return result

        except Exception as e:
            logger.error(f"Failed to scrape @{target_username}: {e}")
            error_response = {
                "job_id": job_id,
                "status": "failed",
                "error": str(e),
                "target": target_username
            }
            try:
                self._get_kafka().publish("competitor.scrape.metadata.responses", error_response)
            except Exception:
                pass
            return error_response

    def start(self):
        logger.info("Starting Instagram Worker...")
        self._get_kafka().consume_loop(
            topic="competitor.scrape.metadata.requests",
            group_id="instagram-workers-group",
            handler=self.handle_scrape_request
        )


def main():
    parser = argparse.ArgumentParser(description="DeepLens Instagram Scraper Worker")
    parser.add_argument("--target", type=str, help="Target Instagram username to scrape")
    parser.add_argument("--shortcode", type=str, help="Target post/reel shortcode to scrape")
    parser.add_argument("--posts", type=int, default=25, help="Maximum number of posts to scrape")
    parser.add_argument("--no-db", action="store_true", help="Disable direct database persistence")
    args = parser.parse_args()

    worker = InstagramWorker()
    if args.no_db:
        worker.db_conn_str = None

    if args.shortcode:
        post = worker.scrape_single_post(args.shortcode)
        print(json.dumps(post, indent=2))
    elif args.target:
        req = {
            "job_id": "cli-test",
            "target_username": args.target,
            "max_posts": args.posts,
            "scrape_posts": True
        }
        res = worker.handle_scrape_request(req)
        print(json.dumps(res, indent=2))
    else:
        worker.start()


if __name__ == "__main__":
    main()

import os
import logging
import sys

# Add current directory to path so imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from instagram.worker import InstagramWorker
# from youtube.worker import YouTubeWorker # To be implemented

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("ScraperWorkerMain")

def main():
    worker_type = os.getenv("WORKER_TYPE", "instagram").lower()
    
    logger.info(f"Initializing worker of type: {worker_type}")
    
    if worker_type == "instagram":
        worker = InstagramWorker()
        worker.start()
    elif worker_type == "youtube":
        logger.info("YouTube worker not yet implemented")
        # worker = YouTubeWorker()
        # worker.start()
    else:
        logger.error(f"Unknown worker type: {worker_type}")
        sys.exit(1)

if __name__ == "__main__":
    main()

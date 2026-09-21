import unittest
from unittest.mock import MagicMock
from datetime import datetime
import sys
import os

# Add parent dir to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from instagram.worker import InstagramWorker


class TestCollaboratorExtraction(unittest.TestCase):
    def setUp(self):
        self.worker = InstagramWorker()

    def test_extract_collaborators_from_raw_node(self):
        """Verify coauthor_producers extracted from raw GraphQL _node."""
        mock_post = MagicMock()
        mock_post._node = {
            "coauthor_producers": [
                {
                    "id": "12345678",
                    "username": "vayyari_fashions",
                    "full_name": "Vayyari Fashions Official",
                    "is_verified": True,
                    "profile_pic_url": "https://cdn.instagram.com/pic1.jpg"
                },
                {
                    "id": "87654321",
                    "username": "dressbyvayyari",
                    "full_name": "Dress by Vayyari",
                    "is_verified": False,
                    "profile_pic_url": "https://cdn.instagram.com/pic2.jpg"
                }
            ]
        }
        mock_post.coauthor_producers = None
        mock_post.tagged_users = []

        collaborators = self.worker.extract_collaborators(mock_post)
        self.assertEqual(len(collaborators), 2)
        self.assertEqual(collaborators[0]["username"], "vayyari_fashions")
        self.assertEqual(collaborators[0]["fullName"], "Vayyari Fashions Official")
        self.assertTrue(collaborators[0]["isVerified"])
        self.assertEqual(collaborators[1]["username"], "dressbyvayyari")
        self.assertFalse(collaborators[1]["isVerified"])

    def test_extract_collaborators_from_instaloader_objects(self):
        """Verify coauthor_producers extracted from Instaloader Profile objects when _node is absent."""
        mock_post = MagicMock()
        mock_post._node = {}
        
        mock_profile1 = MagicMock()
        mock_profile1.userid = 99999
        mock_profile1.username = "partner_studio"
        mock_profile1.full_name = "Partner Studio"
        mock_profile1.is_verified = True
        mock_profile1.profile_pic_url = "https://cdn.instagram.com/pic3.jpg"

        mock_post.coauthor_producers = [mock_profile1]
        mock_post.tagged_users = []

        collaborators = self.worker.extract_collaborators(mock_post)
        self.assertEqual(len(collaborators), 1)
        self.assertEqual(collaborators[0]["username"], "partner_studio")
        self.assertEqual(collaborators[0]["id"], "99999")
        self.assertTrue(collaborators[0]["isVerified"])

    def test_deduplication_and_case_insensitivity(self):
        """Verify duplicate co-author entries are deduplicated safely."""
        mock_post = MagicMock()
        mock_post._node = {
            "coauthor_producers": [
                {"id": "111", "username": "collab_user", "full_name": "Collab User", "is_verified": False},
                {"id": "111", "username": "COLLAB_USER", "full_name": "Collab User", "is_verified": False}
            ]
        }
        mock_post.coauthor_producers = None
        mock_post.tagged_users = []

        collaborators = self.worker.extract_collaborators(mock_post)
        self.assertEqual(len(collaborators), 1)
        self.assertEqual(collaborators[0]["username"], "collab_user")

    def test_format_post_with_collaborators_and_tags(self):
        """Verify full post formatting with metrics, collaborators, and media details."""
        mock_post = MagicMock()
        mock_post.shortcode = "C9xyzABC"
        mock_post.caption = "Exciting handloom collaboration with @dressbyvayyari ✨"
        mock_post.date_utc = datetime(2026, 9, 21, 12, 0, 0)
        mock_post.likes = 1200
        mock_post.comments = 45
        mock_post.is_video = True
        mock_post.video_url = "https://cdn.instagram.com/reel1.mp4"
        mock_post.url = "https://cdn.instagram.com/thumb1.jpg"
        mock_post.owner_username = "vayyari_fashions"
        mock_post.typename = "GraphVideo"
        mock_post._node = {
            "coauthor_producers": [
                {"id": "222", "username": "dressbyvayyari", "full_name": "Dress by Vayyari", "is_verified": True}
            ]
        }
        mock_post.tagged_users = ["model_official", "artisan_crafts"]

        formatted = self.worker.format_post(mock_post)
        self.assertEqual(formatted["platform_id"], "C9xyzABC")
        self.assertEqual(formatted["url"], "https://www.instagram.com/p/C9xyzABC/")
        self.assertTrue(formatted["is_reel"])
        self.assertEqual(formatted["media_type"], "video")
        self.assertEqual(formatted["owner_username"], "vayyari_fashions")
        self.assertEqual(len(formatted["collaborators"]), 1)
        self.assertEqual(formatted["collaborators"][0]["username"], "dressbyvayyari")
        self.assertEqual(formatted["tagged_users"], ["model_official", "artisan_crafts"])


if __name__ == "__main__":
    unittest.main()

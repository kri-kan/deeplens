using System;

namespace DeepLens.SearchApi.DTOs.Instagram
{
    public class InstagramProfileDto
    {
        public string UserId { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Biography { get; set; } = string.Empty;
        public int Followers { get; set; }
        public int Following { get; set; }
        public int PostsCount { get; set; }
        public string? ExternalUrl { get; set; }
        public bool IsPrivate { get; set; }
        public bool IsVerified { get; set; }
        public string ProfilePicUrl { get; set; } = string.Empty;
    }

    public class InstagramPostDto
    {
        public string Shortcode { get; set; } = string.Empty;
        public string? Caption { get; set; }
        public DateTime Timestamp { get; set; }
        public string MediaUrl { get; set; } = string.Empty;
        public bool IsVideo { get; set; }
        public int Likes { get; set; }
        public int CommentsCount { get; set; }
    }
}

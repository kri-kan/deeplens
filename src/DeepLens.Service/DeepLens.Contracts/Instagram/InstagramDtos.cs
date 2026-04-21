namespace DeepLens.Contracts.Instagram;

public class InstagramProfileDto
{
    public string UserId { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string ProfilePicUrl { get; set; } = string.Empty;
    public string? Biography { get; set; }
    public int FollowersCount { get; set; }
}

public class InstagramPostDto
{
    public string Id { get; set; } = string.Empty;
    public string Shortcode { get; set; } = string.Empty;
    public string Caption { get; set; } = string.Empty;
    public string DisplayUrl { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
}

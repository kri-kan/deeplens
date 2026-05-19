using DeepLens.Contracts.Youtube;

namespace DeepLens.Application.Abstractions.Services
{
    public interface IYoutubeService
    {
        Task ReloadFromDbAsync();
        Task<YoutubeTokenHealth> GetTokenHealthAsync();
        Task<YoutubeQuotaInfo> GetQuotaAsync();
        
        /// <summary>
        /// Uploads a video from MinIO to YouTube.
        /// </summary>
        Task<YoutubeUploadResponse> UploadVideoAsync(YoutubeUploadRequest request);
        
        /// <summary>
        /// Exchanges an authorization code for access/refresh tokens.
        /// </summary>
        Task<bool> AuthenticateAsync(string authCode, string redirectUri);
        
        /// <summary>
        /// Refreshes the access token using the stored refresh token.
        /// </summary>
        Task<bool> RefreshTokenAsync();
        
        /// <summary>
        /// Generates the Google OAuth 2.0 authorization URL.
        /// </summary>
        Task<string> GetAuthUrlAsync(string redirectUri);
        
        /// <summary>
        /// Gets the next available scheduling slot to avoid overlaps.
        /// </summary>
        Task<DateTime> GetNextScheduleSlotAsync();

        /// <summary>
        /// Disconnects the YouTube account by clearing the tokens.
        /// </summary>
        Task<bool> DisconnectAsync();
    }
}

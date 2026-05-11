namespace DeepLens.Application.Abstractions.Services;

public interface IAiService
{
    /// <summary>
    /// Generates a YouTube Short title based on the description using Google Shorts Title Guidelines.
    /// </summary>
    /// <param name="description">The video description/caption.</param>
    /// <returns>A generated title string.</returns>
    Task<string> GenerateYoutubeShortTitleAsync(string description);
}

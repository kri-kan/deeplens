using DeepLens.Contracts.Media;

namespace DeepLens.Shared.Common;

/// <summary>
/// Centralized registry for all storage path assembly.
/// Concept: {Bucket}/{Folder}/{FileName}
/// </summary>
public static class StoragePathRegistry
{
    /// <summary>
    /// Assembles a path based on a structured storage context.
    /// </summary>
    public static string GetPath(StorageContext context, string identifier)
    {
        return $"{context.Bucket}/{context.Folder}/{identifier}";
    }

    /// <summary>
    /// For thumbnails: thumbnails/{spec}/{hash}.webp
    /// </summary>
    public static string GetThumbnailPath(string hash, string specName)
    {
        string spec = string.IsNullOrWhiteSpace(specName) ? "medium" : specName.ToLowerInvariant();
        return $"thumbnails/{spec}/{hash}.webp";
    }

    /// <summary>
    /// Returns the mc CLI compatible path: local/{bucket}/{object}
    /// </summary>
    public static string GetMinioMcPath(string fullPath)
    {
        return $"local/{fullPath}";
    }
}

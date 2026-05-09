namespace DeepLens.Domain.Enums;

public enum InstagramMediaType
{
    UNKNOWN = 0,
    IMAGE = 1,
    VIDEO = 2,
    CAROUSEL_ALBUM = 8
}

public static class InstagramMediaStandardizer
{
    public static InstagramMediaType MapToMediaType(object? rawType)
    {
        if (rawType == null) return InstagramMediaType.UNKNOWN;

        var typeStr = rawType.ToString()?.ToUpper() ?? "";
        
        if (typeStr == "VIDEO" || typeStr == "REEL" || typeStr == "2" || typeStr == "10")
            return InstagramMediaType.VIDEO;
            
        if (typeStr == "IMAGE" || typeStr == "1")
            return InstagramMediaType.IMAGE;
            
        if (typeStr == "CAROUSEL_ALBUM" || typeStr == "CAROUSEL" || typeStr == "8")
            return InstagramMediaType.CAROUSEL_ALBUM;

        return InstagramMediaType.UNKNOWN;
    }
}

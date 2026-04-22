namespace DeepLens.Shared.Common;

public static class MediaConstants
{
    public static class ThumbnailSpecs
    {
        public const string Icon = "icon";
        public const string Medium = "medium";
        public const string Large = "large";

        public static readonly Dictionary<string, (int width, int height)> Presets = new()
        {
            { Icon, (128, 128) },
            { Medium, (512, 512) },
            { Large, (1024, 1024) }
        };
    }

    public static class Paths
    {
        public const string RawDir = "raw";
        public const string ThumbnailsDir = "thumbnails";
        public const string PreviewsDir = "previews";
    }

    public static class Formats
    {
        public const string WebP = "image/webp";
        public const string Gif = "image/gif";
    }

    public static class Retention
    {
        public const string TagKey = "retention";

        public const string Days30 = "days30";
        public const string Days60 = "days60";
        public const string Days90 = "days90";
        public const string Days180 = "days180";
        public const string Days270 = "days270";
        public const string Days360 = "days360";
        public const string Infinite = "infinite";

        public static readonly string[] AllOptions = { Days30, Days60, Days90, Days180, Days270, Days360, Infinite };
    }
}

using System.Diagnostics;

namespace DeepLens.Shared.Telemetry;

public static class DeepLensActivitySource
{
    private static readonly ActivitySource Source = new("DeepLens");

    public static Activity? StartActivity(string name)
    {
        return Source.StartActivity(name);
    }
}

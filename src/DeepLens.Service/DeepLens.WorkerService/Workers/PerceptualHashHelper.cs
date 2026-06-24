using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;
using System;
using System.IO;
using System.Numerics;

namespace DeepLens.WorkerService.Workers;

public static class PerceptualHashHelper
{
    public static string ComputeDHash(Stream imageStream)
    {
        // Load the image as 8-bit grayscale (L8) directly
        using var image = Image.Load<L8>(imageStream);
        
        // Resize to 9x8 using stretch mode to fit the grid
        image.Mutate(x => x.Resize(new ResizeOptions
        {
            Size = new Size(9, 8),
            Mode = ResizeMode.Stretch
        }));

        ulong hash = 0;
        int bitIndex = 0;

        for (int y = 0; y < 8; y++)
        {
            for (int x = 0; x < 8; x++)
            {
                // Accessing pixels directly from the image
                var leftPixel = image[x, y].PackedValue;
                var rightPixel = image[x + 1, y].PackedValue;

                if (leftPixel > rightPixel)
                {
                    hash |= (1UL << bitIndex);
                }
                bitIndex++;
            }
        }

        return hash.ToString("x16"); // 16-character hexadecimal string representation of 64-bit hash
    }

    public static int GetHammingDistance(string hash1, string hash2)
    {
        if (string.IsNullOrEmpty(hash1) || string.IsNullOrEmpty(hash2))
        {
            return int.MaxValue;
        }

        if (hash1.Length != 16 || hash2.Length != 16)
        {
            // fallback character comparison if length is somehow not 16
            int dist = 0;
            for (int i = 0; i < Math.Min(hash1.Length, hash2.Length); i++)
            {
                if (hash1[i] != hash2[i]) dist++;
            }
            return dist + Math.Abs(hash1.Length - hash2.Length);
        }

        if (ulong.TryParse(hash1, System.Globalization.NumberStyles.HexNumber, null, out ulong val1) &&
            ulong.TryParse(hash2, System.Globalization.NumberStyles.HexNumber, null, out ulong val2))
        {
            return BitOperations.PopCount(val1 ^ val2);
        }

        return int.MaxValue;
    }
}

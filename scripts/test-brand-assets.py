#!/usr/bin/env python3
import os
import sys
from PIL import Image

def test_generated_assets(base_dir):
    expected = {
        "icon.png": (1024, 1024),
        "splash-icon.png": (1024, 1024),
        "android-icon-foreground.png": (512, 512),
        "android-icon-monochrome.png": (432, 432),
        "favicon.png": (48, 48),
    }

    # Android mipmaps & drawables
    android_expected = {
        "android/res/mipmap-mdpi/ic_launcher.webp": (48, 48),
        "android/res/mipmap-mdpi/ic_launcher_round.webp": (48, 48),
        "android/res/mipmap-mdpi/ic_launcher_foreground.webp": (108, 108),
        "android/res/mipmap-hdpi/ic_launcher.webp": (72, 72),
        "android/res/mipmap-hdpi/ic_launcher_round.webp": (72, 72),
        "android/res/mipmap-hdpi/ic_launcher_foreground.webp": (162, 162),
        "android/res/mipmap-xhdpi/ic_launcher.webp": (96, 96),
        "android/res/mipmap-xhdpi/ic_launcher_round.webp": (96, 96),
        "android/res/mipmap-xhdpi/ic_launcher_foreground.webp": (216, 216),
        "android/res/mipmap-xxhdpi/ic_launcher.webp": (144, 144),
        "android/res/mipmap-xxhdpi/ic_launcher_round.webp": (144, 144),
        "android/res/mipmap-xxhdpi/ic_launcher_foreground.webp": (324, 324),
        "android/res/mipmap-xxxhdpi/ic_launcher.webp": (192, 192),
        "android/res/mipmap-xxxhdpi/ic_launcher_round.webp": (192, 192),
        "android/res/mipmap-xxxhdpi/ic_launcher_foreground.webp": (432, 432),
        "android/res/drawable-mdpi/splashscreen_logo.png": (288, 288),
        "android/res/drawable-hdpi/splashscreen_logo.png": (432, 432),
        "android/res/drawable-xhdpi/splashscreen_logo.png": (576, 576),
        "android/res/drawable-xxhdpi/splashscreen_logo.png": (864, 864),
        "android/res/drawable-xxxhdpi/splashscreen_logo.png": (1152, 1152),
    }

    all_expected = {**expected, **android_expected}

    for filename, (w, h) in all_expected.items():
        path = os.path.join(base_dir, filename)
        assert os.path.exists(path), f"Missing {path}"
        im = Image.open(path)
        assert im.size == (w, h), f"{filename} size {im.size} != {(w, h)}"
        assert im.mode == "RGBA", f"{filename} mode {im.mode} != RGBA"

    # Verify android-icon-foreground safe zone constraint (within 66% of 512 = ~338px)
    fg_path = os.path.join(base_dir, "android-icon-foreground.png")
    fg_im = Image.open(fg_path)
    alpha = fg_im.split()[-1]
    bbox = alpha.getbbox()
    assert bbox is not None, "android-icon-foreground.png alpha is empty"
    bw = bbox[2] - bbox[0]
    bh = bbox[3] - bbox[1]
    max_dim = max(bw, bh)
    safe_zone_limit = int(512 * 0.66) + 4  # Allow up to 342px for anti-aliasing
    assert max_dim <= safe_zone_limit, (
        f"android-icon-foreground emblem max dimension {max_dim} exceeds safe zone limit {safe_zone_limit}"
    )

    print("All asset tests passed!")

if __name__ == "__main__":
    test_generated_assets(sys.argv[1])

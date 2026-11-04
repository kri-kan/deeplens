#!/usr/bin/env python3
"""
scripts/generate-brand-assets.py

Ingests official Vayyari vector brand logos from packages/brand-assets/svg/
and generates multi-density, normalized PNG and WebP assets across all target
resolutions and Android resource densities with exact safe zone compliance.
"""

import os
import sys
import shutil
import tempfile
import subprocess
from PIL import Image

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SVG_ICON = os.path.join(REPO_ROOT, "packages", "brand-assets", "svg", "vayyari-logo-gold-icon.svg")
SVG_SMALL = os.path.join(REPO_ROOT, "packages", "brand-assets", "svg", "vayyari-logo-gold-small.svg")
OUTPUT_BASE = os.path.join(REPO_ROOT, "packages", "brand-assets", "generated")

CHROME_BIN = "/usr/bin/google-chrome"


def render_svg_with_chrome(svg_path, render_dim=2048):
    """
    Renders an SVG to an RGBA PNG at the requested dimension using headless Chrome.
    Returns a PIL.Image object.
    """
    assert os.path.exists(svg_path), f"Source SVG not found: {svg_path}"
    assert os.path.exists(CHROME_BIN), f"Chrome binary not found: {CHROME_BIN}"

    temp_dir = tempfile.mkdtemp(prefix="brand_asset_render_")
    try:
        html_file = os.path.join(temp_dir, "render.html")
        png_file = os.path.join(temp_dir, "output.png")

        html_content = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  html, body {{
    width: 100%;
    height: 100%;
    background: transparent;
    overflow: hidden;
  }}
  .wrap {{
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }}
  img {{
    width: 100%;
    height: 100%;
    object-fit: contain;
  }}
</style>
</head>
<body>
  <div class="wrap">
    <img src="file://{os.path.abspath(svg_path)}">
  </div>
</body>
</html>"""

        with open(html_file, "w") as f:
            f.write(html_content)

        cmd = [
            CHROME_BIN,
            "--headless=new",
            "--disable-gpu",
            "--no-sandbox",
            "--default-background-color=00000000",
            f"--window-size={render_dim},{render_dim}",
            f"--screenshot={png_file}",
            f"file://{html_file}",
        ]

        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode != 0 or not os.path.exists(png_file):
            raise RuntimeError(f"Chrome rendering failed (exit {res.returncode}):\n{res.stderr}")

        im = Image.open(png_file).convert("RGBA")
        return im.copy()
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


def create_centered_asset(emblem, target_size, scale_ratio=0.85):
    """
    Places the emblem centered inside a canvas of target_size (w, h).
    scale_ratio determines what fraction of min(w, h) the emblem will span.
    """
    w, h = target_size
    max_dim = int(min(w, h) * scale_ratio)

    aspect = emblem.width / emblem.height
    if aspect >= 1.0:
        new_w = max_dim
        new_h = max(1, int(round(max_dim / aspect)))
    else:
        new_h = max_dim
        new_w = max(1, int(round(max_dim * aspect)))

    resized = emblem.resize((new_w, new_h), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))

    offset_x = (w - new_w) // 2
    offset_y = (h - new_h) // 2
    canvas.alpha_composite(resized, (offset_x, offset_y))
    return canvas


def create_monochrome_asset(emblem, target_size, scale_ratio=0.62):
    """
    Creates Android monochrome adaptive icon: solid white emblem with alpha mask.
    """
    w, h = target_size
    max_dim = int(min(w, h) * scale_ratio)

    aspect = emblem.width / emblem.height
    if aspect >= 1.0:
        new_w = max_dim
        new_h = max(1, int(round(max_dim / aspect)))
    else:
        new_h = max_dim
        new_w = max(1, int(round(max_dim * aspect)))

    resized = emblem.resize((new_w, new_h), Image.Resampling.LANCZOS)
    alpha_channel = resized.split()[-1]

    white_emblem = Image.new("RGBA", (new_w, new_h), (255, 255, 255, 0))
    white_emblem.putalpha(alpha_channel)

    canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    offset_x = (w - new_w) // 2
    offset_y = (h - new_h) // 2
    canvas.alpha_composite(white_emblem, (offset_x, offset_y))
    return canvas


def main():
    print(f"=== Generating Vayyari Brand Assets ===")
    print(f"Source SVG: {SVG_ICON}")
    print(f"Output directory: {OUTPUT_BASE}")

    os.makedirs(OUTPUT_BASE, exist_ok=True)

    print("Rasterizing master vector emblem via Headless Chrome at 2048x2048...")
    master_im = render_svg_with_chrome(SVG_ICON, render_dim=2048)
    alpha = master_im.split()[-1]
    bbox = alpha.getbbox()
    assert bbox is not None, "Master emblem alpha is completely transparent!"
    emblem_crop = master_im.crop(bbox)
    print(f"Emblem extracted with bounding box: {bbox} (width: {emblem_crop.width}, height: {emblem_crop.height})")

    # 1. Root standard assets
    root_targets = [
        ("icon.png", (1024, 1024), 0.85, "PNG"),
        ("splash-icon.png", (1024, 1024), 0.80, "PNG"),
        ("android-icon-foreground.png", (512, 512), 0.62, "PNG"),
        ("favicon.png", (48, 48), 0.90, "PNG"),
        ("vayyari-logo.png", (1024, 1024), 0.85, "PNG"),
    ]

    for filename, (w, h), ratio, fmt in root_targets:
        out_path = os.path.join(OUTPUT_BASE, filename)
        img = create_centered_asset(emblem_crop, (w, h), scale_ratio=ratio)
        img.save(out_path, format=fmt)
        print(f"Generated root asset: {filename} ({w}x{h})")

    # android-icon-background.png (512x512)
    bg_path = os.path.join(OUTPUT_BASE, "android-icon-background.png")
    bg_img = Image.new("RGBA", (512, 512), (12, 14, 20, 255))
    bg_img.save(bg_path, format="PNG")
    print("Generated root asset: android-icon-background.png (512x512)")

    # 2. Android monochrome icon
    mono_path = os.path.join(OUTPUT_BASE, "android-icon-monochrome.png")
    mono_img = create_monochrome_asset(emblem_crop, (432, 432), scale_ratio=0.62)
    mono_img.save(mono_path, format="PNG")
    print(f"Generated root asset: android-icon-monochrome.png (432x432)")

    # 3. Android mipmaps
    densities = {
        "mdpi": {"icon": (48, 48), "foreground": (108, 108)},
        "hdpi": {"icon": (72, 72), "foreground": (162, 162)},
        "xhdpi": {"icon": (96, 96), "foreground": (216, 216)},
        "xxhdpi": {"icon": (144, 144), "foreground": (324, 324)},
        "xxxhdpi": {"icon": (192, 192), "foreground": (432, 432)},
    }

    for density, sizes in densities.items():
        res_dir = os.path.join(OUTPUT_BASE, "android", "res", f"mipmap-{density}")
        os.makedirs(res_dir, exist_ok=True)

        icon_size = sizes["icon"]
        fg_size = sizes["foreground"]

        # ic_launcher_background.webp (solid brand dark #0C0E14)
        bg_mipmap = Image.new("RGBA", fg_size, (12, 14, 20, 255))
        bg_mipmap_path = os.path.join(res_dir, "ic_launcher_background.webp")
        bg_mipmap.save(bg_mipmap_path, format="WEBP", lossless=True)

        # ic_launcher_foreground.webp (adaptive icon safe zone 62%)
        fg_img = create_centered_asset(emblem_crop, fg_size, scale_ratio=0.62)
        fg_path = os.path.join(res_dir, "ic_launcher_foreground.webp")
        fg_img.save(fg_path, format="WEBP", lossless=True)

        # ic_launcher_monochrome.webp (pure white mask in safe zone)
        mono_mipmap = create_monochrome_asset(emblem_crop, fg_size, scale_ratio=0.62)
        mono_mipmap_path = os.path.join(res_dir, "ic_launcher_monochrome.webp")
        mono_mipmap.save(mono_mipmap_path, format="WEBP", lossless=True)

        # ic_launcher.webp (standard icon with rounded-corner luxury dark background)
        base_icon = Image.new("RGBA", icon_size, (12, 14, 20, 255))
        # Draw rounded corners
        corner_r = max(int(icon_size[0] * 0.22), 4)
        mask = Image.new("L", icon_size, 0)
        from PIL import ImageDraw
        draw = ImageDraw.Draw(mask)
        draw.rounded_rectangle([(0, 0), (icon_size[0] - 1, icon_size[1] - 1)], radius=corner_r, fill=255)
        emblem_on_icon = create_centered_asset(emblem_crop, icon_size, scale_ratio=0.75)
        base_icon.alpha_composite(emblem_on_icon)
        final_icon = Image.new("RGBA", icon_size, (0, 0, 0, 0))
        final_icon.paste(base_icon, (0, 0), mask)
        icon_path = os.path.join(res_dir, "ic_launcher.webp")
        final_icon.save(icon_path, format="WEBP", lossless=True)

        # ic_launcher_round.webp (circular icon)
        round_mask = Image.new("L", icon_size, 0)
        round_draw = ImageDraw.Draw(round_mask)
        round_draw.ellipse([(0, 0), (icon_size[0] - 1, icon_size[1] - 1)], fill=255)
        round_base = Image.new("RGBA", icon_size, (12, 14, 20, 255))
        round_emblem = create_centered_asset(emblem_crop, icon_size, scale_ratio=0.70)
        round_base.alpha_composite(round_emblem)
        final_round = Image.new("RGBA", icon_size, (0, 0, 0, 0))
        final_round.paste(round_base, (0, 0), round_mask)
        round_path = os.path.join(res_dir, "ic_launcher_round.webp")
        final_round.save(round_path, format="WEBP", lossless=True)

        print(f"Generated Android mipmap-{density}: all 5 webp assets (bg, fg, mono, launcher, round)")

    # 4. Android splash drawables
    # Densities and sizes:
    # mdpi: 288x288
    # hdpi: 432x432
    # xhdpi: 576x576
    # xxhdpi: 864x864
    # xxxhdpi: 1152x1152
    splash_sizes = {
        "mdpi": (288, 288),
        "hdpi": (432, 432),
        "xhdpi": (576, 576),
        "xxhdpi": (864, 864),
        "xxxhdpi": (1152, 1152),
    }

    for density, size in splash_sizes.items():
        draw_dir = os.path.join(OUTPUT_BASE, "android", "res", f"drawable-{density}")
        os.makedirs(draw_dir, exist_ok=True)

        splash_img = create_centered_asset(emblem_crop, size, scale_ratio=0.70)
        splash_path = os.path.join(draw_dir, "splashscreen_logo.png")
        splash_img.save(splash_path, format="PNG")
        print(f"Generated Android drawable-{density}: splashscreen_logo.png ({size[0]}x{size[1]})")

    print("\nAll brand assets successfully generated!")


if __name__ == "__main__":
    main()

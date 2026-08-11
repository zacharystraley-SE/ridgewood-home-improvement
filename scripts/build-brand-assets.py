#!/usr/bin/env python3
"""Build transparent Ridgewood logo assets from the supplied square artwork."""

from pathlib import Path
from PIL import Image, ImageFilter


SOURCE = Path(
    "/Users/zstraley/Library/Messages/Attachments/d8/08/"
    "B3A4A979-DEF3-49BA-A682-F522CCCDE897/RHI Square Gold Logo.png"
)
ROOT = Path(__file__).resolve().parents[1]
OUTPUTS = ROOT / "outputs" / "ridgewood-brand"
SITE_BRAND = ROOT / "brand"
STUDIO_BRAND = ROOT / "kitchen-studio-app" / "public" / "brand"


def isolate_gold(source: Image.Image) -> Image.Image:
    rgb = source.convert("RGB")
    alpha = Image.new("L", rgb.size)
    source_pixels = rgb.load()
    alpha_pixels = alpha.load()
    for y in range(rgb.height):
        for x in range(rgb.width):
            red, green, blue = source_pixels[x, y]
            score = max(red, green) - blue
            alpha_pixels[x, y] = max(0, min(255, round((score - 12) * 255 / 58)))
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.35))
    rgba = rgb.convert("RGBA")
    rgba.putalpha(alpha)
    return rgba


def resize_to_width(image: Image.Image, width: int) -> Image.Image:
    height = round(image.height * width / image.width)
    return image.resize((width, height), Image.Resampling.LANCZOS)


def save_asset(image: Image.Image, name: str, width: int) -> None:
    rendered = resize_to_width(image, width)
    for destination in (SITE_BRAND, STUDIO_BRAND):
        destination.mkdir(parents=True, exist_ok=True)
        rendered.save(destination / f"{name}.png", optimize=True)
        rendered.save(destination / f"{name}.webp", "WEBP", lossless=True, quality=100)


def main() -> None:
    transparent = isolate_gold(Image.open(SOURCE))
    full = transparent.crop((56, 260, 1200, 962))
    lockup = transparent.crop((56, 260, 1200, 792))
    roof = transparent.crop((205, 260, 945, 530))

    OUTPUTS.mkdir(parents=True, exist_ok=True)
    resize_to_width(full, 6144).save(
        OUTPUTS / "rhi-full-logo-transparent-6144.png", optimize=True
    )
    resize_to_width(lockup, 6000).save(
        OUTPUTS / "rhi-header-lockup-transparent-6000.png", optimize=True
    )
    resize_to_width(roof, 3000).save(
        OUTPUTS / "rhi-roof-mark-transparent-3000.png", optimize=True
    )

    preview = Image.new("RGB", (1600, 900), "#f7f8f6")
    preview.paste(Image.new("RGB", (800, 900), "#021f48"), (800, 0))
    preview_mark = resize_to_width(lockup, 650)
    preview.paste(preview_mark, (75, 300), preview_mark)
    preview.paste(preview_mark, (875, 300), preview_mark)
    preview.save(OUTPUTS / "rhi-logo-preview-light-dark.png", optimize=True)

    save_asset(lockup, "rhi-header-lockup", 1200)
    save_asset(roof, "rhi-roof-mark", 600)


if __name__ == "__main__":
    main()

import base64
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUTPUTS = ROOT / "outputs"
ROOF_MARK = OUTPUTS / "ridgewood-brand" / "rhi-roof-mark-transparent-3000.png"
NAVY = "#021f48"


def render(size: int) -> Image.Image:
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    inset = round(size * 0.025)
    radius = round(size * 0.19)
    draw.rounded_rectangle(
        (inset, inset, size - inset, size - inset),
        radius=radius,
        fill=NAVY,
    )

    roof = Image.open(ROOF_MARK).convert("RGBA")
    roof = roof.crop(roof.getbbox())
    target_width = round(size * 0.86)
    target_height = round(roof.height * target_width / roof.width)
    roof = roof.resize((target_width, target_height), Image.Resampling.LANCZOS)
    image.alpha_composite(roof, ((size - target_width) // 2, (size - target_height) // 2))
    return image


def main() -> None:
    OUTPUTS.mkdir(exist_ok=True)
    master = render(6144)
    master.save(OUTPUTS / "ridgewood-roof-favicon-transparent-6144.png")
    master.resize((1024, 1024), Image.Resampling.LANCZOS).save(
        OUTPUTS / "ridgewood-roof-favicon-1024.png",
    )

    favicon_512 = master.resize((512, 512), Image.Resampling.LANCZOS)
    favicon_512.save(ROOT / "favicon-512.png")
    master.resize((180, 180), Image.Resampling.LANCZOS).save(ROOT / "apple-touch-icon.png")
    master.resize((32, 32), Image.Resampling.LANCZOS).save(ROOT / "favicon-32x32.png")
    master.save(ROOT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])

    encoded = BytesIO()
    favicon_512.save(encoded, format="PNG")
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" '
        'aria-labelledby="title"><title id="title">Ridgewood Home Improvement</title>'
        f'<image width="512" height="512" href="data:image/png;base64,{base64.b64encode(encoded.getvalue()).decode()}"/>'
        '</svg>'
    )
    (ROOT / "favicon.svg").write_text(svg, encoding="utf-8")
    (OUTPUTS / "ridgewood-roof-favicon.svg").write_text(svg, encoding="utf-8")

    preview = Image.new("RGB", (1600, 800), "#f4f3ed")
    draw = ImageDraw.Draw(preview)
    draw.rectangle((800, 0, 1600, 800), fill="#02070d")
    display = master.resize((560, 560), Image.Resampling.LANCZOS)
    preview.paste(display, (120, 120), display)
    preview.paste(display, (920, 120), display)
    preview.save(OUTPUTS / "ridgewood-roof-favicon-preview-light-dark.png")


if __name__ == "__main__":
    main()

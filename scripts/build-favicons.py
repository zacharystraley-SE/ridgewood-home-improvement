from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUTPUTS = ROOT / "outputs"
FONT = Path("/System/Library/Fonts/Supplemental/Georgia Bold Italic.ttf")
NAVY = "#0d1b2a"
IVORY = "#f4f3ed"


def render(size: int) -> Image.Image:
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    inset = round(size * 0.03125)
    draw.ellipse((inset, inset, size - inset, size - inset), fill=NAVY)

    font = ImageFont.truetype(str(FONT), round(size * 0.45))
    box = draw.textbbox((0, 0), "RH", font=font)
    width = box[2] - box[0]
    height = box[3] - box[1]
    x = (size - width) / 2 - box[0] - size * 0.012
    y = (size - height) / 2 - box[1] - size * 0.006
    draw.text((x, y), "RH", font=font, fill=IVORY)
    return image


def main() -> None:
    OUTPUTS.mkdir(exist_ok=True)
    master = render(6144)
    master.save(OUTPUTS / "ridgewood-rh-monogram-transparent-6144.png")
    master.resize((1024, 1024), Image.Resampling.LANCZOS).save(
        OUTPUTS / "ridgewood-rh-monogram-1024.png",
    )
    (OUTPUTS / "ridgewood-rh-monogram.svg").write_text(
        (ROOT / "favicon.svg").read_text(encoding="utf-8"),
        encoding="utf-8",
    )

    master.resize((512, 512), Image.Resampling.LANCZOS).save(ROOT / "favicon-512.png")
    master.resize((180, 180), Image.Resampling.LANCZOS).save(ROOT / "apple-touch-icon.png")
    master.resize((32, 32), Image.Resampling.LANCZOS).save(ROOT / "favicon-32x32.png")
    master.save(ROOT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])

    preview = Image.new("RGB", (1600, 800), "#f4f3ed")
    draw = ImageDraw.Draw(preview)
    draw.rectangle((800, 0, 1600, 800), fill="#02070d")
    display = master.resize((560, 560), Image.Resampling.LANCZOS)
    preview.paste(display, (120, 120), display)
    preview.paste(display, (920, 120), display)
    preview.save(OUTPUTS / "ridgewood-rh-monogram-preview-light-dark.png")


if __name__ == "__main__":
    main()

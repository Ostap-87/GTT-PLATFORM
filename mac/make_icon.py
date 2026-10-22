# -*- coding: utf-8 -*-
"""Иконка приложения для Mac (.icns) в стиле GTT: python3 mac/make_icon.py app|platform

app      — «Global Tech Tour»: синий градиент #1a73e8, белое «GTT» (Sofia Sans 800);
platform — «GTT Platform»: тёмно-синий фон, синее «GTT» и подпись PLATFORM (Inter Bold).
Форма — как у иконок macOS: скруглённый квадрат 824 из 1024 с мягкой тенью.
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
SOFIA = os.path.join(HERE, "..", "mobile", "splash", "sofia-800-GT.ttf")   # в шрифте только «G» и «T»
INTER = "/usr/share/fonts/opentype/inter/Inter-Bold.otf"
S = 2048


def _grad(top, bottom):
    g = Image.new("RGB", (1, 256))
    for y in range(256):
        t = y / 255
        g.putpixel((0, y), tuple(int(a + (b - a) * t) for a, b in zip(top, bottom)))
    return g.resize((S, S))


def _base(top, bottom):
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    box = (200, 200, S - 200, S - 200)
    shadow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((box[0], box[1] + 24, box[2], box[3] + 24), radius=370,
                                             fill=(0, 0, 0, 90))
    img.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(28)))
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle(box, radius=370, fill=255)
    img.paste(_grad(top, bottom), (0, 0), mask)
    return img


def _center(d, text, font, cy, fill):
    l, t, r, b = d.textbbox((0, 0), text, font=font)
    d.text(((S - (r - l)) / 2 - l, cy - (b - t) / 2 - t), text, font=font, fill=fill)


def icon(kind: str) -> Image.Image:
    if kind == "platform":
        img = _base((36, 52, 92), (14, 22, 44))
        d = ImageDraw.Draw(img)
        _center(d, "GTT", ImageFont.truetype(SOFIA, 760), 930, (77, 154, 255))
        _center(d, "PLATFORM", ImageFont.truetype(INTER, 150), 1430, (255, 255, 255))
    else:
        img = _base((66, 145, 245), (20, 92, 200))
        d = ImageDraw.Draw(img)
        _center(d, "GTT", ImageFont.truetype(SOFIA, 860), S / 2 + 10, (255, 255, 255))
    return img.resize((1024, 1024), Image.LANCZOS)


if __name__ == "__main__":
    kind = sys.argv[1] if len(sys.argv) > 1 else "app"
    img = icon(kind)
    img.save(os.path.join(HERE, "icon-1024.png"))
    img.save(os.path.join(HERE, "AppIcon.icns"),
             sizes=[(16, 16), (32, 32), (64, 64), (128, 128), (256, 256), (512, 512), (1024, 1024)])
    print("Иконка:", os.path.join(HERE, "AppIcon.icns"))

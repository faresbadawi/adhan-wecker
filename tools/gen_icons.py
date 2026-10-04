#!/usr/bin/env python3
"""Erzeugt die App-Icons der Web-App (PWA) nach data/www/icons/.

Motiv: achtzackiger Stern (Rub el Hizb) mit Halbmond in Roségold auf dem schwarzen
Gittermuster des Standard-Hintergrunds (tools/backgrounds/noir.png). Benötigt pillow und numpy.
"""
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "data" / "www" / "icons"
GOLD = (233, 162, 124)  # Roségold wie die Akzentfarbe der Uhr
PATTERN = Path(__file__).resolve().parent / "backgrounds" / "noir.png"
BG_IN = (14, 36, 28)
BG_OUT = (5, 10, 8)


def background(size):
    """Quadratischer Ausschnitt des Hintergrundmusters, zur Mitte hin etwas abgedunkelt (Emblem bleibt klar)."""
    im = Image.open(PATTERN).convert("RGB")
    side = int(min(im.size) * 0.62)  # Ausschnitt: Muster bleibt im Symbol erkennbar
    left, top = (im.width - side) // 2, (im.height - side) // 2
    im = im.crop((left, top, left + side, top + side)).resize((size, size), Image.LANCZOS)
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float32)
    d = np.sqrt((xx - size / 2) ** 2 + (yy - size / 2) ** 2) / (size * 0.5)
    shade = 0.45 + 0.55 * np.clip(d, 0, 1)  # Mitte dunkler
    img = np.asarray(im, np.float32) * 1.25 * shade[..., None]
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), "RGB")


def star_points(cx, cy, r, rot):
    return [(cx + r * math.cos(rot + k * math.pi / 2), cy + r * math.sin(rot + k * math.pi / 2)) for k in range(4)]


def emblem(size, scale):
    """Stern + Halbmond, scale = Anteil der Icon-Breite."""
    ss = 4
    S = size * ss
    layer = Image.new("L", (S, S), 0)
    d = ImageDraw.Draw(layer)
    cx = cy = S / 2
    r = S * scale / 2
    w = max(2, int(S * 0.028))
    # zwei verdrehte Quadrate = achtzackiger Stern
    for rot in (math.pi / 4, 0):
        d.polygon(star_points(cx, cy, r, rot), outline=255, width=w)
    d.ellipse([cx - r * 0.56, cy - r * 0.56, cx + r * 0.56, cy + r * 0.56], outline=255, width=max(2, w // 2))
    # Halbmond: Kreis minus versetzter Kreis
    mr = r * 0.40
    moon = Image.new("L", (S, S), 0)
    md = ImageDraw.Draw(moon)
    md.ellipse([cx - mr, cy - mr, cx + mr, cy + mr], fill=255)
    off = mr * 0.42
    md.ellipse([cx - mr + off, cy - mr - off * 0.3, cx + mr + off, cy + mr - off * 0.3], fill=0)
    layer = Image.fromarray(np.maximum(np.asarray(layer), np.asarray(moon)))
    return layer.resize((size, size), Image.LANCZOS)


def icon(size, scale, rounded):
    img = background(size)
    # dunkle, weich auslaufende Fläche hinter dem Emblem, damit es sich vom Muster abhebt
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float32)
    d = np.sqrt((xx - size / 2) ** 2 + (yy - size / 2) ** 2) / (size * scale / 2)
    veil = Image.fromarray((np.clip(1.25 - d, 0, 1) * 235).astype(np.uint8), "L")
    img.paste(Image.new("RGB", (size, size), (8, 8, 9)), (0, 0), veil)
    gold = Image.new("RGB", (size, size), GOLD)
    img.paste(gold, (0, 0), emblem(size, scale))
    if rounded:  # abgerundete Ecken für Favicon / Desktop
        mask = Image.new("L", (size * 4, size * 4), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, size * 4 - 1, size * 4 - 1], radius=size * 4 * 0.22, fill=255)
        rgba = img.convert("RGBA")
        rgba.putalpha(mask.resize((size, size), Image.LANCZOS))
        return rgba
    return img


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    icon(192, 0.70, True).save(OUT / "icon-192.png")
    icon(512, 0.70, True).save(OUT / "icon-512.png")
    icon(512, 0.52, False).save(OUT / "maskable-512.png")  # Motiv in der sicheren Zone (Android)
    icon(180, 0.62, False).save(OUT / "apple-touch-icon.png")  # iOS rundet selbst ab
    icon(64, 0.74, True).save(OUT / "favicon.png")
    print("Icons geschrieben nach", OUT)


if __name__ == "__main__":
    main()

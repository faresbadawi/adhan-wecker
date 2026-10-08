#!/usr/bin/env python3
"""Erzeugt die Grafik-Assets für den Adhan-Wecker als C-Dateien für LVGL 8.

  - Hintergrund mit dezentem islamischem Sternmuster (480x320, RGB565)
  - Schriften (Marcellus, Josefin Sans) als LVGL-Fonts, 4 bpp
  - Wettersymbole (Material Design Icons) als Bilder
  - feste Texte in Arabisch (Amiri), Deutsch und Englisch (Marcellus, Josefin Sans) als Alphamasken

Aufruf:  python tools/gen_assets.py [--preview ordner]
Benötigt: pip install pillow numpy   (Pillow mit libraqm für arabischen Textsatz)
"""
import argparse
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, features

ROOT = Path(__file__).resolve().parent.parent
FONTS = ROOT / "tools" / "fonts"
OUT = ROOT / "src" / "ui" / "assets"

W, H = 480, 320

# Farbpalette (muss zu src/ui/theme.h passen)
BLACK = (4, 6, 7)
GREEN_DEEP = (9, 30, 24)
GOLD = (201, 164, 92)
# Arabische Schriftzüge und Icons werden weiß erzeugt und auf dem Gerät in der jeweiligen
# Farbgruppe eingefärbt (Weboberfläche: Hauptschrift, Akzent, Nebenschrift).
IMG_WHITE = (255, 255, 255)


# ---------------------------------------------------------------- Sternmuster

def hankin_segments(poly, delta_deg):
    """Hankin-Methode: von jeder Kantenmitte zwei Strahlen unter dem Kontaktwinkel
    ins Polygon; benachbarte Strahlen treffen sich und bilden die Sternspitzen."""
    n = len(poly)
    mids = [((poly[i][0] + poly[(i + 1) % n][0]) / 2, (poly[i][1] + poly[(i + 1) % n][1]) / 2) for i in range(n)]
    d = math.radians(delta_deg)
    segs = []
    for k in range(n):
        v = poly[(k + 1) % n]  # gemeinsame Ecke von Kante k und k+1
        m1, m2 = mids[k], mids[(k + 1) % n]
        a1 = math.atan2(v[1] - m1[1], v[0] - m1[0]) + d  # nach innen (links bei CCW)
        a2 = math.atan2(v[1] - m2[1], v[0] - m2[0]) - d
        r1 = (math.cos(a1), math.sin(a1))
        r2 = (math.cos(a2), math.sin(a2))
        # m1 + t*r1 = m2 + s*r2
        det = r1[0] * (-r2[1]) - r1[1] * (-r2[0])
        if abs(det) < 1e-9:
            continue
        bx, by = m2[0] - m1[0], m2[1] - m1[1]
        t = (bx * (-r2[1]) - by * (-r2[0])) / det
        p = (m1[0] + t * r1[0], m1[1] + t * r1[1])
        segs.append((m1, p))
        segs.append((p, m2))
    return segs


def regular_polygon(cx, cy, n, circumradius, rot):
    return [(cx + circumradius * math.cos(rot + 2 * math.pi * i / n),
             cy + circumradius * math.sin(rot + 2 * math.pi * i / n)) for i in range(n)]


def pattern_segments(width, height, side, delta):
    """4.8.8-Kachelung (Achtecke + Quadrate) -> achtzackige Sterne."""
    a = side * (1 + math.sqrt(2))  # Abstand der Achteckmittelpunkte
    r8 = side / (2 * math.sin(math.pi / 8))
    r4 = side / math.sqrt(2)
    segs = []
    nx, ny = int(width / a) + 3, int(height / a) + 3
    ox, oy = width / 2, height / 2  # Muster auf die Bildmitte zentrieren
    for j in range(-ny, ny + 1):
        for i in range(-nx, nx + 1):
            cx, cy = ox + i * a, oy + j * a
            segs += hankin_segments(regular_polygon(cx, cy, 8, r8, math.pi / 8), delta)
            segs += hankin_segments(regular_polygon(cx + a / 2, cy + a / 2, 4, r4, 0), delta)
    return segs


def make_background():
    """Fast schwarz, oben mittig ein Hauch Dunkelgrün, Muster nur angedeutet."""
    ss = 4  # Supersampling für weiche Linien
    sw, sh = W * ss, H * ss

    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    dist = np.sqrt(((xx - W * 0.5) / W) ** 2 + ((yy - H * 0.42) / (H * 1.1)) ** 2)
    t = np.clip(dist / 0.62, 0, 1) ** 1.4
    base = np.zeros((H, W, 3), np.float32)
    for c in range(3):
        base[..., c] = GREEN_DEEP[c] * (1 - t) + BLACK[c] * t

    # Bandwerk: breite Linie, innen ausgespart
    segs = pattern_segments(sw, sh, side=22 * ss, delta=45)
    outer = Image.new("L", (sw, sh), 0)
    inner = Image.new("L", (sw, sh), 0)
    d_out, d_in = ImageDraw.Draw(outer), ImageDraw.Draw(inner)
    for p, q in segs:
        d_out.line([p, q], fill=255, width=int(3.0 * ss))
        d_in.line([p, q], fill=255, width=int(1.1 * ss))
    band = (np.asarray(outer.resize((W, H), Image.LANCZOS), np.float32)
            - 0.6 * np.asarray(inner.resize((W, H), Image.LANCZOS), np.float32)) / 255.0
    band = np.clip(band, 0, 1)

    # sehr dezent; in der Mitte (Countdown) fast unsichtbar, an den Rändern etwas stärker
    edge = np.clip(np.maximum(np.abs(xx / W - 0.5) * 2, np.abs(yy / H - 0.5) * 2), 0, 1)
    alpha = band * (0.035 + 0.11 * edge ** 2.2)

    img = base * (1 - alpha[..., None]) + np.array(GOLD, np.float32) * alpha[..., None]
    return img  # float, wird beim Schreiben gedithert


# Hintergründe: jedes Bild in tools/backgrounds/ (JPG/PNG, am besten 3:2) wird zu einem
# auswählbaren Hintergrund; dazu kommt das erzeugte Sternmuster ("muster").
# Ergebnis: data/bg/<name>.bin (RGB565 für das Display) und data/www/bg/<name>.jpg (Vorschau).
BACKGROUND_DIR = ROOT / "tools" / "backgrounds"
DATA = ROOT / "data"
BACKGROUND_BRIGHTNESS = 0.55  # abdunkeln, damit die Schrift lesbar bleibt
BACKGROUND_BRIGHTNESS_FOR = {"noir": 0.95}  # Bilder, die schon dunkel sind


def load_background(path):
    """Bild auf 480x320 zuschneiden/skalieren und abdunkeln (Mitte etwas dunkler als der Rand)."""
    im = Image.open(path).convert("RGB")
    scale = max(W / im.width, H / im.height)
    im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    left, top = (im.width - W) // 2, (im.height - H) // 2
    img = np.asarray(im.crop((left, top, left + W, top + H)), np.float32)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    dist = np.sqrt(((xx - W / 2) / W) ** 2 + ((yy - H / 2) / H) ** 2)
    shade = BACKGROUND_BRIGHTNESS_FOR.get(Path(path).stem, BACKGROUND_BRIGHTNESS) * (0.85 + 0.3 * np.clip(dist / 0.7, 0, 1))
    return img * shade[..., None]


# ---------------------------------------------------------------- C-Ausgabe

BAYER4 = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], np.float32) / 16.0


def dither565(img):
    """Float-RGB -> uint8 mit geordnetem Dithering, damit dunkle Verläufe in RGB565 nicht streifen."""
    h, w, _ = img.shape
    thr = np.tile(BAYER4, (h // 4 + 1, w // 4 + 1))[:h, :w, None]
    steps = np.array([8, 4, 8], np.float32)  # Quantisierung von R5 G6 B5
    q = np.floor(img / steps + thr) * steps
    return np.clip(q, 0, 255).astype(np.uint8)


def rgb565_be(rgb):
    """RGB888 -> RGB565, Byte-Reihenfolge big-endian (LV_COLOR_16_SWAP = 1)."""
    a = np.asarray(rgb, np.uint16)
    v = ((a[..., 0] >> 3) << 11) | ((a[..., 1] >> 2) << 5) | (a[..., 2] >> 3)
    return np.stack([(v >> 8) & 0xFF, v & 0xFF], axis=-1).astype(np.uint8)


def c_bytes(data, per_line=24):
    data = bytes(data)
    lines = []
    for i in range(0, len(data), per_line):
        lines.append("    " + ", ".join(f"0x{b:02x}" for b in data[i:i + per_line]) + ",")
    return "\n".join(lines)


def write_image_c(name, data, w, h, cf):
    src = f"""// Automatisch erzeugt von tools/gen_assets.py – nicht von Hand bearbeiten.
#include "lvgl.h"

static const LV_ATTRIBUTE_LARGE_CONST uint8_t {name}_map[] = {{
{c_bytes(data)}
}};

const lv_img_dsc_t {name} = {{
    .header.cf = {cf},
    .header.always_zero = 0,
    .header.reserved = 0,
    .header.w = {w},
    .header.h = {h},
    .data_size = {len(data)},
    .data = {name}_map,
}};
"""
    (OUT / f"{name}.c").write_text(src)


def write_bg(name, img):
    (DATA / "bg").mkdir(parents=True, exist_ok=True)
    (DATA / "www" / "bg").mkdir(parents=True, exist_ok=True)
    rgb = dither565(img)
    (DATA / "bg" / f"{name}.bin").write_bytes(rgb565_be(rgb).tobytes())
    Image.fromarray(rgb).resize((160, 107), Image.LANCZOS).save(DATA / "www" / "bg" / f"{name}.jpg", quality=80)


def arabic_font(size, font_file):
    return ImageFont.truetype(str(FONTS / font_file), size, layout_engine=ImageFont.Layout.RAQM)


def arabic_bbox(text, font):
    """Umriss relativ zur Grundlinie (Anker rechts/Grundlinie)."""
    return font.getbbox(text, anchor="rs", direction="rtl", language="ar")


def write_icon_image(name, codepoint, size, color):
    """Icon aus der MDI-Schrift als 8-Bit-Alphamaske (zuverlässiger als 4-Byte-UTF-8-Glyphen)."""
    font = ImageFont.truetype(str(FONTS / MDI), size)
    ch = chr(codepoint)
    x0, y0, x1, y1 = font.getbbox(ch, anchor="ls")
    w, h = x1 - x0, y1 - y0
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).text((-x0, -y0), ch, font=font, fill=255, anchor="ls")
    write_image_c(name, np.asarray(mask, np.uint8).tobytes(), w, h, "LV_IMG_CF_ALPHA_8BIT")
    return mask


def write_ornament(name, size):
    """Achtstern-Ornament (zwei verdrehte Quadrate, Kreis, kleine Sterne an den Spitzen) als Alphamaske;
    umrahmt den Mond und dreht sich auf der Mondseite langsam."""
    ss = 4
    S = size * ss
    m = Image.new("L", (S, S), 0)
    d = ImageDraw.Draw(m)
    c = S / 2
    r = S * 0.46
    w = max(2, int(1.6 * ss))
    for rot in (0, 45):
        pts = [(c + r * math.cos(math.radians(rot + 45 + 90 * k)), c + r * math.sin(math.radians(rot + 45 + 90 * k))) for k in range(4)]
        d.polygon(pts, outline=255, width=w)
    rc = r * 0.80
    d.ellipse([c - rc, c - rc, c + rc, c + rc], outline=255, width=w)
    for k in range(8):  # kleine Punkte an den Sternspitzen
        a = math.radians(45 * k)
        px, py = c + r * 1.02 * math.cos(a), c + r * 1.02 * math.sin(a)
        rd = 2.2 * ss
        d.ellipse([px - rd, py - rd, px + rd, py + rd], fill=255)
    m = m.resize((size, size), Image.LANCZOS)
    write_image_c(name, np.asarray(m, np.uint8).tobytes(), size, size, "LV_IMG_CF_ALPHA_8BIT")
    return m


# Ersatzzeichen: U+2236 sieht aus wie ":" und gilt in LVGLs Bidi-Logik nicht als neutral.
# So bleibt eine Uhrzeit wie "20:41" in arabischem Text zusammen.
# U+200E (LRM) bekommt eine leere Glyphe ohne Breite: unsichtbar, für LVGL aber "links nach rechts".
ALIASES = {"\u2236": ":", "\u200e": ""}


def write_font(name, font_file, size, chars, weight=None, tabular=False, fallback=None):
    """LVGL-Font (Format fmt_txt, 4 bpp, ohne Kerning).
    tabular=True: alle Ziffern gleich breit, damit die Uhr nicht springt.
    fallback: Name eines weiteren Fonts für fehlende Zeichen (z. B. arabische Buchstaben).
    Zeichen aus ALIASES werden mit dem Bild ihres Vorbilds gezeichnet."""
    font = ImageFont.truetype(str(FONTS / font_file), size)
    if weight is not None:
        font.set_variation_by_axes([weight])
    ascent, descent = font.getmetrics()
    # Zeilenhöhe so wählen, dass auch Umlaute und Unterlängen hineinpassen
    for c in chars:
        if ALIASES.get(c) == "":
            continue
        x0, y0, x1, y1 = font.getbbox(ALIASES.get(c, c), anchor="ls")
        ascent, descent = max(ascent, -y0), max(descent, y1)
    digit_adv = max(font.getlength(d) for d in "0123456789")

    codes = sorted({ord(c) for c in chars})
    bitmap = bytearray()
    dscs = ["    {.bitmap_index = 0, .adv_w = 0, .box_w = 0, .box_h = 0, .ofs_x = 0, .ofs_y = 0} /* id 0 reserviert */"]
    for cp in codes:
        ch = ALIASES.get(chr(cp), chr(cp))
        x0, y0, x1, y1 = font.getbbox(ch, anchor="ls") if ch else (0, 0, 0, 0)
        adv = font.getlength(ch) if ch else 0
        if tabular and ch.isdigit():
            shift = round((digit_adv - adv) / 2)
            x0, x1, adv = x0 + shift, x1 + shift, digit_adv
        adv = round(adv * 16)
        bw, bh = max(0, x1 - x0), max(0, y1 - y0)
        idx = len(bitmap)
        if bw and bh:
            m = Image.new("L", (bw, bh), 0)
            gx0 = font.getbbox(ch, anchor="ls")[0]
            ImageDraw.Draw(m).text((-gx0, -y0), ch, font=font, fill=255, anchor="ls")
            px = (np.asarray(m, np.uint16) * 15 + 127) // 255
            flat = px.flatten().tolist()
            if len(flat) % 2:
                flat.append(0)
            bitmap += bytes((flat[i] << 4) | flat[i + 1] for i in range(0, len(flat), 2))
        else:
            bw = bh = x0 = 0
            y1 = 0
        dscs.append(f"    {{.bitmap_index = {idx}, .adv_w = {adv}, .box_w = {bw}, .box_h = {bh}, "
                    f".ofs_x = {x0}, .ofs_y = {-y1}}} /* U+{cp:04X} */")

    # Zeichentabellen: zusammenhängende Bereiche als FORMAT0_TINY
    ranges, start = [], 0
    for i in range(1, len(codes) + 1):
        if i == len(codes) or codes[i] != codes[i - 1] + 1:
            ranges.append((codes[start], i - start, start + 1))
            start = i
    cmaps = ",\n".join(
        f"    {{.range_start = {rs}, .range_length = {rl}, .glyph_id_start = {gs}, .unicode_list = NULL, "
        f".glyph_id_ofs_list = NULL, .list_length = 0, .type = LV_FONT_FMT_TXT_CMAP_FORMAT0_TINY}}"
        for rs, rl, gs in ranges)

    src = f"""// Automatisch erzeugt von tools/gen_assets.py – nicht von Hand bearbeiten.
// {font_file}, {size} px, 4 bpp
#include "lvgl.h"
{f"extern const lv_font_t {fallback};" if fallback else ""}

static LV_ATTRIBUTE_LARGE_CONST const uint8_t glyph_bitmap[] = {{
{c_bytes(bitmap)}
}};

static const lv_font_fmt_txt_glyph_dsc_t glyph_dsc[] = {{
{",\n".join(dscs)}
}};

static const lv_font_fmt_txt_cmap_t cmaps[] = {{
{cmaps}
}};

static lv_font_fmt_txt_glyph_cache_t cache;

static const lv_font_fmt_txt_dsc_t font_dsc = {{
    .glyph_bitmap = glyph_bitmap,
    .glyph_dsc = glyph_dsc,
    .cmaps = cmaps,
    .kern_dsc = NULL,
    .kern_scale = 0,
    .cmap_num = {len(ranges)},
    .bpp = 4,
    .kern_classes = 0,
    .bitmap_format = 0,
    .cache = &cache,
}};

const lv_font_t {name} = {{
    .get_glyph_dsc = lv_font_get_glyph_dsc_fmt_txt,
    .get_glyph_bitmap = lv_font_get_bitmap_fmt_txt,
    .line_height = {ascent + descent},
    .base_line = {descent},
    .subpx = LV_FONT_SUBPX_NONE,
    .underline_position = -2,
    .underline_thickness = 1,
    .dsc = &font_dsc,
    .fallback = {f"&{fallback}" if fallback else "NULL"},
    .user_data = NULL,
}};
"""
    (OUT / f"{name}.c").write_text(src)


# ---------------------------------------------------------------- Icons

MDI = "materialdesignicons-webfont.ttf"

# Name -> Codepunkt, aus @mdi/font 7.4.47 (css/materialdesignicons.min.css)
ICONS = {
    "WIFI": 0xF05A9, "WIFI_OFF": 0xF05AA, "ALARM_SNOOZE": 0xF068E,
    "SUNNY": 0xF0599, "NIGHT": 0xF0594, "PARTLY_CLOUDY": 0xF0595, "NIGHT_PARTLY_CLOUDY": 0xF0F31,
    "CLOUDY": 0xF0590, "FOG": 0xF0591, "RAINY": 0xF0597, "POURING": 0xF0596, "SNOWY": 0xF0598,
    "LIGHTNING": 0xF0593, "WINDY": 0xF059D,
    "THERMOMETER": 0xF050F, "HUMIDITY": 0xF058E, "ARROW_UP": 0xF19B2, "ARROW_DOWN": 0xF19B3,
    "MOSQUE": 0xF1827, "VOLUME_OFF": 0xF0581, "SKIP_NEXT": 0xF04AD, "ALARM": 0xF0020,
}
WEATHER = ["SUNNY", "NIGHT", "PARTLY_CLOUDY", "NIGHT_PARTLY_CLOUDY", "CLOUDY", "FOG", "RAINY", "POURING",
           "SNOWY", "LIGHTNING", "WINDY"]


def icon_chars(names):
    return "".join(chr(ICONS[n]) for n in names)


def write_icon_header():
    lines = ["// Automatisch erzeugt von tools/gen_assets.py – nicht von Hand bearbeiten.",
             "// Material Design Icons (Apache-2.0) als UTF-8-Zeichenketten.", "#pragma once", ""]
    for name, cp in ICONS.items():
        esc = "".join(f"\\x{b:02X}" for b in chr(cp).encode("utf-8"))
        lines.append(f'#define ICON_{name} "{esc}"')
    (OUT / "icons.h").write_text("\n".join(lines) + "\n")


# ---------------------------------------------------------------- Hauptteil

ASCII = "".join(chr(c) for c in range(32, 127))
ARABIC_CHARS = "".join(chr(c) for c in (
    [0x060C, 0x061B, 0x061F] + list(range(0x0621, 0x063B)) + list(range(0x0640, 0x0653))
    + list(range(0x0660, 0x066A)) + [0x067E, 0x0686, 0x0698, 0x06A9, 0x06AF, 0x06CC]
    + [c for c in range(0xFE70, 0xFEFD) if c not in (0xFE73, 0xFE75)]))
GERMAN = "äöüÄÖÜß·•–°\u2236\u200e"
DIGITS = "0123456789:-"
TEMP = "0123456789-°C"

LANGS = ["ar", "de", "en"]  # Reihenfolge = ui::Lang

# Feste Texte: Schlüssel -> (Größe der arabischen Fassung, fett, {Sprache: Text}).
# Alle Texte werden weiß als Alphamaske erzeugt und auf dem Gerät in ihrer Farbgruppe gezeichnet.
TEXTS = {
    "moon_title": (30, True, {"ar": "القمر والتقويم الهجري", "de": "Mond & Hijri", "en": "Moon & Hijri"}),
    "white_days": (19, False, {"ar": "الأيام البيض", "de": "Weiße Tage", "en": "White days"}),
    "title": (30, True, {"ar": "مواقيت الصلاة", "de": "Gebetszeiten", "en": "Prayer Times"}),
    "next": (22, False, {"ar": "الصلاة القادمة", "de": "Nächstes Gebet", "en": "Next prayer"}),
    "loading": (24, False, {"ar": "جارٍ تحميل المواقيت …", "de": "Gebetszeiten werden geladen …",
                            "en": "Loading prayer times …"}),
    "azan_now": (28, False, {"ar": "حان الآن وقت صلاة", "de": "Es ist Zeit für das Gebet", "en": "It is time for"}),
    "azan_stop": (22, False, {"ar": "المس الشاشة لإيقاف الأذان", "de": "Bildschirm berühren, um den Azan zu beenden",
                              "en": "Touch the screen to stop the azan"}),
    "weather": (30, True, {"ar": "الطقس", "de": "Wetter", "en": "Weather"}),
    "feels": (22, False, {"ar": "الإحساس", "de": "Gefühlt", "en": "Feels like"}),
    "humidity": (22, False, {"ar": "الرطوبة", "de": "Feuchte", "en": "Humidity"}),
    "wind": (22, False, {"ar": "الرياح", "de": "Wind", "en": "Wind"}),
    "no_weather": (24, False, {"ar": "جارٍ تحميل الطقس …", "de": "Wetter wird geladen …", "en": "Loading weather …"}),
    "alarm": (30, True, {"ar": "المنبه", "de": "Wecker", "en": "Alarm"}),
    "alarm_stop": (22, False, {"ar": "المس الشاشة لإيقاف المنبه", "de": "Bildschirm berühren, um den Wecker zu beenden",
                               "en": "Touch the screen to stop the alarm"}),
    "night_title": (30, True, {"ar": "الثلث الأخير من الليل", "de": "Letztes Drittel der Nacht", "en": "Last third of the night"}),
    "night_in": (22, False, {"ar": "يبدأ بعد", "de": "beginnt in", "en": "starts in"}),
    "night_now": (22, False, {"ar": "الآن، حتى الفجر", "de": "Jetzt, bis Fajr", "en": "Now, until Fajr"}),
    "verse_src": (18, False, {"ar": "سورة الإسراء ١٧:٧٩", "de": "Sure Al-Isra 17:79", "en": "Surah Al-Isra 17:79"}),
    "settings": (30, True, {"ar": "الإعدادات", "de": "Einstellungen", "en": "Settings"}),
    "network": (22, False, {"ar": "الشبكة", "de": "Netzwerk", "en": "Network"}),
    "web": (22, False, {"ar": "صفحة الإعدادات", "de": "Einstellungsseite", "en": "Settings page"}),
    "scan": (20, False, {"ar": "امسح الرمز بهاتفك", "de": "Mit dem Handy scannen",
                         "en": "Scan with your phone"}),
    "offline": (24, False, {"ar": "غير متصل بالشبكة", "de": "Nicht verbunden", "en": "Not connected"}),
    "sig_strong": (22, False, {"ar": "إشارة قوية", "de": "Signal stark", "en": "Strong signal"}),
    "sig_medium": (22, False, {"ar": "إشارة متوسطة", "de": "Signal mittel", "en": "Medium signal"}),
    "sig_weak": (22, False, {"ar": "إشارة ضعيفة", "de": "Signal schwach", "en": "Weak signal"}),
    "wifi_title": (28, True, {"ar": "إعداد الواي فاي", "de": "WLAN einrichten", "en": "Wi-Fi setup"}),
    "wifi_1": (21, False, {"ar": "١. اتصل بالهاتف بشبكة Adhan-Wecker", "de": "1. Handy mit dem WLAN Adhan-Wecker verbinden",
                           "en": "1. Connect your phone to the Wi-Fi Adhan-Wecker"}),
    "wifi_2": (21, False, {"ar": "٢. افتح في المتصفح", "de": "2. Im Browser öffnen", "en": "2. Open in the browser"}),
    "wifi_3": (21, False, {"ar": "٣. اختر شبكتك وأدخل كلمة المرور", "de": "3. Eigenes WLAN wählen, Passwort eingeben",
                           "en": "3. Choose your Wi-Fi, enter the password"}),
}

HIJRI = {
    "ar": ["محرم", "صفر", "ربيع الأول", "ربيع الآخر", "جمادى الأولى", "جمادى الآخرة",
           "رجب", "شعبان", "رمضان", "شوال", "ذو القعدة", "ذو الحجة"],
    "de": ["Muharram", "Safar", "Rabi' al-Awwal", "Rabi' al-Thani", "Dschumada al-Ula", "Dschumada al-Achira",
           "Radschab", "Scha'ban", "Ramadan", "Schawwal", "Dhu l-Qa'da", "Dhu l-Hiddscha"],
    "en": ["Muharram", "Safar", "Rabi' al-Awwal", "Rabi' al-Thani", "Jumada al-Ula", "Jumada al-Akhira",
           "Rajab", "Sha'ban", "Ramadan", "Shawwal", "Dhu al-Qa'da", "Dhu al-Hijja"],
}
# Kurzformen für die Kalender-Kopfzeile (Platz für zwei Monate nebeneinander)
HIJRI_SHORT = {
    "ar": HIJRI["ar"],
    "de": ["Muharram", "Safar", "Rabi' I", "Rabi' II", "Dschumada I", "Dschumada II",
           "Radschab", "Scha'ban", "Ramadan", "Schawwal", "Dhu l-Qa'da", "Dhu l-Hiddscha"],
    "en": ["Muharram", "Safar", "Rabi' I", "Rabi' II", "Jumada I", "Jumada II",
           "Rajab", "Sha'ban", "Ramadan", "Shawwal", "Dhu al-Qa'da", "Dhu al-Hijja"],
}
PRAYER_NAMES = {  # model::Prayer, danach Jumu'a (ersetzt Dhuhr am Freitag)
    "ar": ["الفجر", "الشروق", "الظهر", "العصر", "المغرب", "العشاء", "الجمعة"],
    "de": ["Fajr", "Sonnenaufgang", "Dhuhr", "Asr", "Maghrib", "Isha", "Jumu'a"],
    "en": ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha", "Jumu'a"],
}
# Besondere Tage, Reihenfolge = model::Holiday (Zuordnung zum Hijri-Datum in model.h)
HOLIDAYS = {
    "ar": ["رأس السنة الهجرية", "يوم عاشوراء", "الإسراء والمعراج", "أول رمضان", "ليلة القدر", "عيد الفطر", "يوم عرفة", "عيد الأضحى"],
    "de": ["Islamisches Neujahr", "Aschura", "Isra und Mi'radsch", "Ramadan-Beginn", "Lailat al-Qadr", "Eid al-Fitr", "Tag von Arafah", "Eid al-Adha"],
    "en": ["Islamic New Year", "Ashura", "Isra and Mi'raj", "Start of Ramadan", "Laylat al-Qadr", "Eid al-Fitr", "Day of Arafah", "Eid al-Adha"],
}

# Wortlisten mit gemeinsamer Grundlinie: Schlüssel -> (Größe, fett, {Sprache: Liste})
LISTS = {
    "nightcol": (20, False, {  # neben dem Rahmen der Nachtseite
        "ar": ["الفجر", "الشروق"],
        "de": ["Fajr", "Sonnenaufgang"],
        "en": ["Fajr", "Sunrise"]}),
    "day": (22, False, {  # heute, morgen, übermorgen: gemeinsame Grundlinie trotz Zeichen über/unter den Buchstaben
        "ar": ["اليوم", "غدًا", "بعد غد"],
        "de": ["Heute", "Morgen", "Übermorgen"],
        "en": ["Today", "Tomorrow", "Day after"]}),
    "prayer": (22, False, PRAYER_NAMES),
    "prayer_lg": (34, False, PRAYER_NAMES),
    "holiday": (20, False, HOLIDAYS),
    "moonphase": (21, False, {  # Mondalter in Achteln, 0 = Neumond
        "ar": ["محاق", "هلال متزايد", "تربيع أول", "أحدب متزايد", "بدر", "أحدب متناقص", "تربيع ثانٍ", "هلال متناقص"],
        "de": ["Neumond", "Zunehmende Sichel", "Erstes Viertel", "Zunehmender Mond", "Vollmond", "Abnehmender Mond", "Letztes Viertel", "Abnehmende Sichel"],
        "en": ["New moon", "Waxing crescent", "First quarter", "Waxing gibbous", "Full moon", "Waning gibbous", "Last quarter", "Waning crescent"]}),
    "wday": (32, False, {  # tm_wday 0..6
        "ar": ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
        "de": ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"],
        "en": ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]}),
    "wshort": (21, False, {
        "ar": ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"],
        "de": ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"],
        "en": ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]}),
    "gmonth": (28, True, {
        "ar": ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
               "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"],
        "de": ["Januar", "Februar", "März", "April", "Mai", "Juni",
               "Juli", "August", "September", "Oktober", "November", "Dezember"],
        "en": ["January", "February", "March", "April", "May", "June",
               "July", "August", "September", "October", "November", "December"]}),
    "hmonth": (26, False, HIJRI),
    "hmonth_sm": ((18, 17), False, HIJRI_SHORT),  # (Größe Arabisch, Größe Latein vor Skalierung)
    "sky": (26, False, {  # model::Sky
        "ar": ["صافٍ", "غائم جزئيًا", "غائم", "ضباب", "رذاذ", "مطر", "ثلج", "عاصفة رعدية"],
        "de": ["Klar", "Teils bewölkt", "Bewölkt", "Nebel", "Nieselregen", "Regen", "Schnee", "Gewitter"],
        "en": ["Clear", "Partly cloudy", "Cloudy", "Fog", "Drizzle", "Rain", "Snow", "Thunderstorm"]}),
}

# Mehrzeilige Texte: Schlüssel -> (Größe, Zeilenabstand, {Sprache: Text mit \n})
PARAGRAPHS = {
    "verse": ((27, 19), (40, 21), {  # Größe, Zeilenabstand (Arabisch, Latein)
        "ar": "وَمِنَ اللَّيْلِ فَتَهَجَّدْ بِهِ نَافِلَةً لَّكَ\nعَسَىٰ أَن يَبْعَثَكَ رَبُّكَ مَقَامًا مَّحْمُودًا",
        "de": "„Und in einem Teil der Nacht verrichte das Tahajjud-Gebet\nals Zusatz für dich. Vielleicht erweckt dich dein Herr\nzu einem gepriesenen Rang.“",
        "en": "“And from part of the night, pray with it as an extra for you;\nperhaps your Lord will raise you to a praised station.”"}),
}

LATIN_SCALE = 0.8  # lateinische Schrift wirkt bei gleicher Pixelgröße größer als Amiri


def text_font(lang, size, bold):
    if isinstance(size, tuple):
        size = size[0] if lang == "ar" else size[1]
    if lang == "ar":
        return arabic_font(size, "Amiri-Bold.ttf" if bold else "Amiri-Regular.ttf"), size
    size = round(size * LATIN_SCALE)
    if bold:
        return ImageFont.truetype(str(FONTS / "Marcellus-Regular.ttf"), size, layout_engine=ImageFont.Layout.RAQM), size
    f = ImageFont.truetype(str(FONTS / "JosefinSans-Variable.ttf"), size, layout_engine=ImageFont.Layout.RAQM)
    f.set_variation_by_axes([500])
    return f, size


def text_bbox(lang, text, font):
    if lang == "ar":
        return arabic_bbox(text, font)
    return font.getbbox(text, anchor="ls", direction="ltr", language=lang)


def write_paragraph(name, lang, text, font, pitch):
    """Mehrzeiliger, zentrierter Text (Zeilen durch \n getrennt) mit festem Zeilenabstand."""
    lines = text.split("\n")
    boxes = [text_bbox(lang, t, font) for t in lines]
    widths = [b[2] - b[0] for b in boxes]
    top = min(b[1] for b in boxes)
    bottom = max(b[3] for b in boxes)
    w, h = max(widths) + 2, (len(lines) - 1) * pitch + bottom - top + 2
    mask = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(mask)
    for i, (t, b, lw) in enumerate(zip(lines, boxes, widths)):
        y = 1 - top + i * pitch
        x = w / 2 - (b[0] + b[2]) / 2  # Zeile mittig
        if lang == "ar":
            d.text((x, y), t, font=font, fill=255, anchor="rs", direction="rtl", language="ar")
        else:
            d.text((x, y), t, font=font, fill=255, anchor="ls", direction="ltr", language=lang)
    write_image_c(name, np.asarray(mask, np.uint8).tobytes(), w, h, "LV_IMG_CF_ALPHA_8BIT")
    return mask


def write_text(name, lang, text, font, band=None):
    """Schriftzug als 8-Bit-Alphamaske; LVGL zeichnet ihn in der Farbe der Farbgruppe (img_recolor).
    `band` = (oben, unten) relativ zur Grundlinie, damit mehrere Wörter auf derselben Grundlinie stehen."""
    x0, y0, x1, y1 = text_bbox(lang, text, font)
    if band:
        y0, y1 = band
    w, h = x1 - x0 + 2, y1 - y0 + 2
    mask = Image.new("L", (w, h), 0)
    if lang == "ar":
        ImageDraw.Draw(mask).text((1 - x0, 1 - y0), text, font=font, fill=255, anchor="rs", direction="rtl", language="ar")
    else:
        ImageDraw.Draw(mask).text((1 - x0, 1 - y0), text, font=font, fill=255, anchor="ls", direction="ltr", language=lang)
    write_image_c(name, np.asarray(mask, np.uint8).tobytes(), w, h, "LV_IMG_CF_ALPHA_8BIT")
    return mask


def write_texts(masks):
    """Alle Texte in allen Sprachen + Tabelle ui_texts[Sprache][TextId] (src/ui/assets/texts.h)."""
    ids = list(TEXTS) + list(PARAGRAPHS) + [f"{k}_{i}" for k, (_, _, d) in LISTS.items() for i in range(len(d["ar"]))]
    for lang in LANGS:
        for key, (size, bold, tr) in TEXTS.items():
            font, _ = text_font(lang, size, bold)
            masks[f"{lang}_{key}"] = write_text(f"img_{lang}_{key}", lang, tr[lang], font)
        for key, (size, pitch, tr) in PARAGRAPHS.items():
            font, _ = text_font(lang, size, False)
            masks[f"{lang}_{key}"] = write_paragraph(f"img_{lang}_{key}", lang, tr[lang], font, pitch[0] if lang == "ar" else pitch[1])
        for key, (size, bold, tr) in LISTS.items():
            font, _ = text_font(lang, size, bold)
            boxes = [text_bbox(lang, t, font) for t in tr[lang]]
            band = (min(b[1] for b in boxes), max(b[3] for b in boxes))
            for i, t in enumerate(tr[lang]):
                masks[f"{lang}_{key}_{i}"] = write_text(f"img_{lang}_{key}_{i}", lang, t, font, band)
    names = [f"img_{lang}_{i}" for lang in LANGS for i in ids]
    rows = ",\n".join("    {" + ", ".join(f"&img_{lang}_{i}" for i in ids) + "}" for lang in LANGS)
    (OUT / "texts.c").write_text(
        '// Automatisch erzeugt von tools/gen_assets.py\n#include "lvgl.h"\n#include "texts.h"\n'
        + "\n".join(f"extern const lv_img_dsc_t {n};" for n in names)
        + f"\nconst lv_img_dsc_t *const ui_texts[{len(LANGS)}][TXT_COUNT] = {{\n{rows}\n}};\n")
    enum = ",\n".join(f"    TXT_{i.upper()}" for i in ids)
    (OUT / "texts.h").write_text(
        "// Automatisch erzeugt von tools/gen_assets.py – nicht von Hand bearbeiten.\n#pragma once\n#include \"lvgl.h\"\n\n"
        f"#ifdef __cplusplus\nextern \"C\" {{\n#endif\n\nenum TextId\n{{\n{enum},\n    TXT_COUNT\n}};\n\n"
        f"// [Sprache: {', '.join(LANGS)}][TextId]\nextern const lv_img_dsc_t *const ui_texts[{len(LANGS)}][TXT_COUNT];\n\n"
        "#ifdef __cplusplus\n}\n#endif\n")


# Wettersymbole: Reihenfolge = model::Sky, dazu Nachtvarianten
SKY_ICONS = ["SUNNY", "PARTLY_CLOUDY", "CLOUDY", "FOG", "RAINY", "POURING", "SNOWY", "LIGHTNING",
             "NIGHT", "NIGHT_PARTLY_CLOUDY"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--preview", type=Path, help="PNG-Vorschauen in diesen Ordner schreiben")
    args = ap.parse_args()

    if not features.check("raqm"):
        raise SystemExit("Pillow ohne libraqm – arabischer Text würde falsch gesetzt.")
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("*.c"):
        old.unlink()

    bg = make_background()
    write_bg("muster", bg)
    for f in sorted(BACKGROUND_DIR.glob("*")):
        if f.suffix.lower() in (".jpg", ".jpeg", ".png"):
            write_bg(f.stem, load_background(f))

    # Text
    write_font("font_clock_64", "JosefinSans-Variable.ttf", 64, DIGITS, weight=400, tabular=True)
    write_font("font_clock_130", "JosefinSans-Variable.ttf", 130, DIGITS, weight=300, tabular=True)
    write_font("font_count_52", "JosefinSans-Variable.ttf", 52, DIGITS, weight=400, tabular=True)
    write_font("font_temp_64", "JosefinSans-Variable.ttf", 64, TEMP, weight=400, tabular=True)
    write_font("font_temp_30", "JosefinSans-Variable.ttf", 30, TEMP, weight=400, tabular=True)
    write_font("font_marcellus_26", "Marcellus-Regular.ttf", 26, ASCII + GERMAN)
    write_font("font_josefin_25", "JosefinSans-Variable.ttf", 25, ASCII + GERMAN, weight=500, tabular=True)
    # Arabische Ersatzschriften: frei eingegebener Text (z. B. Stadtname) erscheint damit auf Arabisch
    write_font("font_ar_19", "Amiri-Regular.ttf", 19, ARABIC_CHARS)
    write_font("font_ar_22", "Amiri-Regular.ttf", 22, ARABIC_CHARS)
    write_font("font_josefin_20", "JosefinSans-Variable.ttf", 20, ASCII + GERMAN, weight=500, fallback="font_ar_22")
    write_font("font_josefin_17", "JosefinSans-Variable.ttf", 17, ASCII + GERMAN, weight=500, fallback="font_ar_19")


    masks = {}
    write_texts(masks)
    # WLAN: ein klares Symbol (verbunden) und durchgestrichen (nicht verbunden); Stärke zeigt der Text
    for i, icon in enumerate(["WIFI_OFF", "WIFI"]):
        write_icon_image(f"img_wifi_{i}", ICONS[icon], 28, IMG_WHITE)
    (OUT / "img_wifi_list.c").write_text(
        '// Automatisch erzeugt von tools/gen_assets.py\n#include "lvgl.h"\n'
        + "\n".join(f"extern const lv_img_dsc_t img_wifi_{i};" for i in range(2))
        + "\nconst lv_img_dsc_t *const img_wifi_list[2] = {"
        + ", ".join(f"&img_wifi_{i}" for i in range(2)) + "};\n")
    write_icon_image("img_alarm", ICONS["ALARM"], 24, IMG_WHITE)
    write_icon_image("img_alarm_lg", ICONS["ALARM"], 56, IMG_WHITE)
    masks["ornament"] = write_ornament("img_moon_orn", 196)
    write_icon_image("img_snooze", ICONS["ALARM_SNOOZE"], 22, IMG_WHITE)
    # Wetterdetails: gefühlte Temperatur, Luftfeuchte, Wind
    for i, icon in enumerate(["THERMOMETER", "HUMIDITY", "WINDY"]):
        write_icon_image(f"img_detail_{i}", ICONS[icon], 28, IMG_WHITE)
    for size, suffix in ((34, "sm"), (112, "lg")):
        for i, icon in enumerate(SKY_ICONS):
            write_icon_image(f"img_wx_{suffix}_{i}", ICONS[icon], size, GOLD)
        (OUT / f"img_wx_{suffix}_list.c").write_text(
            '// Automatisch erzeugt von tools/gen_assets.py\n#include "lvgl.h"\n'
            + "\n".join(f"extern const lv_img_dsc_t img_wx_{suffix}_{i};" for i in range(len(SKY_ICONS)))
            + f"\nconst lv_img_dsc_t *const img_wx_{suffix}_list[{len(SKY_ICONS)}] = {{"
            + ", ".join(f"&img_wx_{suffix}_{i}" for i in range(len(SKY_ICONS))) + "};\n")

    if args.preview:
        args.preview.mkdir(parents=True, exist_ok=True)
        Image.fromarray(dither565(bg)).save(args.preview / "bg.png")
        for name, m in masks.items():
            m.save(args.preview / f"{name}.png")
    print(f"Assets geschrieben nach {OUT}")


if __name__ == "__main__":
    main()

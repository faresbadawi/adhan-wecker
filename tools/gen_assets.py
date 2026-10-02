#!/usr/bin/env python3
"""Erzeugt die Grafik-Assets für den Adhan-Wecker als C-Dateien für LVGL 8.

  - Hintergrund mit dezentem islamischem Sternmuster (480x320, RGB565)
  - Schriften (Marcellus, Josefin Sans) als LVGL-Fonts, 4 bpp
  - Wettersymbole (Material Design Icons) als Bilder
  - arabische Gebetsnamen (Amiri) als Bilder mit Alphakanal

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


def load_background(path):
    """Bild auf 480x320 zuschneiden/skalieren und abdunkeln (Mitte etwas dunkler als der Rand)."""
    im = Image.open(path).convert("RGB")
    scale = max(W / im.width, H / im.height)
    im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    left, top = (im.width - W) // 2, (im.height - H) // 2
    img = np.asarray(im.crop((left, top, left + W, top + H)), np.float32)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    dist = np.sqrt(((xx - W / 2) / W) ** 2 + ((yy - H / 2) / H) ** 2)
    shade = BACKGROUND_BRIGHTNESS * (0.85 + 0.3 * np.clip(dist / 0.7, 0, 1))
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


def write_arabic(name, text, size, color, font_file, band=None):
    """Arabischer Schriftzug als Bild mit Alphakanal (Farbe fest eingebrannt).
    `band` = (oben, unten) relativ zur Grundlinie, damit mehrere Wörter auf
    derselben Grundlinie stehen."""
    font = arabic_font(size, font_file)
    x0, y0, x1, y1 = arabic_bbox(text, font)
    if band:
        y0, y1 = band
    w, h = x1 - x0 + 2, y1 - y0 + 2
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).text((1 - x0, 1 - y0), text, font=font, fill=255, anchor="rs",
                              direction="rtl", language="ar")
    a = np.asarray(mask, np.uint8)
    col = rgb565_be(np.broadcast_to(np.array(IMG_WHITE, np.uint8), (h, w, 3)))
    data = np.concatenate([col, a[..., None]], axis=-1).tobytes()
    write_image_c(name, data, w, h, "LV_IMG_CF_TRUE_COLOR_ALPHA")
    return mask


def write_icon_image(name, codepoint, size, color):
    """Icon aus der MDI-Schrift als Bild mit Alphakanal (zuverlässiger als 4-Byte-UTF-8-Glyphen)."""
    font = ImageFont.truetype(str(FONTS / MDI), size)
    ch = chr(codepoint)
    x0, y0, x1, y1 = font.getbbox(ch, anchor="ls")
    w, h = x1 - x0, y1 - y0
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).text((-x0, -y0), ch, font=font, fill=255, anchor="ls")
    a = np.asarray(mask, np.uint8)
    col = rgb565_be(np.broadcast_to(np.array(IMG_WHITE, np.uint8), (h, w, 3)))
    write_image_c(name, np.concatenate([col, a[..., None]], axis=-1).tobytes(), w, h, "LV_IMG_CF_TRUE_COLOR_ALPHA")
    return mask


def write_font(name, font_file, size, chars, weight=None, tabular=False, fallback=None):
    """LVGL-Font (Format fmt_txt, 4 bpp, ohne Kerning).
    tabular=True: alle Ziffern gleich breit, damit die Uhr nicht springt.
    fallback: Name eines weiteren Fonts für fehlende Zeichen (z. B. arabische Buchstaben)."""
    font = ImageFont.truetype(str(FONTS / font_file), size)
    if weight is not None:
        font.set_variation_by_axes([weight])
    ascent, descent = font.getmetrics()
    # Zeilenhöhe so wählen, dass auch Umlaute und Unterlängen hineinpassen
    for c in chars:
        x0, y0, x1, y1 = font.getbbox(c, anchor="ls")
        ascent, descent = max(ascent, -y0), max(descent, y1)
    digit_adv = max(font.getlength(d) for d in "0123456789")

    codes = sorted({ord(c) for c in chars})
    bitmap = bytearray()
    dscs = ["    {.bitmap_index = 0, .adv_w = 0, .box_w = 0, .box_h = 0, .ofs_x = 0, .ofs_y = 0} /* id 0 reserviert */"]
    for cp in codes:
        ch = chr(cp)
        x0, y0, x1, y1 = font.getbbox(ch, anchor="ls")
        adv = font.getlength(ch)
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
    "WIFI_1": 0xF091F, "WIFI_2": 0xF0922, "WIFI_3": 0xF0925, "WIFI_4": 0xF0928, "WIFI_OFF": 0xF16C5,
    "SUNNY": 0xF0599, "NIGHT": 0xF0594, "PARTLY_CLOUDY": 0xF0595, "NIGHT_PARTLY_CLOUDY": 0xF0F31,
    "CLOUDY": 0xF0590, "FOG": 0xF0591, "RAINY": 0xF0597, "POURING": 0xF0596, "SNOWY": 0xF0598,
    "LIGHTNING": 0xF0593, "WINDY": 0xF059D,
    "THERMOMETER": 0xF050F, "HUMIDITY": 0xF058E, "ARROW_UP": 0xF19B2, "ARROW_DOWN": 0xF19B3,
    "MOSQUE": 0xF1827, "VOLUME_OFF": 0xF0581, "SKIP_NEXT": 0xF04AD, "ALARM": 0xF0020, "MIC": 0xF036C,
}
WIFI = ["WIFI_1", "WIFI_2", "WIFI_3", "WIFI_4", "WIFI_OFF"]
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
GERMAN = "äöüÄÖÜß·•–°"
DIGITS = "0123456789:-"
TEMP = "0123456789-°C"

AR_SIZES = {"": 20, "_lg": 34}  # Zeile (Wetter/Home) und Azan-Bildschirm
AR_FONT = "Amiri-Regular.ttf"
AR_ROWS = {
    "img_ar_fajr": "الفجر",
    "img_ar_shuruq": "الشروق",
    "img_ar_dhuhr": "الظهر",
    "img_ar_asr": "العصر",
    "img_ar_maghrib": "المغرب",
    "img_ar_isha": "العشاء",
}


WHITE = (244, 241, 234)
MUTED = (140, 151, 143)

# Feste arabische Texte: Name -> (Text, Größe, Farbe, Schrift)
AR_TEXTS = {
    "img_ar_txt_title": ("مواقيت الصلاة", 30, GOLD, "Amiri-Bold.ttf"),
    "img_ar_txt_next": ("الصلاة القادمة", 20, MUTED, "Amiri-Regular.ttf"),
    "img_ar_txt_remaining": ("الوقت المتبقي", 18, MUTED, "Amiri-Regular.ttf"),
    "img_ar_txt_loading": ("جارٍ تحميل المواقيت …", 22, MUTED, "Amiri-Regular.ttf"),
    "img_ar_txt_azan_now": ("حان الآن وقت صلاة", 26, WHITE, "Amiri-Regular.ttf"),
    "img_ar_txt_azan_stop": ("المس الشاشة لإيقاف الأذان", 20, MUTED, "Amiri-Regular.ttf"),
    # Wetter
    "img_ar_txt_weather": ("الطقس", 30, GOLD, "Amiri-Bold.ttf"),
    "img_ar_txt_feels": ("الإحساس", 20, MUTED, "Amiri-Regular.ttf"),
    "img_ar_txt_humidity": ("الرطوبة", 20, MUTED, "Amiri-Regular.ttf"),
    "img_ar_txt_wind": ("الرياح", 20, MUTED, "Amiri-Regular.ttf"),
    "img_ar_txt_max": ("العظمى", 18, MUTED, "Amiri-Regular.ttf"),
    "img_ar_txt_min": ("الصغرى", 18, MUTED, "Amiri-Regular.ttf"),
    "img_ar_txt_today": ("اليوم", 20, MUTED, "Amiri-Regular.ttf"),
    "img_ar_txt_tomorrow": ("غدًا", 20, MUTED, "Amiri-Regular.ttf"),
    "img_ar_txt_after": ("بعد غد", 20, MUTED, "Amiri-Regular.ttf"),
    "img_ar_txt_no_weather": ("جارٍ تحميل الطقس …", 22, MUTED, "Amiri-Regular.ttf"),
    "img_ar_txt_listening": ("أنا أستمع …", 28, GOLD, "Amiri-Bold.ttf"),
    "img_ar_txt_thinking": ("لحظة من فضلك …", 26, GOLD, "Amiri-Bold.ttf"),
    "img_ar_txt_assistant": ("المساعد", 28, GOLD, "Amiri-Bold.ttf"),
    "img_ar_txt_alarm": ("المنبه", 30, GOLD, "Amiri-Bold.ttf"),
    "img_ar_txt_alarm_stop": ("المس الشاشة لإيقاف المنبه", 20, MUTED, "Amiri-Regular.ttf"),
    "img_ar_txt_settings": ("الإعدادات", 30, GOLD, "Amiri-Bold.ttf"),
    "img_ar_txt_network": ("الشبكة", 20, MUTED, "Amiri-Regular.ttf"),
    "img_ar_txt_web": ("صفحة الإعدادات", 20, MUTED, "Amiri-Regular.ttf"),
    "img_ar_txt_setup": ("إعداد الجهاز", 28, GOLD, "Amiri-Bold.ttf"),
    "img_ar_txt_scan": ("امسح الرمز بهاتفك لفتح الإعدادات", 18, MUTED, "Amiri-Regular.ttf"),
    "img_ar_txt_close": ("المس الشاشة للإغلاق", 17, MUTED, "Amiri-Regular.ttf"),
    "img_ar_txt_offline": ("غير متصل بالشبكة", 22, WHITE, "Amiri-Regular.ttf"),
    "img_ar_txt_wifi_title": ("إعداد الواي فاي", 28, GOLD, "Amiri-Bold.ttf"),
    "img_ar_txt_wifi_1": ("١. اتصل بالهاتف بشبكة Adhan-Wecker", 21, WHITE, "Amiri-Regular.ttf"),
    "img_ar_txt_wifi_2": ("٢. افتح في المتصفح", 21, WHITE, "Amiri-Regular.ttf"),
    "img_ar_txt_wifi_3": ("٣. اختر شبكتك وأدخل كلمة المرور", 21, WHITE, "Amiri-Regular.ttf"),
}


AR_WEEKDAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]  # tm_wday 0..6
AR_HIJRI_MONTHS = ["محرم", "صفر", "ربيع الأول", "ربيع الآخر", "جمادى الأولى", "جمادى الآخرة",
                   "رجب", "شعبان", "رمضان", "شوال", "ذو القعدة", "ذو الحجة"]
AR_WEEKDAYS_SHORT = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"]  # tm_wday 0..6
AR_GREG_MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
                  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"]
AR_SKY = ["صافٍ", "غائم جزئيًا", "غائم", "ضباب", "رذاذ", "مطر", "ثلج", "عاصفة رعدية"]  # model::Sky

# Wettersymbole: Reihenfolge = model::Sky, dazu Nachtvarianten
SKY_ICONS = ["SUNNY", "PARTLY_CLOUDY", "CLOUDY", "FOG", "RAINY", "POURING", "SNOWY", "LIGHTNING",
             "NIGHT", "NIGHT_PARTLY_CLOUDY"]


def write_list(prefix, texts, size, color, font_file):
    """Mehrere Wörter mit gemeinsamer Grundlinie + Tabelle in <prefix>_list.c"""
    f = arabic_font(size, font_file)
    boxes = [arabic_bbox(t, f) for t in texts]
    band = (min(b[1] for b in boxes), max(b[3] for b in boxes))
    names = [f"{prefix}_{i}" for i in range(len(texts))]
    for n, t in zip(names, texts):
        write_arabic(n, t, size, color, font_file, band)
    decl = "\n".join(f"extern const lv_img_dsc_t {n};" for n in names)
    arr = ", ".join(f"&{n}" for n in names)
    (OUT / f"{prefix}_list.c").write_text(
        f'// Automatisch erzeugt von tools/gen_assets.py\n#include "lvgl.h"\n{decl}\n'
        f"const lv_img_dsc_t *const {prefix}_list[{len(names)}] = {{{arr}}};\n")


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
    write_font("font_clock_64", "JosefinSans-Variable.ttf", 64, DIGITS, weight=300, tabular=True)
    write_font("font_clock_130", "JosefinSans-Variable.ttf", 130, DIGITS, weight=200, tabular=True)
    write_font("font_count_52", "JosefinSans-Variable.ttf", 52, DIGITS, weight=300, tabular=True)
    write_font("font_temp_64", "JosefinSans-Variable.ttf", 64, TEMP, weight=300, tabular=True)
    write_font("font_temp_30", "JosefinSans-Variable.ttf", 30, TEMP, weight=300, tabular=True)
    write_font("font_marcellus_26", "Marcellus-Regular.ttf", 26, ASCII + GERMAN)
    write_font("font_josefin_22", "JosefinSans-Variable.ttf", 22, ASCII + GERMAN, weight=400, tabular=True)
    # Arabische Ersatzschriften: frei eingegebener Text (z. B. Stadtname) erscheint damit auf Arabisch
    write_font("font_ar_17", "Amiri-Regular.ttf", 17, ARABIC_CHARS)
    write_font("font_ar_20", "Amiri-Regular.ttf", 20, ARABIC_CHARS)
    write_font("font_josefin_18", "JosefinSans-Variable.ttf", 18, ASCII + GERMAN, weight=400, fallback="font_ar_20")
    write_font("font_josefin_15", "JosefinSans-Variable.ttf", 15, ASCII + GERMAN, weight=400, fallback="font_ar_17")


    # arabische Gebetsnamen, je Größe mit gemeinsamer Grundlinie
    masks = {}
    for suffix, size in AR_SIZES.items():
        rf = arabic_font(size, AR_FONT)
        boxes = [arabic_bbox(t, rf) for t in AR_ROWS.values()]
        band = (min(b[1] for b in boxes), max(b[3] for b in boxes))
        for name, text in AR_ROWS.items():
            masks[name + suffix] = write_arabic(name + suffix, text, size, GOLD, AR_FONT, band)

    write_list("img_ar_wday", AR_WEEKDAYS, 32, WHITE, "Amiri-Regular.ttf")
    write_list("img_ar_hmonth", AR_HIJRI_MONTHS, 26, GOLD, "Amiri-Regular.ttf")
    write_list("img_ar_sky", AR_SKY, 26, WHITE, "Amiri-Regular.ttf")
    write_list("img_ar_wshort", AR_WEEKDAYS_SHORT, 17, MUTED, "Amiri-Regular.ttf")
    write_list("img_ar_gmonth", AR_GREG_MONTHS, 28, GOLD, "Amiri-Bold.ttf")
    write_list("img_ar_hmonth_sm", AR_HIJRI_MONTHS, 20, MUTED, "Amiri-Regular.ttf")
    for i, icon in enumerate(["WIFI_OFF", "WIFI_1", "WIFI_2", "WIFI_3", "WIFI_4"]):
        write_icon_image(f"img_wifi_{i}", ICONS[icon], 22, IMG_WHITE)
    (OUT / "img_wifi_list.c").write_text(
        '// Automatisch erzeugt von tools/gen_assets.py\n#include "lvgl.h"\n'
        + "\n".join(f"extern const lv_img_dsc_t img_wifi_{i};" for i in range(5))
        + "\nconst lv_img_dsc_t *const img_wifi_list[5] = {"
        + ", ".join(f"&img_wifi_{i}" for i in range(5)) + "};\n")
    write_icon_image("img_alarm", ICONS["ALARM"], 20, IMG_WHITE)
    write_icon_image("img_mic", ICONS["MIC"], 24, IMG_WHITE)
    write_icon_image("img_mic_lg", ICONS["MIC"], 56, IMG_WHITE)
    write_icon_image("img_alarm_lg", ICONS["ALARM"], 64, IMG_WHITE)
    for size, suffix in ((34, "sm"), (112, "lg")):
        for i, icon in enumerate(SKY_ICONS):
            write_icon_image(f"img_wx_{suffix}_{i}", ICONS[icon], size, GOLD)
        (OUT / f"img_wx_{suffix}_list.c").write_text(
            '// Automatisch erzeugt von tools/gen_assets.py\n#include "lvgl.h"\n'
            + "\n".join(f"extern const lv_img_dsc_t img_wx_{suffix}_{i};" for i in range(len(SKY_ICONS)))
            + f"\nconst lv_img_dsc_t *const img_wx_{suffix}_list[{len(SKY_ICONS)}] = {{"
            + ", ".join(f"&img_wx_{suffix}_{i}" for i in range(len(SKY_ICONS))) + "};\n")

    for name, (text, size, color, f) in AR_TEXTS.items():
        masks[name] = write_arabic(name, text, size, color, f)

    if args.preview:
        args.preview.mkdir(parents=True, exist_ok=True)
        Image.fromarray(dither565(bg)).save(args.preview / "bg.png")
        for name, m in masks.items():
            m.save(args.preview / f"{name}.png")
    print(f"Assets geschrieben nach {OUT}")


if __name__ == "__main__":
    main()

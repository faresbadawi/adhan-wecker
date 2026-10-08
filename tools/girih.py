"""Islamische Sternmuster nach der Polygons-in-Contact-Methode (Hankin).

Grundflächen (Kachelungen) aus regelmäßigen Vielecken; von jeder Kantenmitte gehen zwei
Strahlen unter dem Kontaktwinkel nach innen, benachbarte Strahlen schneiden sich -> Sterne.
Ausgabe als Bandornament (Doppellinie) in SVG und als PNG-Vorschau.
"""
import math, sys
from PIL import Image, ImageDraw

def regular(cx, cy, n, side, rot_deg):
    R = side / (2 * math.sin(math.pi / n))
    return [(cx + R * math.cos(math.radians(rot_deg) + 2 * math.pi * k / n),
             cy + R * math.sin(math.radians(rot_deg) + 2 * math.pi * k / n)) for k in range(n)]

def hankin(poly, theta_deg):
    """Strahlen von den Kantenmitten; Schnitt der Strahlen an jeder Ecke ergibt zwei Segmente."""
    n = len(poly); th = math.radians(theta_deg); segs = []
    # Umlaufsinn bestimmen (innen = links bei gegen den Uhrzeigersinn)
    area = sum(poly[i][0] * poly[(i + 1) % n][1] - poly[(i + 1) % n][0] * poly[i][1] for i in range(n))
    s = 1 if area > 0 else -1
    mids = [((poly[i][0] + poly[(i + 1) % n][0]) / 2, (poly[i][1] + poly[(i + 1) % n][1]) / 2) for i in range(n)]
    for k in range(n):
        v = poly[(k + 1) % n]; m1, m2 = mids[k], mids[(k + 1) % n]
        e1 = math.atan2(v[1] - m1[1], v[0] - m1[0]); e2 = math.atan2(v[1] - m2[1], v[0] - m2[0])
        a1 = e1 + s * th; a2 = e2 - s * th
        r1 = (math.cos(a1), math.sin(a1)); r2 = (math.cos(a2), math.sin(a2))
        det = r1[0] * (-r2[1]) - r1[1] * (-r2[0])
        if abs(det) < 1e-9: continue
        bx, by = m2[0] - m1[0], m2[1] - m1[1]
        t = (bx * (-r2[1]) - by * (-r2[0])) / det
        p = (m1[0] + t * r1[0], m1[1] + t * r1[1])
        segs += [(m1, p), (p, m2)]
    return segs

def tiling_488(W, H, a):
    """Achtecke + Quadrate -> klassischer Achtstern mit Kreuz."""
    P = a * (1 + math.sqrt(2)); polys = []
    for i in range(-2, int(W / P) + 3):
        for j in range(-2, int(H / P) + 3):
            polys.append(regular(i * P, j * P, 8, a, 22.5))
            polys.append(regular(i * P + P / 2, j * P + P / 2, 4, a, 0))
    return polys

def tiling_4612(W, H, a):
    """Zwölfecke + Sechsecke + Quadrate -> Zwölfer-Rosetten (Alhambra, Damaskus)."""
    r12 = a / (2 * math.tan(math.pi / 12)); L = 2 * r12 + a; polys = []
    v1 = (L, 0); v2 = (L / 2, L * math.sqrt(3) / 2)
    rows = int(H / v2[1]) + 4; cols = int(W / L) + 4
    for j in range(-2, rows):
        for i in range(-2 - j // 2, cols):
            ox = i * v1[0] + j * v2[0]; oy = j * v2[1]
            if ox < -2 * L or ox > W + 2 * L: continue
            polys.append(regular(ox, oy, 12, a, 15))
            for (cx, cy) in [(ox + L / 2, oy + L / (2 * math.sqrt(3))), (ox + L, oy + L / math.sqrt(3))]:
                polys.append(regular(cx, cy, 6, a, 0))
            for ang in (0, 60, 120):
                cx = ox + (L / 2) * math.cos(math.radians(ang)); cy = oy + (L / 2) * math.sin(math.radians(ang))
                polys.append(regular(cx, cy, 4, a, 45 + ang))
    return polys

def tiling_6(W, H, a):
    """Sechsecke -> Sechsstern-Gitter."""
    h = a * math.sqrt(3); polys = []
    for j in range(-2, int(H / (1.5 * a)) + 3):
        for i in range(-2, int(W / h) + 3):
            polys.append(regular(i * h + (j % 2) * h / 2, j * 1.5 * a, 6, a, 30))
    return polys

def segments(polys, theta):
    out = []
    for p in polys: out += hankin(p, theta)
    return out

def to_svg(segs, W, H, bg, line, band, name):
    d = "".join(f"M{a[0]:.1f} {a[1]:.1f}L{b[0]:.1f} {b[1]:.1f}" for a, b in segs)
    return (f"<svg xmlns='http://www.w3.org/2000/svg' width='{W}' height='{H}' viewBox='0 0 {W} {H}'>"
            f"<rect width='{W}' height='{H}' fill='{bg}'/>"
            f"<path d='{d}' stroke='{line}' stroke-width='{band}' stroke-linecap='round' stroke-linejoin='round' fill='none'/>"
            f"<path d='{d}' stroke='{bg}' stroke-width='{band - 2.4}' stroke-linecap='round' stroke-linejoin='round' fill='none'/></svg>")

def to_png(segs, W, H, bg, line, band, path, ss=3):
    im = Image.new("RGB", (W * ss, H * ss), bg); dr = ImageDraw.Draw(im)
    for w, col in ((band, line), (band - 2.4, bg)):
        for a, b in segs:
            dr.line([(a[0] * ss, a[1] * ss), (b[0] * ss, b[1] * ss)], fill=col, width=max(1, int(w * ss)))
            r = w * ss / 2
            for q in (a, b): dr.ellipse([q[0] * ss - r, q[1] * ss - r, q[0] * ss + r, q[1] * ss + r], fill=col)
    im.resize((W, H), Image.LANCZOS).save(path)

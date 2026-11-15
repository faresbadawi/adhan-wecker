#!/usr/bin/env python3
"""Widmung (Ihda) für eine einzelne Uhr: erzeugt aus einer Textdatei das Vollbild, das nach dem Startbild erscheint.

  python3 tools/ihda.py widmung/text.txt                 -> widmung/text.png (Vorschau) und widmung/text.bin
  python3 tools/ihda.py widmung/text.txt --upload <IP>   -> lädt das Bild zusätzlich auf diese eine Uhr
  python3 tools/ihda.py --delete <IP>                    -> entfernt die Widmung von der Uhr

Textdatei (UTF-8): 1. Zeile = Überschrift, letzte Zeile = Unterschrift, dazwischen der Text.
Eine Zeile, die mit * beginnt, wird hervorgehoben (z. B. die Anrede).
Benötigt: google-chrome, pillow, Schrift Amiri.
"""
import argparse, base64, html, io, pathlib, struct, subprocess, sys, tempfile, urllib.request, uuid
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
W, H = 480, 320


def render(lines, out_png):
    # derselbe Hintergrund wie auf der Uhr (data/bg/noir.bin, RGB565 mit hohem Byte zuerst)
    raw = (ROOT / "data/bg/noir.bin").read_bytes()
    px = []
    for (v,) in struct.iter_unpack(">H", raw):
        px.append(((v >> 11) << 3, ((v >> 5) & 63) << 2, (v & 31) << 3))
    im = Image.new("RGB", (W, H))
    im.putdata(px)
    buf = io.BytesIO()
    im.save(buf, "PNG")
    bg = base64.b64encode(buf.getvalue()).decode()
    title, sign, body = lines[0], lines[-1], lines[1:-1]
    rows = "".join(f'<p class="{"hi" if l.startswith("*") else ""}">{html.escape(l.lstrip("*").strip())}</p>' for l in body)
    page = f"""<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><style>
html,body{{margin:0;width:{W}px;height:{H}px;overflow:hidden;background:#000 url(data:image/png;base64,{bg}) 0 0/{W}px {H}px}}
body{{display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:Amiri,serif;color:#FFF4E6;text-align:center}}
.box{{position:absolute;inset:6px;border:1px solid #E8A04E99;border-radius:10px}}
.box::after{{content:"";position:absolute;inset:4px;border:1px solid #E8A04E44;border-radius:7px}}
h1{{margin:0;font-size:36px;font-weight:700;color:#E8A04E;line-height:1.2}}
.rule{{width:150px;height:1px;background:linear-gradient(90deg,transparent,#E8A04E,transparent);margin:0 0 4px}}
p{{margin:0;font-size:27px;line-height:1.45;max-width:448px}}
p.hi{{font-size:31px;font-weight:700}}
.sign{{margin-top:4px;font-size:24px;color:#E8A04E}}
</style><div class="box"></div><h1>{html.escape(title)}</h1><div class="rule"></div>{rows}<p class="sign">{html.escape(sign)}</p></html>"""
    with tempfile.TemporaryDirectory() as d:
        f = pathlib.Path(d) / "ihda.html"
        f.write_text(page, encoding="utf-8")
        subprocess.run(["google-chrome", "--headless=new", "--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1",
                        f"--window-size={W},{H}", f"--screenshot={out_png}", f.as_uri()], check=True, capture_output=True)
    img = Image.open(out_png).convert("RGB")
    if img.size != (W, H):
        img = img.crop((0, 0, W, H))
        img.save(out_png)
    return img


def to_bin(img):
    # RGB565, hohes Byte zuerst (wie die Hintergründe)
    return b"".join(struct.pack(">H", (r >> 3) << 11 | (g >> 2) << 5 | (b >> 3)) for r, g, b in img.getdata())


def post(url, data=b"", ctype="application/json"):
    req = urllib.request.Request(url, data=data, headers={"Content-Type": ctype})
    return urllib.request.urlopen(req, timeout=30).read()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("text", nargs="?")
    ap.add_argument("--upload", metavar="IP")
    ap.add_argument("--delete", metavar="IP")
    a = ap.parse_args()
    if a.delete:
        post(f"http://{a.delete}/api/dedication/delete", b"{}")
        print("Widmung entfernt")
        return
    if not a.text:
        sys.exit(__doc__)
    src = pathlib.Path(a.text)
    lines = [l.strip() for l in src.read_text(encoding="utf-8").splitlines() if l.strip()]
    png = src.with_suffix(".png")
    data = to_bin(render(lines, str(png)))
    src.with_suffix(".bin").write_bytes(data)
    print("Vorschau:", png)
    if a.upload:
        b = uuid.uuid4().hex
        body = (f'--{b}\r\nContent-Disposition: form-data; name="bin"; filename="ihda.bin"\r\n'
                "Content-Type: application/octet-stream\r\n\r\n").encode() + data + f"\r\n--{b}--\r\n".encode()
        post(f"http://{a.upload}/api/dedication/upload", body, f"multipart/form-data; boundary={b}")
        print("Auf die Uhr geladen:", a.upload)


if __name__ == "__main__":
    main()

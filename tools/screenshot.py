#!/usr/bin/env python3
"""Holt ein Bildschirmfoto vom Adhan-Wecker über USB und speichert es als PNG.

Aufruf:  python tools/screenshot.py [ausgabe.png] [--port /dev/ttyACM0]
Benötigt: pyserial, pillow, numpy. Der Serial-Monitor muss geschlossen sein.
"""
import argparse
import glob
import time

import numpy as np
import serial
from PIL import Image


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("out", nargs="?", default="screenshot.png")
    ap.add_argument("--port", default=(sorted(glob.glob("/dev/ttyACM*")) or [None])[0])
    args = ap.parse_args()

    with serial.Serial(args.port, 115200, timeout=5) as s:
        s.reset_input_buffer()
        s.write(b"S")
        deadline = time.time() + 5
        while True:
            line = s.readline().decode(errors="replace").strip()
            if line.startswith("SNAP "):
                break
            if time.time() > deadline:
                raise SystemExit("Keine Antwort vom Board")
        _, w, h, size = line.split()
        w, h, size = int(w), int(h), int(size)
        data = s.read(size)
        if len(data) != size:
            raise SystemExit(f"Nur {len(data)} von {size} Bytes empfangen")

    # RGB565, Byte-Reihenfolge big-endian (LV_COLOR_16_SWAP = 1)
    v = np.frombuffer(data, ">u2").reshape(h, w).astype(np.uint32)
    rgb = np.stack([((v >> 11) & 0x1F) * 255 // 31, ((v >> 5) & 0x3F) * 255 // 63, (v & 0x1F) * 255 // 31], -1)
    Image.fromarray(rgb.astype(np.uint8), "RGB").save(args.out)
    print(f"{w}x{h} gespeichert in {args.out}")


if __name__ == "__main__":
    main()

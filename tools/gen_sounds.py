#!/usr/bin/env python3
"""Erzeugt die Wecktöne für data/sounds/ (MP3, mono, 44,1 kHz). Benötigt numpy und ffmpeg.

  calm.mp3     ruhig: aufsteigende Glockentöne (Dur-Dreiklang), wird langsam lauter
  bells.mp3    Glocken: weiche Glockenspiel-Melodie
  classic.mp3  klassisch: Weckerpiepen in Viererpaketen
"""
import subprocess
from pathlib import Path

import numpy as np

RATE = 44100
OUT = Path(__file__).resolve().parent.parent / "data" / "sounds"


def bell(freq, dur, decay=3.0, partials=((1, 1.0), (2.0, 0.35), (3.01, 0.15), (4.2, 0.08))):
    """Glockenähnlicher Ton: Grundton + leicht unharmonische Obertöne, weicher Einsatz, Ausklang."""
    t = np.arange(int(RATE * dur)) / RATE
    tone = sum(a * np.sin(2 * np.pi * freq * m * t) * np.exp(-decay * m * t) for m, a in partials)
    attack = np.minimum(1, t / 0.008)
    return tone * attack


def place(track, sound, at):
    i = int(at * RATE)
    track[i:i + len(sound)] += sound[: len(track) - i]


def calm():
    track = np.zeros(RATE * 6)
    notes = [523.25, 659.25, 783.99, 1046.5]  # C5 E5 G5 C6
    for rep in range(2):
        for k, f in enumerate(notes):
            place(track, bell(f, 1.6, decay=2.2) * (0.55 + 0.25 * rep), rep * 2.6 + k * 0.32)
    return track


def bells():
    track = np.zeros(RATE * 6)
    melody = [(783.99, 0.0), (659.25, 0.35), (698.46, 0.7), (523.25, 1.05),
              (523.25, 2.0), (698.46, 2.35), (783.99, 2.7), (659.25, 3.05)]
    for f, at in melody:
        place(track, bell(f, 2.0, decay=1.6, partials=((1, 1.0), (2.76, 0.4), (5.4, 0.12))), at)
    return track


def classic():
    track = np.zeros(RATE * 5)
    t = np.arange(int(RATE * 0.09)) / RATE
    beep = np.sin(2 * np.pi * 2000 * t) * np.minimum(1, np.minimum(t, t[-1] - t) / 0.004)
    for group in range(4):
        for k in range(4):
            place(track, beep * 0.6, group * 1.2 + k * 0.16)
    return track


def save(name, samples):
    samples = samples / max(1e-9, np.abs(samples).max()) * 0.8  # normalisieren
    pcm = (samples * 32767).astype("<i2").tobytes()
    OUT.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "s16le", "-ar", str(RATE), "-ac", "1", "-i", "-",
                    "-b:a", "64k", str(OUT / f"{name}.mp3")], input=pcm, check=True)


if __name__ == "__main__":
    for name, fn in (("calm", calm), ("bells", bells), ("classic", classic)):
        save(name, fn())
    print("Töne geschrieben nach", OUT)

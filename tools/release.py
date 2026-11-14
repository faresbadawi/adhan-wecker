#!/usr/bin/env python3
"""Signiertes Update-Verzeichnis für die Selbst-Updates der Uhren erzeugen.

Aufruf (nach `pio run -e ota` und `npm run build` in webapp/):
    python3 tools/release.py <Zielordner>

Legt im Zielordner (Arbeitskopie von gh-pages) an:
    ota/manifest.json, ota/manifest.sig    Verzeichnis und Unterschrift
    ota/<build>/firmware.bin, ota/<build>/www/...   Dateien dieser Version
Ältere Versionsordner werden entfernt (die vorige bleibt für Uhren, die gerade laden).

Der private Schlüssel liegt nur hier: ~/.config/azan-wecker/ota-key.pem (nicht ins Repository!).
"""
import hashlib, json, os, re, shutil, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEY = os.path.expanduser('~/.config/azan-wecker/ota-key.pem')
BASE_URL = 'https://faresbadawi.github.io/adhan-wecker/ota/'
FIRMWARE = os.path.join(ROOT, '.pio/build/ota/firmware.bin')
DATA = os.path.join(ROOT, 'data')
# Adresse der Zentrale (zentrale/README.md); landet signiert im Verzeichnis, die Uhren melden sich dort
FLEET_FILE = os.path.join(ROOT, 'zentrale/url.txt')

# Dateien, die dem Nutzer gehören: werden nie verteilt oder überschrieben
def user_file(rel):
    return (rel in ('alarm.mp3', 'alarm.txt', 'www/bg/custom.jpg') or rel.startswith('bg/custom')
            or re.match(r'azans/(own|ramadan)', rel) or rel.endswith('.new'))

def sha(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for b in iter(lambda: f.read(65536), b''):
            h.update(b)
    return h.hexdigest()

def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    target = os.path.join(sys.argv[1], 'ota')
    cfg = open(os.path.join(ROOT, 'include/config.h')).read()
    build = int(re.search(r'#define FW_BUILD (\d+)', cfg).group(1))
    version = re.search(r'#define FW_VERSION "([^"]+)"', cfg).group(1)
    if not os.path.exists(KEY):
        sys.exit('Schlüssel fehlt: ' + KEY)

    out = os.path.join(target, str(build))
    shutil.rmtree(out, ignore_errors=True)
    os.makedirs(out)
    shutil.copy(FIRMWARE, os.path.join(out, 'firmware.bin'))

    files = []
    for dirpath, _, names in os.walk(DATA):
        for n in sorted(names):
            full = os.path.join(dirpath, n)
            rel = os.path.relpath(full, DATA).replace(os.sep, '/')
            if user_file(rel):
                continue
            dst = os.path.join(out, rel)
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            shutil.copy(full, dst)
            files.append(['/' + rel, os.path.getsize(full), sha(full)])
    files.sort()

    manifest = {
        'build': build, 'version': version, 'base': BASE_URL + str(build) + '/',
        'fw': {'n': 'firmware.bin', 's': os.path.getsize(FIRMWARE), 'h': sha(FIRMWARE)},
        'files': files, 'prune': ['/www/assets'],
    }
    if os.path.exists(FLEET_FILE):
        url = open(FLEET_FILE).read().strip().rstrip('/')
        if url.startswith('https://'):
            manifest['fleet'] = url
    raw = json.dumps(manifest, separators=(',', ':')).encode()
    with open(os.path.join(target, 'manifest.json'), 'wb') as f:
        f.write(raw)
    sig = subprocess.run(['openssl', 'dgst', '-sha256', '-sign', KEY], input=raw, capture_output=True, check=True).stdout
    with open(os.path.join(target, 'manifest.sig'), 'w') as f:
        f.write(sig.hex() + '\n')

    # nur diese und die vorige Version behalten
    builds = sorted(int(d) for d in os.listdir(target) if d.isdigit())
    for b in builds[:-2]:
        shutil.rmtree(os.path.join(target, str(b)))
    print(f'Update {version} (Nummer {build}): {len(files)} Dateien + Firmware in {target}')

if __name__ == '__main__':
    main()

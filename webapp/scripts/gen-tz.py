# Erzeugt src/lib/tzdb.json: IANA-Zeitzone -> POSIX-Regel (für die Uhr, setenv("TZ")).
# Quelle: letzte Zeile der TZif-Dateien in /usr/share/zoneinfo. Aufruf: python3 scripts/gen-tz.py
import json, os
root = '/usr/share/zoneinfo'
out = {}
for region in ['Africa', 'America', 'Asia', 'Atlantic', 'Australia', 'Europe', 'Indian', 'Pacific']:
    for d, _, files in os.walk(os.path.join(root, region)):
        for f in files:
            p = os.path.join(d, f)
            data = open(p, 'rb').read()
            if not data.startswith(b'TZif'):
                continue
            last = data.rstrip(b'\n').rsplit(b'\n', 1)[-1].decode('ascii', 'ignore').strip()
            if last:
                out[os.path.relpath(p, root)] = last
json.dump(dict(sorted(out.items())), open(os.path.join(os.path.dirname(__file__), '../src/lib/tzdb.json'), 'w'), separators=(',', ':'))
print(len(out), 'Zeitzonen')

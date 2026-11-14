# Bilal Zentrale

Übersichtsseite für alle Bilal-Uhren: welche Uhr verbunden ist, in welcher Stadt sie steht, welche Version sie hat.
Mit einem Knopfdruck aktualisierst du eine Uhr oder alle.

Läuft als Cloudflare Worker mit D1-Datenbank im kostenlosen Tarif.

## Einmalig einrichten

1. Lege ein kostenloses Konto auf <https://dash.cloudflare.com/sign-up> an.
2. Führe im Projektordner dieses Skript aus:

   ```bash
   ./zentrale/setup.sh
   ```

   Es öffnet einmal den Browser für die Anmeldung bei Cloudflare, legt die Datenbank an und lädt die Zentrale hoch.
   Danach fragt es nach einem Passwort für die Übersichtsseite. Das Passwort wird nur bei Cloudflare gespeichert.
   Am Ende steht die Adresse der Zentrale in `zentrale/url.txt`.
3. Erhöhe `FW_BUILD` in `include/config.h` und führe `./tools/publish.sh` aus.
   Die Adresse der Zentrale steht dann im signierten Update-Verzeichnis.
   Die Uhren erfahren sie bei der nächsten Update-Prüfung, also nach dem Neustart oder nachts, und melden sich ab dann alle 10 Minuten.

## Neue Version für alle Uhren

1. Erhöhe in `include/config.h` den Wert `FW_BUILD` (und passe `FW_VERSION` an).
2. Führe `./tools/publish.sh` aus. Das Skript baut die Web-App und die Firmware und lädt beides signiert auf GitHub Pages.
3. Die Uhren installieren das Update nachts selbst. Sofort geht es über „Alle aktualisieren“ in der Zentrale.

Der private Schlüssel zum Unterschreiben liegt nur hier: `~/.config/azan-wecker/ota-key.pem`.
**Sichere diese Datei**, zum Beispiel auf einem USB-Stick.
Ohne sie nimmt keine Uhr mehr ein Update an, bis sie einmal per Kabel oder im WLAN neu geflasht wurde.

## Datenschutz

Jede Uhr meldet nur ihren Namen, ihre Stadt, ihr Land, die Version, die Laufzeit und die WLAN-Signalstärke.
Koordinaten meldet sie nicht.
In der App lässt sich das unter Einstellungen → Gerät → „Mit der Zentrale verbinden“ abschalten.

## Lokal ausprobieren

```bash
cd zentrale
npm install
npx wrangler d1 execute bilal-zentrale --local --file schema.sql
echo 'ADMIN_PASSWORD=test' > .dev.vars
npx wrangler dev
```

Danach ist die Seite unter <http://127.0.0.1:8787> erreichbar.

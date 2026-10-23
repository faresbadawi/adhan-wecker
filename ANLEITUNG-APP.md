# Bilal – App für Android und iPhone

Eine Oberfläche (`webapp/`, React + Ionic), drei Wege zum Nutzer:

| Weg | Was | Ohne Uhr nutzbar? | Alarme zur Gebetszeit |
|-----|-----|-------------------|-----------------------|
| **Uhr** (`data/www`) | Die Uhr liefert die Oberfläche selbst aus (`http://azan-clock.local`) | nein | auf der Uhr |
| **Android-App** (`android/`) | APK. Mit Uhr im WLAN: Oberfläche von der Uhr. Sonst: Oberfläche aus der APK | **ja** | **auf dem Handy** (genau, auch ohne Internet) |
| **Web-App / PWA** (`pwa/`) | Läuft im Browser, auf dem iPhone über „Zum Home-Bildschirm“ | ja (Zeiten, Einstellungen) | nein (siehe unten) |

## Bauen

```bash
# Oberfläche für die Uhr (nach data/www, danach Dateisystem der Uhr aktualisieren)
cd webapp && npm run build

# Android-App (baut die Oberfläche im Modus "app" in die APK, Ergebnis: android/build/Bilal.apk)
cd android && ./build.sh

# Web-App für iPhone und alle Browser (Ergebnis: pwa/)
cd webapp && npm run build:pwa
```

Update der Uhr über WLAN (Adresse der Uhr bei `--upload-port`, wenn `azan-clock.local` nicht gefunden wird):

```bash
pio run -e ota -t upload   --upload-port 192.168.x.y   # Firmware
pio run -e ota -t uploadfs --upload-port 192.168.x.y   # App-Dateien, Azan, Hintergründe
```

**Achtung:** `uploadfs` ersetzt das ganze Dateisystem der Uhr. Ein eigenes Hintergrundbild (`/bg/custom.bin`,
`/www/bg/custom.jpg`) und ein eigener Weckton (`/alarm.mp3`, `/alarm.txt`) gehen dabei verloren. Vorher sichern:
`curl "http://<ip>/api/backup/file?path=/bg/custom.bin" -o custom.bin` (ebenso die anderen drei Pfade).
Danach mit `curl -F bin=@custom.bin -F preview=@custom.jpg http://<ip>/api/background/upload` zurückspielen.

## Veröffentlichen ohne App-Store und ohne Konto

- **Android:** `android/build/Bilal.apk` als „Release“ auf GitHub hochladen. Jeder lädt sie dort herunter
  (Android fragt einmal, ob der Browser Apps installieren darf).
- **iPhone / alle:** den Ordner `pwa/` über GitHub Pages ausliefern (Einstellungen → Pages → Ordner wählen,
  z. B. `pwa/` in den Zweig `gh-pages` legen). Im Safari die Adresse öffnen → Teilen → „Zum Home-Bildschirm“.
- **QR-Code auf der Uhr:** In der App unter *Einstellungen → App installieren → Download-Adresse der App* die https-Adresse
  der Release-Seite eintragen (z. B. `https://github.com/<name>/<repo>/releases/latest`). Die Uhr zeigt sie danach als QR-Code
  auf ihrer Einstellungsseite. Ohne Adresse zeigt der QR-Code die Adresse der Uhr.
  Darunter gibt es ein zweites Feld für die Adresse der Web-Version (PWA). Beide erscheinen auch auf der Seite „WLAN“ der App und auf der
  Seite „Daten gespeichert“ des Einrichtungsportals der Uhr (Link zu Bilal, QR-Code, Link zur Web-Version).
- Die APK wird mit `~/.config/azan-wecker/release.jks` signiert. **Diesen Schlüssel sichern:** Ohne ihn lässt sich die App später
  nicht mehr über die alte Version drüberinstallieren.

## Grenzen (ehrlich)

- **iPhone-Web-App: keine Alarme zur Gebetszeit.** Safari kann Benachrichtigungen nur über einen Server schicken (Web-Push). Dafür
  wäre ein kleiner Cloudflare-Worker nötig (Cron jede Minute, speichert nur die Uhrzeiten). Das ist **noch nicht gebaut**.
- **iPhone-Web-App kann die Uhr nicht steuern:** Eine https-Seite darf keine `http`-Adresse im Heimnetz aufrufen (Mixed Content).
  Zum Einstellen der Uhr am iPhone `http://azan-clock.local` im Safari öffnen.
- **Moschee (Mawaqit) ohne Uhr:** Das Laden des Kalenders geht nur in der Android-App (Browser-Sperre CORS). In der Web-App
  gilt dann die eigene Berechnung.
- **Berechnete Zeiten ohne Netz** (Reserve in der App) können um 1–2 Minuten von Aladhan abweichen; mit Netz holt die App denselben
  Monatskalender wie die Uhr.
- **Azan-Stimmen:** siehe `muezzins/LICENSES.md`. Zwei neue Stimmen (CC0 und CC BY 3.0) wurden nicht abgehört.
  Für `alafasy` und `islam_sobhi` ist die Lizenz nicht dokumentiert.
- **Akku-Optimierung:** Bei manchen Herstellern (Xiaomi, Huawei, Samsung) muss man die Akku-Optimierung für Bilal ausschalten
  (Einstellungen → Alarme auf dem Handy → „Ohne Akku-Einschränkung“), sonst kommen Alarme zu spät.

## Azan verschieben und Erinnerung

Pro Gebet einstellbar (Azan-Seite): Der Azan ertönt bis zu 240 Minuten später (Fajr höchstens bis kurz vor Sonnenaufgang, die anderen
bis kurz vor dem nächsten Gebet) und eine Erinnerung 5–60 Minuten vorher. Die angezeigten Gebetszeiten bleiben die echten Zeiten.
Auf der Uhr gilt das ebenso (leiser Hinweiston `sounds/calm.mp3`); auf dem Handy als Benachrichtigung.

## Einrichtungsassistent und Azan-Test

- „Überspringen“ im Assistenten überspringt nur den aktuellen Schritt. Nach dem letzten Schritt geht es zur Startseite.
- Ohne Uhr zeigt der Assistent nur die Schritte Sprache, Ort, Quelle der Zeiten und Azan.
- Azan-Test und Vorhören (Uhr, Handy, Web-App) spielen nur die ersten 5 Sekunden.

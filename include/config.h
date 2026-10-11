// Einstellungen von Bilal (früher Adhan-Wecker)
#pragma once

// Gerät und Firmware (angezeigt in der Web-App)
#define DEVICE_NAME "Bilal"
#define FW_VERSION "1.0.0"

// Updates über WLAN (ArduinoOTA, Port 3232): pio run -e ota -t upload / -t uploadfs
#define OTA_PASSWORD "azanclock"

// 1 = simulierte Beispieldaten (Uhr startet am 01.10.2026 um 18:42, feste Gebetszeiten und Wetter)
// 0 = echte Daten (NTP, Aladhan-API)
#define DEMO_MODE 0

// Standardwerte beim ersten Start; danach gelten die Einstellungen aus der Weboberfläche
// (http://azan-clock.local), gespeichert im NVS.

// Ort für Gebetszeiten (Aladhan-API)
#define PRAYER_CITY "Peine"
#define PRAYER_COUNTRY "Germany"

// Koordinaten für das Wetter (Open-Meteo, ohne API-Schlüssel)
#define WEATHER_LAT "52.32"
#define WEATHER_LON "10.23"
// Wetter alle ... Minuten aktualisieren
#define WEATHER_INTERVAL_MIN 15

// Berechnungsmethode, siehe https://aladhan.com/calculation-methods
// 3 = Muslim World League, 13 = Diyanet (Türkei), 12 = UOIF (Frankreich)
#define PRAYER_METHOD 3

// Zeitzone Europe/Berlin (POSIX-Schreibweise), Sommer-/Winterzeit automatisch
#define TZ_INFO "CET-1CEST,M3.5.0,M10.5.0/3"
#define NTP_SERVER_1 "pool.ntp.org"
#define NTP_SERVER_2 "time.google.com"

// Name des WLAN-Zugangspunkts für die Ersteinrichtung (http://192.168.4.1)
#define SETUP_AP_NAME "Bilal-Setup"

// Azan-Dateien: zuerst SD-Karte (AZAN_DIR_SD), dann interner Flash (LittleFS, AZAN_DIR_FLASH).
// Dateinamen: azan.mp3 für alle Gebete; optional eigene Dateien azan_fajr.mp3, azan_dhuhr.mp3,
// azan_asr.mp3, azan_maghrib.mp3, azan_isha.mp3 (haben Vorrang)
#define AZAN_DIR_SD "/azan"
#define AZAN_DIR_FLASH "/"

// Lautstärke: Decoder 0..21, Codec 0..100
#define AZAN_VOLUME 15
#define CODEC_VOLUME 80

// Fehlt die MP3-Datei, bleibt der Azan-Bildschirm so lange sichtbar (Sekunden)
#define AZAN_NO_AUDIO_SECONDS 60
// Nach "Stumm" zurück zum Home-Bildschirm nach (Sekunden)
#define AZAN_MUTED_RETURN_SECONDS 8

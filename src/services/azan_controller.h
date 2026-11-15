// Azan-Logik: erkennt den Beginn einer Gebetszeit, startet die passende MP3
// und verwaltet die Zustände (läuft / stumm / beendet). Kennt keine Oberfläche.
#pragma once
#include <FS.h>
#include <Arduino.h>
#include <time.h>
#include "model.h"

namespace azan
{
    enum class State : uint8_t
    {
        IDLE,    // kein Azan
        PLAYING, // Azan läuft (mit oder ohne Audiodatei)
        MUTED,   // stummgeschaltet, Hinweis noch sichtbar
    };

    struct Status
    {
        State state = State::IDLE;
        model::Prayer prayer = model::FAJR;
        uint16_t minutes = 0;      // Gebetszeit (Minuten seit Mitternacht)
        bool hasAudio = false;     // MP3-Datei gefunden
        uint32_t elapsed = 0;      // Sekunden
        uint32_t duration = 0;     // Sekunden, 0 = unbekannt
        bool preview = false;      // Hörprobe aus der App (ganzer Azan, kein Gebet)
        bool showPrayer = true;    // Hörprobe: Gebetsname mit anzeigen
        char label[64] = "";       // Hörprobe: Name des Muezzins zur Anzeige
        char key[40] = "";         // Hörprobe: Kennung der App (welcher Knopf läuft)
        uint32_t serial = 0;       // zählt bei jedem Start hoch (Anzeige erneuern)
    };

    // Verschieben und Erinnerung je Gebet (Fajr, Dhuhr, Asr, Maghrib, Isha), in Minuten.
    // delay: der Azan ertönt so viel später als die Gebetszeit (angezeigt wird weiter die echte Gebetszeit);
    // remind: so viele Minuten vor der Gebetszeit ertönt ein leiser Hinweiston, 0 = aus.
    struct Timing
    {
        uint8_t delay[5];
        uint8_t remind[5];
    };
    constexpr uint8_t MAX_REMIND = 60;
    constexpr uint8_t MAX_DELAY = 240;

    Timing timing();
    bool setTiming(const Timing &t); // prüft, speichert dauerhaft; false bei ungültigen Werten

    // Längste sinnvolle Verschiebung am Tag `day`: Fajr bis kurz vor Sonnenaufgang, die anderen bis kurz vor
    // dem nächsten Gebet, Isha bis Mitternacht (höchstens MAX_DELAY).
    int maxDelay(const model::PrayerDay &day, int i);
    // Minute (seit Mitternacht), in der der Azan des Gebets i an diesem Tag ertönt
    int azanMinute(const model::PrayerDay &day, int i);

    // Wo und wie lange der Azan auf der Uhr läuft: onClock = false schaltet Azan und Hinweiston auf der Uhr ab
    // (z. B. wenn nur das Handy rufen soll); maxSeconds = 0: ganzer Azan, sonst Dauer in Sekunden (5..600).
    bool onClock();
    bool setOnClock(bool on);
    // Eigener Azan im Ramadan (Datei RAMADAN_FILE, aus der App hochgeladen):
    // 0 = aus, 1 = für alle Gebete, 2 = nur Maghrib (Fastenbrechen)
    constexpr const char *RAMADAN_FILE = "/azans/ramadan.mp3";
    uint8_t ramadanMode();
    bool setRamadanMode(uint8_t mode);
    uint16_t maxSeconds();
    bool setMaxSeconds(uint16_t seconds);

    // Regelmäßig aufrufen (jede Sekunde genügt). enabledMask: Bit i = model::DAILY_PRAYERS[i]
    // (Fajr, Dhuhr, Asr, Maghrib, Isha) darf den Azan automatisch starten.
    void update(const struct tm &now, const model::PrayerDay &day, uint8_t enabledMask);

    // Lautstärke je Gebet in Prozent (Fajr, Dhuhr, Asr, Maghrib, Isha), wirkt beim nächsten Start
    void setVolumes(const uint8_t percent[5]);
    // Lautstärke des Gebets am Ausgang einstellen (vor dem Abspielen oder zum Probehören)
    void applyVolume(model::Prayer p);

    // Hinweiston vor dem Gebet i (leiser Ton, nur wenn gerade nichts spielt); true, wenn er gestartet wurde
    bool playReminder(int i);

    // Kleiner Klang (ein paar Glockentöne, kein Azan), z. B. beim Sonnenaufgang; true, wenn er gestartet wurde
    bool playChime();

    // Nach ms Millisekunden den Ton beenden (Vorhören: nur die ersten Sekunden des Azans)
    void limitTo(uint32_t ms);

    // Azan sofort starten (Test/Demo).
    void start(model::Prayer p, uint16_t minutes);

    // Wie start(), aber nur die ersten Sekunden (Test aus der App)
    void startTest(model::Prayer p, uint16_t minutes, uint32_t ms = 5000);

    void mute(); // Ton aus, Hinweis bleibt kurz sichtbar
    void skip(); // Ton aus, sofort beenden
    // Hörprobe: spielt die Datei ganz und zeigt den Hinweis mit dem Namen; false, wenn gerade ein echter Azan läuft
    bool preview(fs::FS &fs, const char *path, model::Prayer p, const char *label, const char *key, bool showPrayer);

    Status status();

    // Azan-Stimme: Dateien /azans/<id>.mp3 und /azans/<id>_fajr.mp3 im LittleFS (z. B. "alafasy").
    // Die Wahl wird im NVS gespeichert; Standard ist "alafasy".
    String voice();
    bool setVoice(const String &id);
    bool voiceExists(const String &id);
    // Datei der Stimme für ein Gebet (Fajr: eigene Fassung, falls vorhanden); zuerst auf der SD-Karte, dann im
    // LittleFS. Gibt das Dateisystem zurück, nullptr, wenn keine Datei da ist.
    fs::FS *voiceFile(const String &id, model::Prayer p, char *path, size_t len);

    // Eigene Azane (aus der App hochgeladen) liegen unter /azans/ im Flash oder auf der SD-Karte.
    // ownStore: 0 = automatisch (SD-Karte, wenn eingelegt), 1 = Uhr (Flash), 2 = SD-Karte
    uint8_t ownStore();
    bool setOwnStore(uint8_t mode);
    fs::FS &ownTarget();              // hierhin gehen neue Uploads
    fs::FS *ownFs(const char *path);  // wo die Datei liegt (SD zuerst), nullptr = nirgends
    uint64_t freeBytes(fs::FS &fs);
}

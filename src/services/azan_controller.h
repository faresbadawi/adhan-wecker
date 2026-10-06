// Azan-Logik: erkennt den Beginn einer Gebetszeit, startet die passende MP3
// und verwaltet die Zustände (läuft / stumm / beendet). Kennt keine Oberfläche.
#pragma once
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
    };

    // Regelmäßig aufrufen (jede Sekunde genügt). enabledMask: Bit i = model::DAILY_PRAYERS[i]
    // (Fajr, Dhuhr, Asr, Maghrib, Isha) darf den Azan automatisch starten.
    void update(const struct tm &now, const model::PrayerDay &day, uint8_t enabledMask);

    // Lautstärke je Gebet in Prozent (Fajr, Dhuhr, Asr, Maghrib, Isha), wirkt beim nächsten Start
    void setVolumes(const uint8_t percent[5]);
    // Lautstärke des Gebets am Ausgang einstellen (vor dem Abspielen oder zum Probehören)
    void applyVolume(model::Prayer p);

    // Azan sofort starten (Test/Demo).
    void start(model::Prayer p, uint16_t minutes);

    void mute(); // Ton aus, Hinweis bleibt kurz sichtbar
    void skip(); // Ton aus, sofort beenden

    Status status();

    // Azan-Stimme: Dateien /azans/<id>.mp3 und /azans/<id>_fajr.mp3 im LittleFS (z. B. "alafasy").
    // Die Wahl wird im NVS gespeichert; Standard ist "alafasy".
    String voice();
    bool setVoice(const String &id);
    bool voiceExists(const String &id);
    // Datei der Stimme für ein Gebet (Fajr: eigene Fassung, falls vorhanden); false, wenn keine da ist
    bool voiceFile(const String &id, model::Prayer p, char *path, size_t len);
}

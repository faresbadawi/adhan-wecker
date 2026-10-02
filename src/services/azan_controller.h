// Azan-Logik: erkennt den Beginn einer Gebetszeit, startet die passende MP3
// und verwaltet die Zustände (läuft / stumm / beendet). Kennt keine Oberfläche.
#pragma once
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

    // Azan sofort starten (Test/Demo).
    void start(model::Prayer p, uint16_t minutes);

    void mute(); // Ton aus, Hinweis bleibt kurz sichtbar
    void skip(); // Ton aus, sofort beenden

    Status status();
}

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

    // Regelmäßig aufrufen (jede Sekunde genügt). enabledMask: Bit i = model::DAILY_PRAYERS[i]
    // (Fajr, Dhuhr, Asr, Maghrib, Isha) darf den Azan automatisch starten.
    void update(const struct tm &now, const model::PrayerDay &day, uint8_t enabledMask);

    // Lautstärke je Gebet in Prozent (Fajr, Dhuhr, Asr, Maghrib, Isha), wirkt beim nächsten Start
    void setVolumes(const uint8_t percent[5]);
    // Lautstärke des Gebets am Ausgang einstellen (vor dem Abspielen oder zum Probehören)
    void applyVolume(model::Prayer p);

    // Hinweiston vor dem Gebet i (leiser Ton, nur wenn gerade nichts spielt); true, wenn er gestartet wurde
    bool playReminder(int i);

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

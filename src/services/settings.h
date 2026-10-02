// Zentrale Einstellungen: dauerhaft im NVS gespeichert, von Weboberfläche und Display gemeinsam genutzt.
// Thread-sicher: get() liefert eine Kopie, set() speichert und erhöht version().
#pragma once
#include <stdint.h>

namespace settings
{
    // Erste gespeicherte Fassung; neue Felder kommen nur in Settings dazu,
    // damit ältere Speicherstände übernommen werden können.
    struct SettingsV1
    {
        // Standort
        char city[48];
        char country[48];
        float latitude;
        float longitude;

        // Gebetszeiten: Korrektur in Minuten (Fajr, Dhuhr, Asr, Maghrib, Isha)
        int8_t fajrOffset, dhuhrOffset, asrOffset, maghribOffset, ishaOffset;

        // Berechnung (Aladhan): method, school 0 = Standard (Shafi'i), 1 = Hanafi
        uint8_t calculationMethod;
        uint8_t madhhab;

        // Seiten ein-/ausblenden (die Einstellungsseite ist immer sichtbar)
        bool showPrayerTimes, showWeather, showCalendar, showClock;

        // ungenutzt, ersetzt durch die Farbgruppen unten
        uint32_t backgroundColor;
        uint32_t primaryColor;
    };

    struct SettingsV2 : SettingsV1
    {
        // Farbgruppen (0xRRGGBB): Hauptschrift, Akzent (Symbole, Titel), Nebenschrift
        uint32_t colorMain, colorAccent, colorMuted;
        // Hintergrund: Dateiname ohne Endung in /bg/ (LittleFS)
        char background[24];

        // Wecker: Azan je Gebet (Fajr, Dhuhr, Asr, Maghrib, Isha), Lautstärke 0..21
        bool azanEnabled[5];
        uint8_t volume;

        // Display-Helligkeit in Prozent (5..100)
        uint8_t brightness;
    };

    // Seiten-IDs für die Reihenfolge (die Einstellungsseite steht immer am Ende)
    enum PageId : uint8_t
    {
        PAGE_ID_CLOCK,
        PAGE_ID_PRAYER,
        PAGE_ID_WEATHER,
        PAGE_ID_CALENDAR,
        PAGE_ID_COUNT
    };

    struct SettingsV3 : SettingsV2
    {
        // Reihenfolge der Seiten von links nach rechts (jede ID genau einmal)
        uint8_t pageOrder[PAGE_ID_COUNT];
    };

    // Quelle der Gebetszeiten
    enum PrayerSource : uint8_t
    {
        SOURCE_CALCULATED, // Aladhan: Berechnung nach Standort und Methode
        SOURCE_MAWAQIT,    // Kalender einer Moschee auf Mawaqit
    };

    struct SettingsV4 : SettingsV3
    {
        uint8_t prayerSource;
        char mawaqitSlug[96]; // z. B. "alsalam-moschee-sz-salzgitter-38220-germany"
        char mawaqitName[64]; // nur zur Anzeige in der Weboberfläche
    };

    // Eigene Weckzeit
    struct Alarm
    {
        bool enabled;
        uint8_t hour, minute;
        uint8_t days; // Bit 0 = Sonntag ... Bit 6 = Samstag (wie tm_wday)
    };
    constexpr int MAX_ALARMS = 4;

    struct Settings : SettingsV4
    {
        uint8_t alarmCount; // belegte Einträge in alarms
        Alarm alarms[MAX_ALARMS];
    };

    // Lädt aus dem NVS, sonst Standardwerte aus config.h.
    void begin();

    Settings get();
    // Prüft, speichert dauerhaft und erhöht version(). false bei ungültigen Werten.
    bool set(const Settings &s);

    // Steigt bei jeder Änderung; Dienste vergleichen damit, ob sie neu laden müssen.
    uint32_t version();
}

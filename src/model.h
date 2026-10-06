// Gemeinsames Datenmodell. Dienste füllen es, die Oberfläche zeigt es an.
// Keine Abhängigkeiten zu LVGL oder Netzwerk.
#pragma once
#include <stdint.h>

namespace model
{
    enum Prayer : uint8_t
    {
        FAJR,
        SUNRISE, // kein Gebet, nur intern
        DHUHR,
        ASR,
        MAGHRIB,
        ISHA,
        PRAYER_COUNT
    };

    // Die fünf Pflichtgebete in zeitlicher Reihenfolge
    constexpr Prayer DAILY_PRAYERS[] = {FAJR, DHUHR, ASR, MAGHRIB, ISHA};

    // Besondere Tage nach dem Hijri-Datum (das Datum liefert die Aladhan-API).
    // Reihenfolge = Texte "holiday" in tools/gen_assets.py.
    enum Holiday : int8_t
    {
        NO_HOLIDAY = -1,
        HIJRI_NEW_YEAR, // 1. Muharram
        ASHURA,         // 10. Muharram
        ISRA_MIRAJ,     // 27. Radschab
        RAMADAN_START,  // 1. Ramadan
        LAYLAT_QADR,    // 27. Ramadan
        EID_FITR,       // 1.-3. Schawwal
        ARAFAH,         // 9. Dhu l-Hiddscha
        EID_ADHA,       // 10.-13. Dhu l-Hiddscha
        HOLIDAY_COUNT
    };

    inline Holiday holidayOf(int hijriMonth, int hijriDay)
    {
        switch (hijriMonth)
        {
        case 1: return hijriDay == 1 ? HIJRI_NEW_YEAR : hijriDay == 10 ? ASHURA : NO_HOLIDAY;
        case 7: return hijriDay == 27 ? ISRA_MIRAJ : NO_HOLIDAY;
        case 9: return hijriDay == 1 ? RAMADAN_START : hijriDay == 27 ? LAYLAT_QADR : NO_HOLIDAY;
        case 10: return hijriDay >= 1 && hijriDay <= 3 ? EID_FITR : NO_HOLIDAY;
        case 12: return hijriDay == 9 ? ARAFAH : hijriDay >= 10 && hijriDay <= 13 ? EID_ADHA : NO_HOLIDAY;
        default: return NO_HOLIDAY;
        }
    }

    struct PrayerDay
    {
        bool valid = false;
        int16_t year = 0;
        int8_t month = 0, day = 0;            // gregorianisches Datum der Zeiten
        uint16_t minutes[PRAYER_COUNT] = {}; // Minuten seit Mitternacht (Ortszeit)
        int16_t hijriYear = 0;
        int8_t hijriMonth = 0, hijriDay = 0;
    };

    enum class Sky : uint8_t
    {
        CLEAR,
        PARTLY_CLOUDY,
        CLOUDY,
        FOG,
        DRIZZLE,
        RAIN,
        SNOW,
        THUNDER,
    };

    struct DayForecast
    {
        Sky sky = Sky::CLEAR;
        int8_t tempMax = 0, tempMin = 0;
    };

    struct Weather
    {
        bool valid = false;
        bool isDay = true;
        Sky sky = Sky::CLEAR;
        float temp = 0, feelsLike = 0;
        uint8_t humidity = 0; // %
        float windKmh = 0;
        int8_t tempMax = 0, tempMin = 0;
        DayForecast forecast[3]; // heute, morgen, übermorgen
    };

    struct WifiInfo
    {
        bool connected = false;
        bool portalActive = false; // Einrichtungs-Zugangspunkt offen
        int8_t bars = 0;           // 1..4 bei Verbindung
        char ssid[33] = {};
    };

    const char *prayerName(Prayer p);      // "Maghrib"
    const char *skyText(Sky s);            // "Bewölkt"
}

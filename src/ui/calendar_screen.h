// Seite "Kalender": aktueller Monat, Woche von Samstag (rechts) bis Freitag (links),
// je Tag gregorianisches Datum und klein das Hijri-Datum; heute hervorgehoben.
#pragma once
#include <lvgl.h>
#include <time.h>

namespace calendar_screen
{
    struct Hijri
    {
        int8_t day[31] = {};    // Hijri-Tag je Monatstag (0 = unbekannt)
        int8_t firstMonth = 0;  // Hijri-Monat am 1. und am letzten Tag (1..12, 0 = unbekannt)
        int8_t lastMonth = 0;
        int16_t year = 0;
    };

    void create(lv_obj_t *parent);

    // Monat von `today` neu aufbauen
    void setMonth(const struct tm &today, const Hijri &hijri);
}

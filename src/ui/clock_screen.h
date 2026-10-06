// Seite "Uhr groß": große Uhrzeit, Wochentag und Hijri-Datum auf Arabisch, gregorianisches Datum.
#pragma once
#include <lvgl.h>
#include <time.h>
#include "model.h"

namespace clock_screen
{
    void create(lv_obj_t *parent);
    void setClock(const struct tm &t);
    void setHijri(const model::PrayerDay &day);
    void setAlarm(int minutes); // nächster Wecker, -1 = keiner
    void setHoliday(model::Holiday h); // besonderer Tag statt des Datums
}

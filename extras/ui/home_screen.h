// Home: Uhrzeit, Datum, Wetter kurz, Countdown zum nächsten Gebet, die fünf Gebetszeiten.
#pragma once
#include <lvgl.h>
#include <time.h>
#include "model.h"

namespace home
{
    void create(lv_obj_t *parent);

    void setClock(const struct tm &t);
    void setPrayers(const model::PrayerDay &day);
    void setNext(model::Prayer p, int32_t secondsLeft, uint16_t atMinutes);
    void setWeather(const model::Weather &w);
}

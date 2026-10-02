// Seite "Wetter groß": aktuelles Wetter mit Details und Vorhersage für drei Tage, auf Arabisch.
#pragma once
#include <lvgl.h>
#include "model.h"

namespace weather_screen
{
    void create(lv_obj_t *parent);
    void setWeather(const model::Weather &w);
    void setCity(const char *city);
}

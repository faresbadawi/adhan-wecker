// Wetter: aktuelle Werte groß, Details rechts, Vorhersage für drei Tage unten.
#pragma once
#include <lvgl.h>
#include "model.h"

namespace weather_screen
{
    void create(lv_obj_t *parent, const char *location);
    void setWeather(const model::Weather &w);
}

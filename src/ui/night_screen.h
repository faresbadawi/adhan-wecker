// Nachtseite: Beginn des letzten Nachtdrittels (Zeit für das Nachtgebet) mit Countdown,
// dazu Mitte der Nacht, Fajr und Sonnenaufgang.
#pragma once
#include <lvgl.h>
#include "model.h"

namespace night_screen
{
    void create(lv_obj_t *parent);

    // Ungültig -> "Lade Zeiten"
    void set(const model::NightTimes &n);
}

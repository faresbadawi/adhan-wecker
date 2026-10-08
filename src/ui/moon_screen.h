// Seite "Mond & Hijri": aktuelle Mondphase (berechnet und gezeichnet), Hijri-Datum groß,
// Leiste mit allen Tagen des Hijri-Monats (Weiße Tage 13.–15. hervorgehoben).
// Ruhig ohne Bewegung: Mond mit Schein und Achtstern-Ornament immer links, Datum und Angaben rechts.
#pragma once
#include <lvgl.h>
#include <time.h>
#include "model.h"

namespace moon_screen
{
    void create(lv_obj_t *parent);

    // Einmal pro Stunde und bei Tageswechsel aufrufen
    void update(time_t now, const model::PrayerDay &day);
}

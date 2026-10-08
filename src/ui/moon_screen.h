// Seite "Mond & Hijri": aktuelle Mondphase (berechnet und gezeichnet), Hijri-Datum groß,
// Leiste mit allen Tagen des Hijri-Monats (Weiße Tage 13.–15. hervorgehoben).
// Sanfte Bewegung: Schein um den Mond, langsam drehendes Achtstern-Ornament, funkelnde Sterne.
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

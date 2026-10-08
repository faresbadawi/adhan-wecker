// Gebetszeiten.
// Echtbetrieb: lädt im Hintergrund den ganzen Monat von der Aladhan-API (https://aladhan.com)
// und speichert ihn im NVS. Ohne Internet werden die zuletzt geladenen Zeiten weiterverwendet.
// Demo: feste Beispielzeiten.
#pragma once
#include <time.h>
#include "model.h"

namespace prayers
{
    void begin(bool demo);

    // Zeiten für den angegebenen Tag (oder den nächstliegenden bekannten Tag).
    // false, wenn noch gar keine Zeiten vorliegen.
    bool forDay(const struct tm &day, model::PrayerDay &out);

    // Nächstes der fünf Gebete ab `now`. Nach Isha: Fajr des Folgetags (mit heutiger Fajr-Zeit genähert).
    void next(const struct tm &now, const model::PrayerDay &day, model::Prayer &prayer, int32_t &secondsLeft);

    // Nacht (Maghrib bis Fajr) mit Mitte und letztem Drittel. Bis Fajr gilt die laufende Nacht,
    // danach die kommende. false, solange keine Zeiten vorliegen.
    bool night(const struct tm &now, model::NightTimes &out);

    // Wird erhöht, sobald neue Zeiten geladen wurden.
    uint32_t version();
}

// Gebetszeiten von Moscheen auf Mawaqit (https://mawaqit.net).
// Es gibt keine offizielle offene Schnittstelle; genutzt werden die öffentliche Moscheesuche
// und der Jahreskalender ("confData") auf der öffentlichen Seite jeder Moschee.
#pragma once
#include <Arduino.h>

namespace mawaqit
{
    // Moscheen suchen: nach Name/Ort (query) oder, wenn query leer ist, in der Nähe von lat/lon.
    // Ergebnis als kompaktes JSON: [{"name","slug","address","distance"}] (distance in m, 0 = unbekannt)
    bool search(const char *query, float lat, float lon, String &outJson);

    // Gebetszeiten eines Monats (1..12) der Moschee mit diesem Slug.
    // minutes[Tag-1][0..5] = Fajr, Sonnenaufgang, Dhuhr, Asr, Maghrib, Isha (Minuten seit Mitternacht).
    // days = Anzahl der Tage im Kalender. Darf nicht aus dem LVGL-Task aufgerufen werden (dauert Sekunden).
    bool fetchMonth(const char *slug, int month, uint16_t minutes[31][6], int &days);
}

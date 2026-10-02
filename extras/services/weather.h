// Wetterdaten. Aktuell nur Beispieldaten (Demo); der Abruf über eine Wetter-API
// (z. B. Open-Meteo, ohne API-Schlüssel) wird als nächster Schritt in weather.cpp ergänzt.
#pragma once
#include "model.h"

namespace weather
{
    void begin(bool demo);

    // false, solange keine Daten vorliegen.
    bool get(model::Weather &out);

    // Wird erhöht, sobald neue Daten vorliegen.
    uint32_t version();
}

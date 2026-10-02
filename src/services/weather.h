// Wetter von Open-Meteo (https://open-meteo.com, ohne API-Schlüssel), im Hintergrund geladen.
#pragma once
#include <Arduino.h>
#include "model.h"

namespace weather
{
    void begin();

    // false, solange noch keine Daten vorliegen.
    bool get(model::Weather &out);

    // Wetter für beliebige Koordinaten sofort abrufen (z. B. für den Sprachassistenten).
    // Blockiert einige Sekunden, nicht aus loop() aufrufen.
    bool fetchAt(float lat, float lon, model::Weather &out);

    // Ort suchen (Open-Meteo, auch arabische Namen): Koordinaten und Anzeigename.
    bool geocode(const char *name, float &lat, float &lon, String &displayName);

    // Wird erhöht, sobald neue Daten vorliegen.
    uint32_t version();
}

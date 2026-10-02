// Wetter von Open-Meteo (https://open-meteo.com, ohne API-Schlüssel), im Hintergrund geladen.
#pragma once
#include "model.h"

namespace weather
{
    void begin();

    // false, solange noch keine Daten vorliegen.
    bool get(model::Weather &out);

    // Wird erhöht, sobald neue Daten vorliegen.
    uint32_t version();
}

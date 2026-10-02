// Touch-Controller im ST77922-Panel (Sitronix, Registerbelegung wie ST7123), I2C 0x55.
// Quelle der Registerbelegung: ESPHome components/st7123.
#pragma once
#include <Arduino.h>

namespace touch
{
    // Startet I2C (SDA 38, SCL 39) und setzt den Controller zurück.
    bool begin();

    // Liest den ersten Touchpunkt in Panel-Koordinaten (Hochformat 320x480).
    bool read(uint16_t &x, uint16_t &y);
}

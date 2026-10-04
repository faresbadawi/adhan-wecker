// RGB-LED auf dem Board (GPIO40, WS2812-Protokoll über RMT).
// Je nach Bestückung RGB (24 Bit, GRB) oder RGBW (32 Bit, GRBW); per setFormat umschaltbar.
#pragma once
#include <stdint.h>

namespace rgbled
{
    void begin();
    void setFormat(bool rgbw);
    void set(uint8_t r, uint8_t g, uint8_t b, uint8_t w = 0);
    void off();
}

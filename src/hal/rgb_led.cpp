#include "rgb_led.h"
#include <Arduino.h>

namespace rgbled
{
    static constexpr int PIN = 40;
    static bool s_ready = false;
    static bool s_rgbw = false;

    void begin()
    {
        // 10 MHz: ein Takt = 100 ns
        s_ready = rmtInit(PIN, RMT_TX_MODE, RMT_MEM_NUM_BLOCKS_1, 10000000);
        off();
    }

    void setFormat(bool rgbw) { s_rgbw = rgbw; }

    void set(uint8_t r, uint8_t g, uint8_t b, uint8_t w)
    {
        if (!s_ready)
            return;
        const uint8_t bytes[4] = {g, r, b, w}; // WS2812: Grün zuerst
        const int n = s_rgbw ? 4 : 3;
        rmt_data_t bits[32];
        for (int i = 0; i < n * 8; i++)
        {
            const bool one = bytes[i / 8] & (0x80 >> (i % 8));
            bits[i].level0 = 1;
            bits[i].duration0 = one ? 8 : 4; // 0,8 µs bzw. 0,4 µs hoch
            bits[i].level1 = 0;
            bits[i].duration1 = one ? 4 : 8;
        }
        rmtWrite(PIN, bits, n * 8, RMT_WAIT_FOR_EVER);
        delayMicroseconds(80); // Reset-Pause
    }

    void off() { set(0, 0, 0, 0); }
}

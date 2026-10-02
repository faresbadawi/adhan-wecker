// Audio-Codec ES8311 (I2C 0x18): Wiedergabe und Mikrofon (analog, Eingang 1).
// Angepasst aus dem Espressif-Treiber (SPDX: Apache-2.0, (c) 2015-2022 Espressif Systems)
// für Arduino-Wire, damit sich Codec und Touch den I2C-Bus (SDA 38, SCL 39) teilen können.
#pragma once
#include <Arduino.h>

namespace es8311
{
    // Erwartet MCLK = 256 x Abtastrate (Standard des ESP32-I2S-Treibers), 16 Bit, I2S-Slave.
    // Wire muss bereits gestartet sein.
    bool begin();

    // 0..100
    void setVolume(uint8_t percent);
    void mute(bool on);
}

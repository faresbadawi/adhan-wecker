// Minimaler Treiber für das ST77922-QSPI-Display des LCDwiki ES3C35P (320x480).
// Init-Sequenz: auf Hardware verifizierte Variante aus
// https://github.com/jlmeredith/ES3C35P (esphome/st77922-init-sequence.yaml).
#pragma once
#include <Arduino.h>

namespace lcd
{
    constexpr uint16_t NATIVE_W = 320;
    constexpr uint16_t NATIVE_H = 480;

    // RGB565-Farben
    constexpr uint16_t BLACK = 0x0000;
    constexpr uint16_t WHITE = 0xFFFF;
    constexpr uint16_t RED = 0xF800;
    constexpr uint16_t GREEN = 0x07E0;
    constexpr uint16_t BLUE = 0x001F;
    constexpr uint16_t YELLOW = 0xFFE0;
    constexpr uint16_t GRAY = 0x8430;

    // Startet SPI-Bus, Panel und Hintergrundbeleuchtung.
    void begin();

    // 0 = Hochformat (320x480), 1 = Querformat (480x320)
    void setRotation(uint8_t r);
    uint16_t width();
    uint16_t height();

    // Achtung: x und w werden vom Panel auf Vielfache von 4 ausgerichtet.
    void fillRect(uint16_t x, uint16_t y, uint16_t w, uint16_t h, uint16_t color);
    void fillScreen(uint16_t color);

    // Schreibt w*h Pixel (RGB565, Byte-Reihenfolge big-endian) in das Fenster.
    void pushPixels(uint16_t x, uint16_t y, uint16_t w, uint16_t h, const uint16_t *pixels);

    void setBacklight(bool on);
    // Helligkeit 5..100 % (schaltet die Beleuchtung ein)
    void setBrightness(uint8_t percent);
}

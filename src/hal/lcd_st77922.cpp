#include "lcd_st77922.h"
#include "driver/spi_master.h"
#include "esp_heap_caps.h"

namespace lcd
{
    // Pins laut https://www.lcdwiki.com/3.5inch_ESP32-S3_Display
    static constexpr int PIN_CS = 10;
    static constexpr int PIN_SCLK = 12;
    static constexpr int PIN_D0 = 11;
    static constexpr int PIN_D1 = 13;
    static constexpr int PIN_D2 = 14;
    static constexpr int PIN_D3 = 9;
    static constexpr int PIN_BL = 41; // HIGH = an

    // Der Controller ist bis 62,5 MHz spezifiziert; der Hersteller nutzt 80 MHz.
    static constexpr int SPI_HZ = 40 * 1000 * 1000;
    static constexpr size_t CHUNK_PX = 8192; // Pixel pro SPI-Transaktion
    static constexpr size_t FILL_PX = 2048;  // Puffer für fillRect, nur kurz belegt

    static spi_device_handle_t s_dev;
    static uint16_t s_w = NATIVE_W, s_h = NATIVE_H;

    struct InitCmd
    {
        uint8_t cmd;
        uint8_t len;
        uint8_t data[16];
        uint16_t delayMs;
    };

    static const InitCmd INIT_CMDS[] = {
        {0xF1, 1, {0x00}, 0},
        {0x60, 3, {0x00, 0x00, 0x00}, 0},
        {0x65, 1, {0x80}, 0},
        {0x79, 1, {0x06}, 0},
        {0x7B, 3, {0x00, 0x08, 0x08}, 0},
        {0x80, 11, {0x55, 0x62, 0x2F, 0x17, 0xF0, 0x52, 0x70, 0xD2, 0x52, 0x62, 0xEA}, 0},
        {0x81, 4, {0x26, 0x52, 0x72, 0x27}, 0},
        {0x84, 2, {0x92, 0x25}, 0},
        {0x87, 6, {0x10, 0x10, 0x58, 0x00, 0x02, 0x3A}, 0},
        {0x88, 15, {0x00, 0x00, 0x2C, 0x10, 0x04, 0x00, 0x00, 0x00, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x06}, 0},
        {0x89, 3, {0x00, 0x00, 0x00}, 0},
        {0x8A, 11, {0x13, 0x00, 0x2C, 0x00, 0x00, 0x2C, 0x10, 0x10, 0x00, 0x3E, 0x19}, 0},
        {0x8B, 9, {0x15, 0xB1, 0xB1, 0x44, 0x96, 0x2C, 0x10, 0x97, 0x8E}, 0},
        {0x8C, 13, {0x1D, 0xB1, 0xB1, 0x44, 0x96, 0x2C, 0x10, 0x50, 0x0F, 0x01, 0xC5, 0x12, 0x09}, 0},
        {0x8D, 1, {0x0C}, 0},
        {0x8E, 6, {0x33, 0x01, 0x0C, 0x13, 0x01, 0x01}, 0},
        {0xB3, 2, {0x00, 0x30}, 0},
        {0xF1, 1, {0x00}, 0},
        {0x71, 1, {0xD0}, 0},
        {0x66, 2, {0x02, 0x3F}, 0},
        {0xBE, 3, {0x26, 0x00, 0x9D}, 0},
        {0x70, 12, {0x01, 0xA6, 0x11, 0x40, 0xE0, 0x00, 0x11, 0x60, 0x11, 0x00, 0x00, 0x1A}, 0},
        {0x90, 9, {0x04, 0x04, 0x55, 0x74, 0x00, 0x40, 0x43, 0x2D, 0x2D}, 0},
        {0x91, 9, {0x04, 0x04, 0x55, 0x75, 0x00, 0x40, 0x42, 0x2D, 0x2D}, 0},
        {0x92, 10, {0x04, 0x44, 0x55, 0xC0, 0x06, 0x00, 0x07, 0x05, 0x90, 0x2D}, 0},
        {0x93, 10, {0x04, 0x43, 0x11, 0x00, 0x00, 0x00, 0x00, 0x05, 0x90, 0x2D}, 0},
        {0x94, 6, {0x00, 0x00, 0x00, 0x00, 0x00, 0x00}, 0},
        {0x95, 5, {0x96, 0x16, 0x00, 0x00, 0xFF}, 0},
        {0x96, 12, {0x44, 0x53, 0x03, 0x12, 0x23, 0x24, 0x06, 0x05, 0x9A, 0x2D, 0x00, 0x44}, 0},
        {0x97, 12, {0x44, 0x53, 0x47, 0x56, 0x20, 0x20, 0x02, 0x01, 0x9A, 0x2D, 0x00, 0x44}, 0},
        {0xBA, 5, {0x55, 0x9A, 0x2D, 0x9A, 0x2D}, 0},
        {0x9A, 7, {0x40, 0x00, 0x06, 0x00, 0x00, 0x00, 0x00}, 0},
        {0x9B, 7, {0x00, 0x00, 0x06, 0x00, 0x00, 0x00, 0x00}, 0},
        {0x9C, 13, {0x5C, 0x12, 0x00, 0x00, 0x10, 0x12, 0x00, 0x00, 0x10, 0x02, 0x00, 0x00, 0x00}, 0},
        {0x9D, 8, {0x8A, 0x51, 0x00, 0x00, 0x00, 0x80, 0x1E, 0x01}, 0},
        {0x9E, 7, {0x51, 0x00, 0x00, 0x00, 0x80, 0x1E, 0x01}, 0},
        {0xB4, 12, {0x1D, 0x1C, 0x1E, 0x0B, 0x14, 0x02, 0x13, 0x09, 0x1E, 0x00, 0x1E, 0x10}, 0},
        {0xB5, 12, {0x1D, 0x1C, 0x1E, 0x0A, 0x15, 0x03, 0x11, 0x08, 0x1E, 0x01, 0x1E, 0x12}, 0},
        {0xB6, 7, {0x77, 0x77, 0x00, 0x0A, 0xFF, 0x0A, 0xFF}, 0},
        {0x86, 14, {0xC6, 0x04, 0xB1, 0x02, 0x58, 0x12, 0x58, 0x0C, 0x13, 0x01, 0xA5, 0x00, 0xA5, 0xA5}, 0},
        {0xB7, 16, {0x07, 0x0A, 0x0E, 0x06, 0x05, 0x03, 0x2B, 0x03, 0x03, 0x42, 0x07, 0x10, 0x10, 0x2E, 0x3F, 0x0D}, 0},
        {0xB8, 16, {0x07, 0x0A, 0x0D, 0x05, 0x05, 0x02, 0x2B, 0x02, 0x03, 0x42, 0x06, 0x10, 0x0F, 0x2E, 0x3F, 0x0D}, 0},
        {0xB9, 2, {0x23, 0x23}, 0},
        {0xBF, 6, {0x10, 0x14, 0x14, 0x0B, 0x0B, 0x0B}, 0},
        {0xF2, 1, {0x00}, 0},
        {0x73, 5, {0x04, 0xDA, 0x12, 0x54, 0x47}, 0},
        {0x77, 5, {0x6B, 0x5B, 0xFD, 0xC3, 0xC5}, 0},
        {0x7A, 2, {0x15, 0x27}, 0},
        {0x7B, 2, {0x04, 0x57}, 0},
        {0x7E, 2, {0x01, 0x0E}, 0},
        {0xBF, 1, {0x36}, 0},
        {0xE3, 2, {0x40, 0x40}, 0},
        {0xF0, 1, {0x00}, 0},
        {0xD0, 1, {0x00}, 0},
        {0x2A, 4, {0x00, 0x00, 0x01, 0x3F}, 0},
        {0x2B, 4, {0x00, 0x00, 0x01, 0xDF}, 0},
        {0x21, 0, {}, 0},      // INVON – dieses Panel braucht invertierte Farben
        {0x11, 0, {}, 120},    // SLPOUT
        {0x29, 0, {}, 0},      // DISPON
        {0x3A, 1, {0x55}, 0},  // COLMOD: RGB565
        {0x36, 1, {0x00}, 0},  // MADCTL
        {0x35, 1, {0x01}, 20}, // TEON
    };

    // Register schreiben: Befehl 0x02 + 24-Bit-Adresse (Register << 8), Daten einspurig.
    static void writeReg(uint8_t reg, const uint8_t *data, size_t len)
    {
        spi_transaction_ext_t t = {};
        t.base.flags = SPI_TRANS_VARIABLE_CMD | SPI_TRANS_VARIABLE_ADDR;
        t.base.cmd = 0x02;
        t.base.addr = (uint32_t)reg << 8;
        t.base.tx_buffer = len ? data : nullptr;
        t.base.length = len * 8;
        t.command_bits = 8;
        t.address_bits = 24;
        ESP_ERROR_CHECK(spi_device_polling_transmit(s_dev, &t.base));
    }

    static void setWindow(uint16_t x0, uint16_t y0, uint16_t x1, uint16_t y1)
    {
        const uint8_t col[] = {uint8_t(x0 >> 8), uint8_t(x0), uint8_t(x1 >> 8), uint8_t(x1)};
        const uint8_t row[] = {uint8_t(y0 >> 8), uint8_t(y0), uint8_t(y1 >> 8), uint8_t(y1)};
        writeReg(0x2A, col, sizeof(col));
        writeReg(0x2B, row, sizeof(row));
    }

    // Pixel schreiben: Befehl 0x32 (vierspurig), erst RAMWR (0x2C), dann RAMWRC (0x3C).
    static void writePixels(const uint16_t *px, size_t count, bool first)
    {
        spi_transaction_ext_t t = {};
        t.base.flags = SPI_TRANS_MODE_QIO | SPI_TRANS_VARIABLE_CMD | SPI_TRANS_VARIABLE_ADDR;
        t.base.cmd = 0x32;
        t.base.addr = (first ? 0x2C : 0x3C) << 8;
        t.base.tx_buffer = px;
        t.base.length = count * 16;
        t.command_bits = 8;
        t.address_bits = 24;
        ESP_ERROR_CHECK(spi_device_polling_transmit(s_dev, &t.base));
    }

    // Das Panel schreibt in 4-Pixel-Blöcken (Dual-Gate), deshalb x und w ausrichten.
    static bool clip(uint16_t &x, uint16_t &y, uint16_t &w, uint16_t &h)
    {
        if (x >= s_w || y >= s_h || w == 0 || h == 0)
            return false;
        if (x + w > s_w)
            w = s_w - x;
        if (y + h > s_h)
            h = s_h - y;
        uint16_t x1 = (x + w + 3) & ~3;
        x &= ~3;
        w = min<uint16_t>(x1, s_w) - x;
        return true;
    }

    void begin()
    {
        // Hintergrundbeleuchtung per PWM (20 kHz, unhörbar), zunächst aus
        ledcAttach(PIN_BL, 20000, 8);
        ledcWrite(PIN_BL, 0);

        spi_bus_config_t bus = {};
        bus.data0_io_num = PIN_D0;
        bus.data1_io_num = PIN_D1;
        bus.sclk_io_num = PIN_SCLK;
        bus.data2_io_num = PIN_D2;
        bus.data3_io_num = PIN_D3;
        bus.max_transfer_sz = CHUNK_PX * 2 + 8;
        bus.flags = SPICOMMON_BUSFLAG_MASTER | SPICOMMON_BUSFLAG_QUAD;
        ESP_ERROR_CHECK(spi_bus_initialize(SPI2_HOST, &bus, SPI_DMA_CH_AUTO));

        spi_device_interface_config_t dev = {};
        dev.mode = 0;
        dev.clock_speed_hz = SPI_HZ;
        dev.spics_io_num = PIN_CS;
        dev.flags = SPI_DEVICE_HALFDUPLEX;
        dev.queue_size = 4;
        ESP_ERROR_CHECK(spi_bus_add_device(SPI2_HOST, &dev, &s_dev));

        delay(120);
        for (const InitCmd &c : INIT_CMDS)
        {
            writeReg(c.cmd, c.data, c.len);
            if (c.delayMs)
                delay(c.delayMs);
        }

        fillScreen(BLACK);
        setBacklight(true);
    }

    void setRotation(uint8_t r)
    {
        // Das Panel ignoriert MX; Querformat daher über MV|MY (0xA0).
        uint8_t madctl = (r & 1) ? 0xA0 : 0x00;
        s_w = (r & 1) ? NATIVE_H : NATIVE_W;
        s_h = (r & 1) ? NATIVE_W : NATIVE_H;
        writeReg(0x36, &madctl, 1);
    }

    uint16_t width() { return s_w; }
    uint16_t height() { return s_h; }

    void fillRect(uint16_t x, uint16_t y, uint16_t w, uint16_t h, uint16_t color)
    {
        if (!clip(x, y, w, h))
            return;
        const uint16_t be = (color >> 8) | (color << 8);
        size_t total = (size_t)w * h;
        auto *buf = (uint16_t *)heap_caps_malloc(FILL_PX * 2, MALLOC_CAP_DMA | MALLOC_CAP_INTERNAL);
        if (!buf)
            return;
        for (size_t i = 0; i < FILL_PX; i++)
            buf[i] = be;

        setWindow(x, y, x + w - 1, y + h - 1);
        bool first = true;
        while (total)
        {
            size_t len = min(total, FILL_PX);
            writePixels(buf, len, first);
            first = false;
            total -= len;
        }
        free(buf);
    }

    void fillScreen(uint16_t color) { fillRect(0, 0, s_w, s_h, color); }

    void pushPixels(uint16_t x, uint16_t y, uint16_t w, uint16_t h, const uint16_t *pixels)
    {
        setWindow(x, y, x + w - 1, y + h - 1);
        size_t total = (size_t)w * h;
        bool first = true;
        while (total)
        {
            size_t len = min(total, CHUNK_PX);
            writePixels(pixels, len, first);
            pixels += len;
            first = false;
            total -= len;
        }
    }

    static uint8_t s_brightness = 100;

    void setBacklight(bool on) { ledcWrite(PIN_BL, on ? s_brightness * 255 / 100 : 0); }

    void setBrightness(uint8_t percent)
    {
        s_brightness = constrain(percent, 5, 100);
        setBacklight(true);
    }
}

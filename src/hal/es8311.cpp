// SPDX-FileCopyrightText: 2015-2022 Espressif Systems (Shanghai) CO LTD
// SPDX-License-Identifier: Apache-2.0
// Gekürzt und auf Arduino-Wire umgestellt.
#include "es8311.h"
#include <Wire.h>

namespace es8311
{
    static constexpr uint8_t ADDR = 0x18;

    enum Reg : uint8_t
    {
        RESET_00 = 0x00,
        CLK_01 = 0x01,
        CLK_02 = 0x02,
        CLK_03 = 0x03,
        CLK_04 = 0x04,
        CLK_05 = 0x05,
        CLK_06 = 0x06,
        CLK_07 = 0x07,
        CLK_08 = 0x08,
        SDPIN_09 = 0x09,
        SDPOUT_0A = 0x0A,
        SYS_0D = 0x0D,
        SYS_0E = 0x0E,
        SYS_12 = 0x12,
        SYS_13 = 0x13,
        ADC_1C = 0x1C,
        DAC_31 = 0x31,
        DAC_32 = 0x32,
        DAC_37 = 0x37,
    };

    static bool write(uint8_t reg, uint8_t val)
    {
        Wire.beginTransmission(ADDR);
        Wire.write(reg);
        Wire.write(val);
        return Wire.endTransmission() == 0;
    }

    static bool read(uint8_t reg, uint8_t &val)
    {
        Wire.beginTransmission(ADDR);
        Wire.write(reg);
        if (Wire.endTransmission(false) != 0 || Wire.requestFrom(ADDR, (uint8_t)1) != 1)
            return false;
        val = Wire.read();
        return true;
    }

    bool begin()
    {
        // Zurücksetzen und einschalten
        if (!write(RESET_00, 0x1F))
            return false;
        delay(20);
        write(RESET_00, 0x00);
        write(RESET_00, 0x80);

        // Takt: MCLK vom MCLK-Pin, alle Takte an
        write(CLK_01, 0x3F);
        uint8_t v;
        read(CLK_06, v);
        write(CLK_06, v & ~0x20); // SCLK nicht invertiert

        // Teiler für MCLK = 256 x fs (gleich für 44,1 und 48 kHz):
        // pre_div 1, mult 1x, adc/dac_div 1, single speed, lrck 0x00FF, bclk_div 4, osr 0x10
        read(CLK_02, v);
        write(CLK_02, v & 0x07);
        write(CLK_03, 0x10);
        write(CLK_04, 0x10);
        write(CLK_05, 0x00);
        read(CLK_06, v);
        write(CLK_06, (v & 0xE0) | (4 - 1));
        read(CLK_07, v);
        write(CLK_07, v & 0xC0);
        write(CLK_08, 0xFF);

        // Format: Slave, I2S, 16 Bit ein/aus
        read(RESET_00, v);
        write(RESET_00, v & 0xBF);
        write(SDPIN_09, 3 << 2);
        write(SDPOUT_0A, 3 << 2);

        // Analogteil und DAC einschalten
        write(SYS_0D, 0x01);
        write(SYS_0E, 0x02);
        write(SYS_12, 0x00);
        write(SYS_13, 0x10);
        write(ADC_1C, 0x6A);
        write(DAC_37, 0x08);
        return true;
    }

    void setVolume(uint8_t percent)
    {
        percent = min<uint8_t>(percent, 100);
        write(DAC_32, percent ? percent * 256 / 100 - 1 : 0);
    }

    void mute(bool on)
    {
        uint8_t v;
        if (!read(DAC_31, v))
            return;
        write(DAC_31, on ? (v | 0x60) : (v & ~0x60));
    }
}

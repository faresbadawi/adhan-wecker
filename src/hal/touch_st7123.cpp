#include "touch_st7123.h"
#include <Wire.h>

namespace touch
{
    static constexpr int PIN_SDA = 38;
    static constexpr int PIN_SCL = 39;
    static constexpr int PIN_RST = 48;
    static constexpr uint8_t ADDR = 0x55; // nicht 0x38 wie im Datenblatt

    static constexpr uint16_t REG_STATUS = 0x0001;
    static constexpr uint16_t REG_ADV_TOUCH_INFO = 0x0010; // Lesen löscht auch den INT-Pin
    static constexpr uint16_t REG_TOUCH_DATA = 0x0014;
    static constexpr uint8_t TOUCH_VALID = 0x80;
    static constexpr uint8_t COORD_HIGH_MASK = 0x3F;

    static constexpr int MAX_TOUCHES = 5; // vom Controller gemeldet (Register 0x0009)

    static bool readReg(uint16_t reg, uint8_t *buf, size_t len)
    {
        Wire.beginTransmission(ADDR);
        Wire.write(reg >> 8);
        Wire.write(reg & 0xFF);
        if (Wire.endTransmission(false) != 0)
            return false;
        if (Wire.requestFrom(ADDR, (uint8_t)len) != len)
            return false;
        for (size_t i = 0; i < len; i++)
            buf[i] = Wire.read();
        return true;
    }

    bool begin()
    {
        Wire.begin(PIN_SDA, PIN_SCL, 400000);

        // RESX ist low-aktiv; danach braucht der Controller bis zu 20 ms.
        pinMode(PIN_RST, OUTPUT);
        digitalWrite(PIN_RST, HIGH);
        delay(5);
        digitalWrite(PIN_RST, LOW);
        delay(5);
        digitalWrite(PIN_RST, HIGH);
        delay(100);

        // Der Controller antwortet nach dem Reset nicht immer sofort.
        uint8_t status;
        for (int i = 0; i < 20; i++)
        {
            if (readReg(REG_STATUS, &status, 1))
                return true;
            delay(50);
        }
        return false;
    }

    bool read(uint16_t &x, uint16_t &y)
    {
        // Ganze Tabelle lesen: Kopf (4 Bytes) + alle Punkte à 7 Bytes. Erst das vollständige
        // Lesen setzt die Meldung zurück; nur der erste Punkt bleibt sonst "gedrückt" hängen.
        uint8_t data[(REG_TOUCH_DATA - REG_ADV_TOUCH_INFO) + MAX_TOUCHES * 7];
        if (!readReg(REG_ADV_TOUCH_INFO, data, sizeof(data)))
            return false;
        const uint8_t *p = data + (REG_TOUCH_DATA - REG_ADV_TOUCH_INFO);
        if (!(p[0] & TOUCH_VALID))
            return false;
        x = ((p[0] & COORD_HIGH_MASK) << 8) | p[1];
        y = ((p[2] & COORD_HIGH_MASK) << 8) | p[3];
        return true;
    }
}

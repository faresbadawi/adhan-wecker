// Startbildschirm "Bilal": beim Einschalten kurz über allem, blendet danach sanft aus.
#pragma once
#include <stdint.h>

namespace splash
{
    // Widmung: eigenes Vollbild (480x320 RGB565), nur auf einzelnen Uhren vorhanden; erscheint nach dem Startbild
    constexpr const char *DEDICATION_PATH = "/ihda.bin";

    // Zeigt den Startbildschirm für ms Millisekunden (danach Ausblenden und Löschen)
    void show(uint32_t ms);
}

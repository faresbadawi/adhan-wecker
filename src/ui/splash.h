// Startbildschirm "Bilal": beim Einschalten kurz über allem, blendet danach sanft aus.
#pragma once
#include <stdint.h>

namespace splash
{
    // Zeigt den Startbildschirm für ms Millisekunden (danach Ausblenden und Löschen)
    void show(uint32_t ms);
}

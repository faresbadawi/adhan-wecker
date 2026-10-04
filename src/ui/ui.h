// Gerüst: Hintergrund und Seiten zum Wischen mit Seitenpunkten.
// Reihenfolge und Sichtbarkeit von Uhr, Gebetszeiten, Wetter und Kalender sind einstellbar;
// die Einstellungsseite steht immer am Ende und lässt sich nicht ausblenden.
#pragma once
#include <stdint.h>

namespace ui
{
    // Die ersten vier entsprechen settings::PageId
    enum Page
    {
        PAGE_CLOCK,
        PAGE_PRAYER, // Startseite
        PAGE_WEATHER,
        PAGE_CALENDAR,
        PAGE_SETTINGS,
        PAGE_COUNT
    };

    void begin(const char *city);

    // order: die vier Seiten von links nach rechts, visible: je Seite (Index = Page) sichtbar
    void setPages(const uint8_t order[4], const bool visible[4]);

    // Zeigt die Seite, falls sichtbar
    void showPage(Page p);

    // Bildschirmfoto inkl. Overlays als RGB565 (big-endian, LV_COLOR_16_SWAP) in einen PSRAM-Puffer.
    // Der Aufrufer gibt buf mit free() frei. Nur aus dem LVGL-Task (loop) aufrufen.
    uint8_t *snapshot(uint32_t &size, uint16_t &w, uint16_t &h);
}

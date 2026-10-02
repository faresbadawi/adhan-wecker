// Sprache der Anzeige (Arabisch, Deutsch, Englisch). Wird beim Start aus dem NVS gelesen;
// ein Wechsel über die Web-App startet die Uhr neu, damit alle Seiten neu aufgebaut werden.
#pragma once
#include <lvgl.h>
#include "assets/texts.h"

namespace lang
{
    enum class Lang : uint8_t { AR, DE, EN }; // Reihenfolge wie LANGS in tools/gen_assets.py

    void begin();
    Lang get();
    const char *code(); // "ar", "de", "en"
    bool rtl();         // Arabisch: von rechts nach links

    // Fester Text als Bild in der aktuellen Sprache
    const lv_img_dsc_t *text(int id);

    // Gespeicherte Sprache ändern (wirkt nach dem nächsten Start); false bei unbekanntem Code
    bool save(const char *code);
}

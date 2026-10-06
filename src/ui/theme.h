// Farben, Schriften und kleine Bausteine, die alle Bildschirme gemeinsam nutzen.
#pragma once
#include <Arduino.h>
#include <lvgl.h>
#include "model.h"
#include "lang.h"

extern "C"
{
    LV_FONT_DECLARE(font_clock_130);
    LV_FONT_DECLARE(font_clock_64);
    LV_FONT_DECLARE(font_temp_64);
    LV_FONT_DECLARE(font_josefin_20);
    LV_FONT_DECLARE(font_count_52);
    LV_FONT_DECLARE(font_temp_30);
    LV_FONT_DECLARE(font_josefin_25);
    LV_FONT_DECLARE(font_josefin_17);
}

namespace theme
{
    constexpr lv_coord_t SCREEN_W = 480;
    constexpr lv_coord_t SCREEN_H = 320;
    constexpr lv_coord_t MARGIN = 24;

    // Hintergrund dunkler Karten und Overlays
    inline lv_color_t black() { return lv_color_hex(0x040607); }

    // Drei Farbgruppen, über die Weboberfläche änderbar. Jedes Element gehört genau einer an.
    enum class Role : uint8_t
    {
        MAIN,   // Hauptschrift: Uhr, Zeiten, Werte
        ACCENT, // Akzent: Titel, Gebetsnamen, Symbole, Linien, Hervorhebungen
        MUTED,  // Nebenschrift: Beschriftungen, Datum, Hinweise
    };

    // Stile anlegen (vor dem Aufbau der Oberfläche) und Farben ändern (wirkt sofort überall)
    void begin();
    void setPalette(uint32_t main, uint32_t accent, uint32_t muted);

    // Element einer Farbgruppe zuordnen (ersetzt eine vorherige Zuordnung)
    void setRole(lv_obj_t *obj, Role role);

    // Label in Schrift und Farbgruppe
    lv_obj_t *label(lv_obj_t *parent, const lv_font_t *font, Role role, const char *text = "");

    // Bild (weiß erzeugt, wird in der Farbgruppe eingefärbt); src darf nullptr sein
    lv_obj_t *image(lv_obj_t *parent, const lv_img_dsc_t *src, Role role);

    // Hintergrundbild für Bildschirm und Overlays; lädt /bg/<name>.bin aus dem LittleFS in den PSRAM.
    // Alle mit background() erzeugten Bilder wechseln mit.
    lv_obj_t *background(lv_obj_t *parent);
    bool setBackground(const char *name);

    // Unsichtbarer Container ohne Stil, Scrollen und Klicks
    lv_obj_t *box(lv_obj_t *parent);

    // Goldene Linie (2 px) mit Raute in der Mitte
    void divider(lv_obj_t *parent, lv_coord_t cx, lv_coord_t y, lv_coord_t halfWidth);

    // Wettersymbol (Bild, gold) passend zu Himmel und Tageszeit; klein 34 px, groß 112 px
    const lv_img_dsc_t *weatherIcon(model::Sky sky, bool isDay, bool large);
    // Wetterbeschreibung in der Anzeigesprache
    const lv_img_dsc_t *skyText(model::Sky sky);
    // Wochentag (tm_wday 0..6) und Hijri-Monat (1..12)
    const lv_img_dsc_t *weekday(int wday);
    const lv_img_dsc_t *hijriMonth(int month);
    const lv_img_dsc_t *hijriMonthSmall(int month);
    // Kalender: Wochentag kurz (tm_wday 0..6), gregorianischer Monat (1..12)
    const lv_img_dsc_t *weekdayShort(int wday);
    const lv_img_dsc_t *gregMonth(int month);

    // Name eines Gebets (klein: Zeile, groß: Azan und nächstes Gebet)
    const lv_img_dsc_t *prayerName(model::Prayer p, bool large);

    // An der Anfangsseite der Sprache ausrichten: Arabisch rechts, sonst links (x = Abstand zum Rand)
    void alignStart(lv_obj_t *obj, lv_coord_t x, lv_coord_t y);
}

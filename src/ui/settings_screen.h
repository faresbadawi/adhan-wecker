// Seite "Einstellungen" (immer die letzte): WLAN-Status und QR-Code zur Weboberfläche.
#pragma once
#include <lvgl.h>
#include "model.h"

namespace settings_screen
{
    void create(lv_obj_t *parent);

    // WLAN-Status und Adresse der Weboberfläche (leer = nicht verbunden); jede Sekunde aufrufen
    void setWifi(const model::WifiInfo &w, const char *url);
}

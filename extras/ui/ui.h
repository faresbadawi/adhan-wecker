// Gerüst der Oberfläche: Hintergrund, zwei Bildschirme zum Wischen (Home, Wetter),
// WLAN-Symbol und Seitenpunkte auf der obersten Ebene, Azan-Overlay darüber.
#pragma once
#include "model.h"
#include "ui/azan_screen.h"

namespace ui
{
    enum Page
    {
        PAGE_HOME,
        PAGE_WEATHER
    };

    void begin(const char *location, const char *apName, azan_screen::Callback onMute, azan_screen::Callback onSkip);

    void showPage(Page p);
    void setWifi(const model::WifiInfo &w);
}

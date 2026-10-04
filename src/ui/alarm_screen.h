// Wecker-Fenster: liegt über allen Seiten, Antippen stoppt den Wecker.
#pragma once
#include <lvgl.h>

namespace alarm_screen
{
    void create(void (*onStop)());
    // name: Name des Weckers (leer = "Wecker"), arabisch oder lateinisch
    void show(bool on, int hour, int minute, const char *name = "");
}

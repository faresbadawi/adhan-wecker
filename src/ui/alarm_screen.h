// Wecker-Fenster: liegt über allen Seiten, Antippen stoppt den Wecker.
// Darunter vier kleine Tasten zum Schlummern (5, 10, 15, 30 Minuten).
#pragma once
#include <lvgl.h>

namespace alarm_screen
{
    void create(void (*onStop)(), void (*onSnooze)(int minutes));
    // name: Name des Weckers (leer = "Wecker"), arabisch oder lateinisch
    void show(bool on, int hour, int minute, const char *name = "");
}

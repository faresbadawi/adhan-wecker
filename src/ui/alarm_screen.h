// Wecker-Fenster: liegt über allen Seiten, Antippen stoppt den Wecker.
#pragma once
#include <lvgl.h>

namespace alarm_screen
{
    void create(void (*onStop)());
    void show(bool on, int hour, int minute);
}

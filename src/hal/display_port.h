// Verbindet LVGL mit Display (ST77922) und Touch, im Querformat 480x320.
#pragma once
#include <lvgl.h>

namespace display
{
    constexpr uint16_t WIDTH = 480;
    constexpr uint16_t HEIGHT = 320;

    // Initialisiert Panel, Touch und LVGL. Gibt false zurück, wenn der Touch nicht antwortet.
    bool begin();
}

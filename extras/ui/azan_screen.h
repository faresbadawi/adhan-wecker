// Azan-Overlay: liegt über allem (lv_layer_top) und fängt alle Touches ab,
// damit während des Azans nicht gewischt werden kann. "Stumm" und "Überspringen"
// melden sich über Callbacks; die Logik dahinter liegt im azan_controller.
#pragma once
#include <lvgl.h>
#include <time.h>
#include "services/azan_controller.h"

namespace azan_screen
{
    using Callback = void (*)();

    void create(Callback onMute, Callback onSkip);

    // Overlay passend zum Status zeigen/aktualisieren oder ausblenden.
    void update(const azan::Status &s, const struct tm &now);
    bool visible();
}

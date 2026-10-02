// Fenster des Sprachassistenten: Zuhören, Nachdenken, Frage und Antwort als Text.
// Liegt über allen Seiten; Antippen schließt es (bzw. bricht ab).
#pragma once
#include <lvgl.h>
#include "services/assistant.h"

namespace assistant_screen
{
    void create(void (*onTap)());
    void update(const assistant::Status &s);
}

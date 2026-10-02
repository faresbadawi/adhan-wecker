// WLAN: verbindet sich mit dem gespeicherten Netz, sonst öffnet es ein Einrichtungsportal.
// Alles nicht blockierend; update() regelmäßig aus loop() aufrufen.
#pragma once
#include "model.h"

namespace wifimgr
{
    void begin(const char *apName);
    void update();
    model::WifiInfo info();
}

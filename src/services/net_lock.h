// Sorgt dafür, dass immer nur ein Dienst gleichzeitig ins Internet geht.
// Gleichzeitige DNS-Abfragen aus zwei Tasks lösen im Arduino-Core 3.3 einen Absturz aus
// (dns_clear_cache -> udp_remove ohne TCPIP-Sperre); nebenbei bleibt mehr RAM für TLS.
#pragma once
#include <Arduino.h>

namespace netlock
{
    inline SemaphoreHandle_t handle()
    {
        static SemaphoreHandle_t m = xSemaphoreCreateMutex();
        return m;
    }

    // Sperre für die Dauer eines Gültigkeitsbereichs
    struct Guard
    {
        Guard() { xSemaphoreTake(handle(), portMAX_DELAY); }
        ~Guard() { xSemaphoreGive(handle()); }
    };
}

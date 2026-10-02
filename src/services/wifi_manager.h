// WLAN: verbindet sich mit dem gespeicherten Netz, sonst öffnet es ein Einrichtungsportal.
// Alles nicht blockierend; update() regelmäßig aus loop() aufrufen.
#pragma once
#include <Arduino.h>
#include "model.h"

namespace wifimgr
{
    void begin(const char *apName);
    void update();
    model::WifiInfo info();

    // Gefundenes Netz bei der Suche
    struct Network
    {
        char ssid[33];
        int8_t bars; // 1..4
        bool secure;
    };
    // Netze in der Umgebung (blockiert 2-4 s), stärkste zuerst, Duplikate entfernt
    int scan(Network *out, int max);

    // In ein anderes Netz wechseln (läuft im nächsten update(); Zugangsdaten werden gespeichert)
    void connect(const String &ssid, const String &password);

    // Gespeicherte WLAN-Zugangsdaten löschen (nach einem Neustart öffnet sich das Einrichtungsportal)
    void forget();
}

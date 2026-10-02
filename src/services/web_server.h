// Lokale Weboberfläche zur Konfiguration: http://azan-clock.local oder über die IP-Adresse.
// Liefert /www/index.html aus dem LittleFS und die Einstellungen als JSON (/api/settings).
#pragma once

namespace web
{
    // Regelmäßig aus loop() aufrufen. Startet den Server, sobald WLAN verbunden ist.
    void update();

    // Adresse der Konfigurationsseite (leer, solange der Server nicht läuft)
    const char *url();
}

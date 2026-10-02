#include "wifi_manager.h"
#include <WiFi.h>
#include <WiFiManager.h>

namespace wifimgr
{
    static constexpr uint32_t CONNECT_TIMEOUT_MS = 20000;

    static WiFiManager s_wm;
    static const char *s_apName = "";
    static uint32_t s_connectStart = 0;
    static bool s_portal = false;

    static void startPortal()
    {
        Serial.printf("WLAN: Einrichtungsportal \"%s\" geoeffnet (http://192.168.4.1)\n", s_apName);
        s_wm.startConfigPortal(s_apName);
        s_portal = true;
    }

    void begin(const char *apName)
    {
        s_apName = apName;
        WiFi.mode(WIFI_STA);
        WiFi.setAutoReconnect(true);

        s_wm.setConfigPortalBlocking(false);
        s_wm.setTitle("Adhan-Wecker");
        s_wm.setDebugOutput(false);

        if (s_wm.getWiFiIsSaved())
        {
            WiFi.begin(); // gespeicherte Zugangsdaten, kehrt sofort zurück
            s_connectStart = millis();
        }
        else
        {
            startPortal();
        }
    }

    void update()
    {
        if (s_portal)
        {
            s_wm.process();
            if (WiFi.status() == WL_CONNECTED)
            {
                Serial.printf("WLAN: verbunden mit %s\n", WiFi.SSID().c_str());
                s_wm.stopConfigPortal();
                WiFi.mode(WIFI_STA);
                s_portal = false;
            }
            return;
        }

        // Gespeichertes Netz nicht erreichbar -> Portal öffnen (Verbindungsversuche laufen weiter)
        if (s_connectStart && WiFi.status() != WL_CONNECTED && millis() - s_connectStart > CONNECT_TIMEOUT_MS)
        {
            s_connectStart = 0;
            startPortal();
        }
        if (WiFi.status() == WL_CONNECTED)
            s_connectStart = 0;
    }

    model::WifiInfo info()
    {
        model::WifiInfo i;
        i.portalActive = s_portal;
        i.connected = WiFi.status() == WL_CONNECTED;
        if (i.connected)
        {
            const int rssi = WiFi.RSSI();
            i.bars = rssi > -55 ? 4 : rssi > -65 ? 3 : rssi > -75 ? 2 : 1;
            strlcpy(i.ssid, WiFi.SSID().c_str(), sizeof(i.ssid));
        }
        return i;
    }
}

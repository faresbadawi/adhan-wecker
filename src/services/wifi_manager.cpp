#include "wifi_manager.h"
#include <WiFi.h>
#include <WiFiManager.h>
#include "extra/libs/qrcode/qrcodegen.h"
#include "web_server.h"

namespace wifimgr
{
    static constexpr uint32_t CONNECT_TIMEOUT_MS = 20000;

    static WiFiManager s_wm;
    static const char *s_apName = "";
    static uint32_t s_connectStart = 0;
    static bool s_portal = false;
    static String s_pendingSsid, s_pendingPass; // Wechsel in ein anderes Netz, ausgeführt in update()
    static bool s_pending = false;

    // QR-Code als SVG (dunkle Module auf weißem Grund mit Rand); leer, wenn der Text nicht passt
    static String qrSvg(const String &text)
    {
        static uint8_t qr[qrcodegen_BUFFER_LEN_FOR_VERSION(12)], tmp[qrcodegen_BUFFER_LEN_FOR_VERSION(12)];
        if (!qrcodegen_encodeText(text.c_str(), tmp, qr, qrcodegen_Ecc_MEDIUM, qrcodegen_VERSION_MIN, 12, qrcodegen_Mask_AUTO, true))
            return "";
        const int n = qrcodegen_getSize(qr);
        String svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='-3 -3 " + String(n + 6) + " " + String(n + 6) +
                     "' shape-rendering='crispEdges'><rect x='-3' y='-3' width='" + String(n + 6) + "' height='" + String(n + 6) +
                     "' fill='#fff'/><path fill='#000' d='";
        for (int y = 0; y < n; y++)
            for (int x = 0; x < n; x++)
                if (qrcodegen_getModule(qr, x, y))
                    svg += "M" + String(x) + " " + String(y) + "h1v1h-1z";
        svg += "'/></svg>";
        return svg;
    }

    // QR-Code zur App-Download-Adresse als Bild für die Seiten des Einrichtungsportals
    static void handleQr()
    {
        const String svg = qrSvg(web::appUrl());
        if (svg.isEmpty())
        {
            s_wm.server->send(404, "text/plain", "kein QR-Code");
            return;
        }
        s_wm.server->send(200, "image/svg+xml", svg);
    }

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
        s_wm.setWebServerCallback([] { s_wm.server->on("/qr.svg", handleQr); });
        s_wm.setTitle("Bilal");
        // Einrichtungsseite schlicht halten: nur "Netz wählen" (Texte arabisch, siehe include/wm_strings_ar.h)
        static std::vector<const char *> menu = {}; // der Knopf "Netz wählen" steht in der Startseite selbst (HTTP_ROOT_MAIN)
        s_wm.setMenu(menu);
        s_wm.setScanDispPerc(false);
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
        if (s_pending)
        {
            s_pending = false;
            Serial.printf("WLAN: wechsle zu %s\n", s_pendingSsid.c_str());
            if (s_portal)
            {
                s_wm.stopConfigPortal();
                s_portal = false;
            }
            WiFi.mode(WIFI_STA);
            WiFi.disconnect();
            WiFi.begin(s_pendingSsid.c_str(), s_pendingPass.c_str()); // wird dauerhaft gespeichert
            s_pendingPass = "";
            s_connectStart = millis(); // klappt es nicht, öffnet sich nach 20 s das Einrichtungsportal
        }

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

    void connect(const String &ssid, const String &password)
    {
        s_pendingSsid = ssid;
        s_pendingPass = password;
        s_pending = true;
    }

    int scan(Network *out, int max)
    {
        const int n = WiFi.scanNetworks();
        int count = 0;
        for (int i = 0; i < n && count < max; i++)
        {
            const String ssid = WiFi.SSID(i);
            if (ssid.isEmpty())
                continue;
            bool dup = false; // gleiche SSID mehrfach (mehrere Zugangspunkte): stärksten behalten
            for (int k = 0; k < count && !dup; k++)
                dup = strcmp(out[k].ssid, ssid.c_str()) == 0;
            if (dup)
                continue;
            strlcpy(out[count].ssid, ssid.c_str(), sizeof(out[count].ssid));
            const int rssi = WiFi.RSSI(i);
            out[count].bars = rssi > -55 ? 4 : rssi > -65 ? 3 : rssi > -75 ? 2 : 1;
            out[count].secure = WiFi.encryptionType(i) != WIFI_AUTH_OPEN;
            count++;
        }
        WiFi.scanDelete();
        return count;
    }

    void forget()
    {
        s_wm.resetSettings(); // gespeicherte Zugangsdaten löschen
    }
}

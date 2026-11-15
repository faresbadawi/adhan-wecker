#include "fleet.h"
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <esp_random.h>
#include "config.h"
#include "net_lock.h"
#include "selfupdate.h"
#include "settings.h"

namespace fleet
{
    static constexpr uint32_t INTERVAL_MS = 10 * 60 * 1000;
    static SemaphoreHandle_t s_lock;
    static String s_name, s_url, s_secret;
    static int8_t s_enabled = -1;
    static uint32_t s_lastOk = 0;
    static volatile bool s_now = false; // sofort melden (z. B. nach Namensänderung)

    String id()
    {
        char buf[13];
        snprintf(buf, sizeof(buf), "%012llx", (unsigned long long)ESP.getEfuseMac());
        return buf;
    }

    static String readStr(const char *key)
    {
        Preferences p;
        p.begin("fleet", true);
        String v = p.getString(key, "");
        p.end();
        return v;
    }
    static void writeStr(const char *key, const String &v)
    {
        Preferences p;
        p.begin("fleet", false);
        p.putString(key, v);
        p.end();
    }

    bool enabled()
    {
        if (s_enabled < 0)
        {
            Preferences p;
            p.begin("fleet", true);
            s_enabled = p.getBool("on", true) ? 1 : 0;
            p.end();
        }
        return s_enabled == 1;
    }
    void setEnabled(bool on)
    {
        Preferences p;
        p.begin("fleet", false);
        p.putBool("on", on);
        p.end();
        s_enabled = on ? 1 : 0;
        if (on)
            s_now = true;
    }

    String name()
    {
        xSemaphoreTake(s_lock, portMAX_DELAY);
        String n = s_name;
        xSemaphoreGive(s_lock);
        if (!n.length())
        {
            const String i = id();
            // die vorderen Stellen sind je Uhr verschieden; die hinteren sind die Herstellerkennung (bei allen gleich)
            n = "Bilal-" + i.substring(0, 4);
            n.toUpperCase();
            n.replace("BILAL", "Bilal");
        }
        return n;
    }
    void setName(const char *name)
    {
        String n = name ? name : "";
        n.trim();
        if (n.length() > 40)
            n = n.substring(0, 40);
        xSemaphoreTake(s_lock, portMAX_DELAY);
        s_name = n;
        xSemaphoreGive(s_lock);
        writeStr("name", n);
        s_now = true;
    }

    void setUrl(const char *url)
    {
        String u = url ? url : "";
        if (!u.startsWith("https://"))
            return;
        xSemaphoreTake(s_lock, portMAX_DELAY);
        const bool changed = u != s_url;
        s_url = u;
        xSemaphoreGive(s_lock);
        if (changed)
        {
            writeStr("url", u);
            s_now = true;
        }
    }

    uint32_t lastContactAgoSec() { return s_lastOk ? (millis() - s_lastOk) / 1000 : 0; }

    // Meldung an die Zentrale; Antwort {"update":true} startet ein Update
    static void report()
    {
        xSemaphoreTake(s_lock, portMAX_DELAY);
        const String url = s_url;
        xSemaphoreGive(s_lock);
        if (!url.length())
            return;
        const settings::Settings st = settings::get();
        JsonDocument doc;
        doc["id"] = id();
        doc["secret"] = s_secret;
        doc["name"] = name();
        doc["city"] = st.city;
        doc["country"] = st.country;
        doc["version"] = FW_VERSION;
        doc["build"] = FW_BUILD;
        doc["uptime"] = millis() / 1000;
        doc["rssi"] = WiFi.RSSI();
        String body;
        serializeJson(doc, body);

        String resp;
        int code;
        {
            netlock::Guard net;
            WiFiClientSecure client;
            client.setInsecure();
            HTTPClient http;
            http.setTimeout(15000);
            if (!http.begin(client, url + "/api/hello"))
                return;
            http.addHeader("Content-Type", "application/json");
            code = http.POST(body);
            if (code == 200)
                resp = http.getString();
            http.end();
        }
        if (code != 200)
        {
            Serial.printf("Zentrale: HTTP %d\n", code);
            return;
        }
        s_lastOk = millis();
        JsonDocument in;
        if (!deserializeJson(in, resp) && (in["update"] | false))
        {
            Serial.println("Zentrale: Update angefordert");
            selfupdate::requestInstall();
        }
    }

    static void task(void *)
    {
        vTaskDelay(pdMS_TO_TICKS(60 * 1000));
        uint32_t last = 0;
        bool first = true;
        for (;;)
        {
            vTaskDelay(pdMS_TO_TICKS(1000));
            if (!enabled() || WiFi.status() != WL_CONNECTED)
                continue;
            if (first || s_now || millis() - last > INTERVAL_MS)
            {
                first = false;
                s_now = false;
                last = millis();
                report();
            }
        }
    }

    void begin()
    {
        s_lock = xSemaphoreCreateMutex();
        s_name = readStr("name");
        s_url = readStr("url");
        s_secret = readStr("secret");
        if (s_secret.length() != 32)
        {
            // eigenes Geheimnis der Uhr: nur sie kann ihren Eintrag in der Zentrale ändern
            char buf[33];
            for (int i = 0; i < 16; i++)
                snprintf(buf + 2 * i, 3, "%02x", (unsigned)(esp_random() & 0xFF));
            s_secret = buf;
            writeStr("secret", s_secret);
        }
        xTaskCreatePinnedToCore(task, "fleet", 8192, nullptr, 1, nullptr, 0);
    }
}

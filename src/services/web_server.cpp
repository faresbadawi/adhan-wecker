#include "web_server.h"
#include <ArduinoJson.h>
#include <ESPmDNS.h>
#include <LittleFS.h>
#include <WebServer.h>
#include <WiFi.h>
#include "audio_manager.h"
#include "azan_controller.h"
#include "mawaqit.h"
#include "settings.h"
#include "wifi_manager.h"

namespace web
{
    static constexpr const char *HOSTNAME = "azan-clock";

    static WebServer s_server(80);
    static bool s_running = false;
    static char s_url[40] = "";

    static const char *AZAN_KEYS[5] = {"fajr", "dhuhr", "asr", "maghrib", "isha"};
    // Index = settings::PageId
    static const char *PAGE_KEYS[settings::PAGE_ID_COUNT] = {"clock", "prayer", "weather", "calendar"};

    static bool *pageVisible(settings::Settings &st, int id)
    {
        switch (id)
        {
        case settings::PAGE_ID_CLOCK: return &st.showClock;
        case settings::PAGE_ID_PRAYER: return &st.showPrayerTimes;
        case settings::PAGE_ID_WEATHER: return &st.showWeather;
        default: return &st.showCalendar;
        }
    }

    static String toHex(uint32_t c)
    {
        char buf[8];
        snprintf(buf, sizeof(buf), "#%06lX", (unsigned long)(c & 0xFFFFFF));
        return buf;
    }

    static uint32_t fromHex(const char *s, uint32_t fallback)
    {
        if (!s || s[0] != '#' || strlen(s) != 7)
            return fallback;
        return strtoul(s + 1, nullptr, 16);
    }

    static void sendSettings()
    {
        settings::Settings st = settings::get();
        JsonDocument doc;
        doc["city"] = st.city;
        doc["country"] = st.country;
        doc["latitude"] = st.latitude;
        doc["longitude"] = st.longitude;
        doc["method"] = st.calculationMethod;
        doc["madhhab"] = st.madhhab;
        JsonObject off = doc["offsets"].to<JsonObject>();
        off["fajr"] = st.fajrOffset;
        off["dhuhr"] = st.dhuhrOffset;
        off["asr"] = st.asrOffset;
        off["maghrib"] = st.maghribOffset;
        off["isha"] = st.ishaOffset;

        JsonObject az = doc["azan"].to<JsonObject>();
        for (int i = 0; i < 5; i++)
            az[AZAN_KEYS[i]] = st.azanEnabled[i];
        doc["volume"] = st.volume;
        doc["brightness"] = st.brightness;
        doc["background"] = st.background;
        JsonObject col = doc["colors"].to<JsonObject>();
        col["main"] = toHex(st.colorMain);
        col["accent"] = toHex(st.colorAccent);
        col["muted"] = toHex(st.colorMuted);

        // Wecker: [{"on":true,"time":"06:30","days":127}] (days: Bit 0 = Sonntag)
        JsonArray alarms = doc["alarms"].to<JsonArray>();
        for (int i = 0; i < st.alarmCount; i++)
        {
            char t[6];
            snprintf(t, sizeof(t), "%02d:%02d", st.alarms[i].hour, st.alarms[i].minute);
            JsonObject a = alarms.add<JsonObject>();
            a["on"] = st.alarms[i].enabled;
            a["time"] = t;
            a["days"] = st.alarms[i].days;
        }

        doc["source"] = st.prayerSource == settings::SOURCE_MAWAQIT ? "mawaqit" : "calculated";
        doc["mawaqit"]["slug"] = st.mawaqitSlug;
        doc["mawaqit"]["name"] = st.mawaqitName;

        // Seiten in Reihenfolge: [{"id":"prayer","on":true}, ...]
        JsonArray pages = doc["pages"].to<JsonArray>();
        for (int i = 0; i < settings::PAGE_ID_COUNT; i++)
        {
            JsonObject p = pages.add<JsonObject>();
            p["id"] = PAGE_KEYS[st.pageOrder[i]];
            p["on"] = *pageVisible(st, st.pageOrder[i]);
        }
        String out;
        serializeJson(doc, out);
        s_server.send(200, "application/json", out);
    }

    static void receiveSettings()
    {
        JsonDocument doc;
        if (deserializeJson(doc, s_server.arg("plain")))
        {
            s_server.send(400, "application/json", "{\"error\":\"json\"}");
            return;
        }

        // Nur übergebene Felder ändern, der Rest bleibt
        settings::Settings st = settings::get();
        if (doc["city"].is<const char *>())
            strlcpy(st.city, doc["city"], sizeof(st.city));
        if (doc["country"].is<const char *>())
            strlcpy(st.country, doc["country"], sizeof(st.country));
        st.latitude = doc["latitude"] | st.latitude;
        st.longitude = doc["longitude"] | st.longitude;
        st.calculationMethod = doc["method"] | st.calculationMethod;
        st.madhhab = doc["madhhab"] | st.madhhab;
        JsonObject off = doc["offsets"];
        st.fajrOffset = off["fajr"] | st.fajrOffset;
        st.dhuhrOffset = off["dhuhr"] | st.dhuhrOffset;
        st.asrOffset = off["asr"] | st.asrOffset;
        st.maghribOffset = off["maghrib"] | st.maghribOffset;
        st.ishaOffset = off["isha"] | st.ishaOffset;

        JsonObject az = doc["azan"];
        for (int i = 0; i < 5; i++)
            st.azanEnabled[i] = az[AZAN_KEYS[i]] | st.azanEnabled[i];
        st.volume = doc["volume"] | st.volume;
        st.brightness = doc["brightness"] | st.brightness;
        if (doc["background"].is<const char *>())
            strlcpy(st.background, doc["background"], sizeof(st.background));
        JsonObject col = doc["colors"];
        st.colorMain = fromHex(col["main"], st.colorMain);
        st.colorAccent = fromHex(col["accent"], st.colorAccent);
        st.colorMuted = fromHex(col["muted"], st.colorMuted);

        // Wecker: vollständige Liste ersetzt die bisherige
        if (doc["alarms"].is<JsonArray>())
        {
            JsonArray alarms = doc["alarms"];
            if (alarms.size() > settings::MAX_ALARMS)
            {
                s_server.send(400, "application/json", "{\"error\":\"alarms\"}");
                return;
            }
            st.alarmCount = alarms.size();
            for (int i = 0; i < st.alarmCount; i++)
            {
                const char *t = alarms[i]["time"] | "00:00";
                st.alarms[i].enabled = alarms[i]["on"] | true;
                st.alarms[i].hour = atoi(t);
                st.alarms[i].minute = strlen(t) >= 5 ? atoi(t + 3) : 0;
                st.alarms[i].days = alarms[i]["days"] | 0x7F;
            }
        }

        if (doc["source"].is<const char *>())
            st.prayerSource = strcmp(doc["source"], "mawaqit") == 0 ? settings::SOURCE_MAWAQIT
                                                                    : settings::SOURCE_CALCULATED;
        if (doc["mawaqit"]["slug"].is<const char *>())
            strlcpy(st.mawaqitSlug, doc["mawaqit"]["slug"], sizeof(st.mawaqitSlug));
        if (doc["mawaqit"]["name"].is<const char *>())
            strlcpy(st.mawaqitName, doc["mawaqit"]["name"], sizeof(st.mawaqitName));
        if (st.prayerSource == settings::SOURCE_MAWAQIT && !st.mawaqitSlug[0])
        {
            s_server.send(400, "application/json", "{\"error\":\"mosque\"}");
            return;
        }

        // Seiten: vollständige Liste in neuer Reihenfolge (unbekannte IDs ignorieren)
        JsonArray pages = doc["pages"];
        if (pages.size() == settings::PAGE_ID_COUNT)
        {
            for (int i = 0; i < settings::PAGE_ID_COUNT; i++)
            {
                const char *key = pages[i]["id"] | "";
                for (int id = 0; id < settings::PAGE_ID_COUNT; id++)
                {
                    if (strcmp(key, PAGE_KEYS[id]) == 0)
                    {
                        st.pageOrder[i] = id;
                        *pageVisible(st, id) = pages[i]["on"] | true;
                    }
                }
            }
        }

        if (!settings::set(st))
        {
            s_server.send(400, "application/json", "{\"error\":\"invalid\"}");
            return;
        }
        Serial.printf("Web: Einstellungen gespeichert (%s)\n", st.city);
        sendSettings();
    }

    // Verfügbare Hintergründe: /bg/<name>.bin im LittleFS
    static void sendBackgrounds()
    {
        JsonDocument doc;
        JsonArray list = doc.to<JsonArray>();
        File dir = LittleFS.open("/bg");
        for (File f = dir.openNextFile(); f; f = dir.openNextFile())
        {
            String name = f.name();
            if (name.endsWith(".bin"))
                list.add(name.substring(0, name.length() - 4));
        }
        String out;
        serializeJson(doc, out);
        s_server.send(200, "application/json", out);
    }

    // Moscheesuche auf Mawaqit (der Browser darf Mawaqit wegen CORS nicht direkt abfragen)
    static void searchMosques()
    {
        const settings::Settings st = settings::get();
        String out;
        if (!mawaqit::search(s_server.arg("q").c_str(), st.latitude, st.longitude, out))
        {
            s_server.send(502, "application/json", "{\"error\":\"mawaqit\"}");
            return;
        }
        s_server.send(200, "application/json", out);
    }

    // Wecktöne: /sounds/<name>.mp3; der gewählte liegt als /alarm.mp3, sein Name in /alarm.txt
    static bool validSound(const String &name)
    {
        if (name.isEmpty() || name.length() > 20 || name.indexOf('/') >= 0 || name.indexOf('.') >= 0)
            return false;
        return LittleFS.exists("/sounds/" + name + ".mp3");
    }

    static void sendSounds()
    {
        JsonDocument doc;
        JsonArray list = doc["list"].to<JsonArray>();
        File dir = LittleFS.open("/sounds");
        for (File f = dir.openNextFile(); f; f = dir.openNextFile())
        {
            String name = f.name();
            if (name.endsWith(".mp3"))
                list.add(name.substring(0, name.length() - 4));
        }
        File sel = LittleFS.open("/alarm.txt", "r");
        doc["selected"] = sel ? sel.readString() : "";
        String out;
        serializeJson(doc, out);
        s_server.send(200, "application/json", out);
    }

    static String soundArg()
    {
        JsonDocument doc;
        deserializeJson(doc, s_server.arg("plain"));
        return String(doc["name"] | "");
    }

    // Ton zum Anhören abspielen (nicht während eines Azans)
    static void previewSound()
    {
        const String name = soundArg();
        if (!validSound(name) || azan::status().state != azan::State::IDLE)
        {
            s_server.send(400, "application/json", "{\"error\":\"sound\"}");
            return;
        }
        static char path[40];
        snprintf(path, sizeof(path), "/sounds/%s.mp3", name.c_str());
        audio::play(LittleFS, path);
        s_server.send(200, "application/json", "{}");
    }

    // Ton als Weckton übernehmen: nach /alarm.mp3 kopieren
    static void selectSound()
    {
        const String name = soundArg();
        if (!validSound(name))
        {
            s_server.send(400, "application/json", "{\"error\":\"sound\"}");
            return;
        }
        File in = LittleFS.open("/sounds/" + name + ".mp3", "r");
        File out = LittleFS.open("/alarm.mp3", "w");
        uint8_t buf[1024];
        bool ok = in && out;
        while (ok && in.available())
        {
            const size_t n = in.read(buf, sizeof(buf));
            ok = out.write(buf, n) == n;
        }
        in.close();
        out.close();
        File sel = LittleFS.open("/alarm.txt", "w");
        if (sel)
            sel.print(name);
        sel.close();
        if (!ok)
        {
            s_server.send(500, "application/json", "{\"error\":\"copy\"}");
            return;
        }
        Serial.printf("Web: Weckton %s gewaehlt\n", name.c_str());
        sendSounds();
    }

    static void start()
    {
        s_server.on("/api/sounds", HTTP_GET, sendSounds);
        s_server.on("/api/sound", HTTP_POST, selectSound);
        s_server.on("/api/preview", HTTP_POST, previewSound);
        s_server.on("/api/mawaqit/search", HTTP_GET, searchMosques);
        s_server.on("/api/backgrounds", HTTP_GET, sendBackgrounds);
        s_server.on("/api/settings", HTTP_GET, sendSettings);
        s_server.on("/api/settings", HTTP_POST, receiveSettings);
        // Startseite ausdrücklich: serveStatic sucht bei "/" nur nach index.htm
        s_server.on("/", HTTP_GET, [] {
            File f = LittleFS.open("/www/index.html", "r");
            if (!f)
            {
                s_server.send(404, "text/plain", "index.html fehlt (pio run -t uploadfs)");
                return;
            }
            s_server.sendHeader("Cache-Control", "no-cache");
            s_server.streamFile(f, "text/html; charset=utf-8");
            f.close();
        });
        s_server.serveStatic("/", LittleFS, "/www/", "no-cache");
        s_server.onNotFound([] { s_server.send(404, "text/plain", "Not found"); });
        s_server.begin();

        if (MDNS.begin(HOSTNAME))
            MDNS.addService("http", "tcp", 80);
        snprintf(s_url, sizeof(s_url), "http://%s", WiFi.localIP().toString().c_str());
        s_running = true;
        Serial.printf("Web: Konfiguration unter http://%s.local oder %s\n", HOSTNAME, s_url);
    }

    void update()
    {
        if (!s_running)
        {
            // erst nach der WLAN-Einrichtung, das Einrichtungsportal belegt sonst Port 80
            const model::WifiInfo w = wifimgr::info();
            if (w.connected && !w.portalActive)
                start();
            return;
        }
        s_server.handleClient();
    }

    const char *url() { return s_url; }
}

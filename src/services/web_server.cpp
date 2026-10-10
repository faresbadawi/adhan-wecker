#include "web_server.h"
#include <ArduinoJson.h>
#include <ArduinoOTA.h>
#include <Update.h>
#include <Preferences.h>
#include <ESPmDNS.h>
#include <LittleFS.h>
#include <WebServer.h>
#include <WiFi.h>
#include "audio_manager.h"
#include "azan_controller.h"
#include "config.h"
#include "ui/lang.h"
#include "ui/ui.h"
#include "ui/theme.h"
#include "hal/rgb_led.h"
#include "mawaqit.h"
#include "prayer_times.h"
#include "settings.h"
#include "storage.h"
#include "time_manager.h"
#include "weather.h"
#include "wifi_manager.h"

namespace web
{
    static constexpr const char *HOSTNAME = "azan-clock";

    static WebServer s_server(80);
    static bool s_running = false;
    static char s_url[40] = "";
    static uint32_t s_restartAt = 0; // Neustart nach dem Senden der Antwort

    // Sprache der Web-App (ar, de, en), gespeichert im NVS
    static String webLang()
    {
        Preferences p;
        p.begin("web", true);
        String l = p.getString("lang", "ar");
        p.end();
        return l;
    }

    static const char *AZAN_KEYS[5] = {"fajr", "dhuhr", "asr", "maghrib", "isha"};
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
        doc["volume"] = st.volume; // Wecker, 0..21
        JsonObject av = doc["azanVolume"].to<JsonObject>(); // Azan je Gebet, Prozent
        for (int i = 0; i < 5; i++)
            av[AZAN_KEYS[i]] = st.azanVolume[i];
        doc["brightness"] = st.brightness;
        doc["autoDim"] = st.autoDim;
        doc["showNight"] = st.showNight;
        doc["tahajjud"]["on"] = st.tahajjudAlarm;
        doc["tahajjud"]["offset"] = st.tahajjudOffset;
        doc["nightBrightness"] = st.nightBrightness;
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
            a["name"] = settings::alarmName(i);
            a["time"] = t;
            a["days"] = st.alarms[i].days;
        }

        doc["source"] = st.prayerSource == settings::SOURCE_MAWAQIT ? "mawaqit" : "calculated";
        doc["mawaqit"]["slug"] = st.mawaqitSlug;
        doc["mawaqit"]["name"] = st.mawaqitName;

        // Seiten in Reihenfolge: [{"id":"night","on":true}, {"id":"prayer","on":true}, ...]
        JsonArray pages = doc["pages"].to<JsonArray>();
        {
            const String layout = settings::pageLayout();
            int start = 0;
            while (start < (int)layout.length())
            {
                int end = layout.indexOf(',', start);
                if (end < 0)
                    end = layout.length();
                String key = layout.substring(start, end);
                JsonObject p = pages.add<JsonObject>();
                p["on"] = !key.startsWith("-");
                if (key.startsWith("-"))
                    key.remove(0, 1);
                p["id"] = key;
                start = end + 1;
            }
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
        JsonObject av = doc["azanVolume"];
        for (int i = 0; i < 5; i++)
            st.azanVolume[i] = av[AZAN_KEYS[i]] | st.azanVolume[i];
        st.brightness = doc["brightness"] | st.brightness;
        st.autoDim = doc["autoDim"] | st.autoDim;
        st.showNight = doc["showNight"] | st.showNight;
        st.tahajjudAlarm = doc["tahajjud"]["on"] | st.tahajjudAlarm;
        st.tahajjudOffset = (uint8_t)constrain(doc["tahajjud"]["offset"] | (int)st.tahajjudOffset, 0, 255);
        st.nightBrightness = doc["nightBrightness"] | st.nightBrightness;
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
                settings::setAlarmName(i, alarms[i]["name"] | "");
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

        // Seiten: vollständige Liste in neuer Reihenfolge, z. B. Nacht- und Mondseite frei verschiebbar
        JsonArray pages = doc["pages"];
        if (pages.size() > 0)
        {
            String layout;
            for (JsonObject p : pages)
            {
                if (layout.length())
                    layout += ",";
                layout += String((p["on"] | true) ? "" : "-") + (const char *)(p["id"] | "");
            }
            if (!settings::setPageLayout(layout))
            {
                s_server.send(400, "application/json", "{\"error\":\"pages\"}");
                return;
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

    // Eigenes Hintergrundbild: die App schneidet zu und schickt /bg/custom.bin (480x320 RGB565)
    // und ein kleines Vorschaubild. Ein neues Bild ersetzt das vorherige.
    static File s_upFile;
    static void backgroundUploadData()
    {
        HTTPUpload &up = s_server.upload();
        if (up.status == UPLOAD_FILE_START)
        {
            const bool bin = up.name == "bin";
            s_upFile = LittleFS.open(bin ? "/bg/custom.tmp" : "/www/bg/custom.jpg", "w");
        }
        else if (up.status == UPLOAD_FILE_WRITE && s_upFile)
            s_upFile.write(up.buf, up.currentSize);
        else if ((up.status == UPLOAD_FILE_END || up.status == UPLOAD_FILE_ABORTED) && s_upFile)
            s_upFile.close();
    }

    static void backgroundUploadDone()
    {
        File f = LittleFS.open("/bg/custom.tmp", "r");
        const size_t size = f ? f.size() : 0;
        f.close();
        if (size != (size_t)theme::SCREEN_W * theme::SCREEN_H * 2)
        {
            LittleFS.remove("/bg/custom.tmp");
            s_server.send(400, "application/json", "{\"error\":\"size\"}");
            return;
        }
        LittleFS.remove("/bg/custom.bin");
        LittleFS.rename("/bg/custom.tmp", "/bg/custom.bin");
        if (strcmp(settings::get().background, "custom") == 0)
            theme::setBackground("custom"); // schon gewählt: sofort neu laden
        sendBackgrounds();
    }

    static void backgroundDelete()
    {
        LittleFS.remove("/bg/custom.bin");
        LittleFS.remove("/www/bg/custom.jpg");
        settings::Settings st = settings::get();
        if (strcmp(st.background, "custom") == 0)
        {
            strlcpy(st.background, "noir", sizeof(st.background));
            settings::set(st);
        }
        sendBackgrounds();
    }

    // Update aus der App: firmware.bin (beginnt mit 0xE9) oder littlefs.bin (App-Dateien, Töne, Bilder).
    // Die Art wird am ersten Byte erkannt; danach startet die Uhr neu.
    static bool s_updStarted = false;
    static void updateData()
    {
        HTTPUpload &up = s_server.upload();
        if (up.status == UPLOAD_FILE_START)
        {
            s_updStarted = false;
            audio::stop();
        }
        else if (up.status == UPLOAD_FILE_WRITE)
        {
            if (!s_updStarted)
            {
                const int kind = up.currentSize && up.buf[0] == 0xE9 ? U_FLASH : U_SPIFFS;
                s_updStarted = Update.begin(UPDATE_SIZE_UNKNOWN, kind);
                Serial.printf("Update: %s %s\n", kind == U_FLASH ? "Firmware" : "Dateisystem", s_updStarted ? "beginnt" : "nicht moeglich");
            }
            if (s_updStarted && Update.write(up.buf, up.currentSize) != up.currentSize)
                Update.printError(Serial);
        }
        else if (up.status == UPLOAD_FILE_END && s_updStarted)
            Update.end(true);
        else if (up.status == UPLOAD_FILE_ABORTED && s_updStarted)
            Update.abort();
    }

    static void updateDone()
    {
        if (!s_updStarted || Update.hasError() || !Update.isFinished())
        {
            s_server.send(500, "application/json", "{\"error\":\"update\"}");
            return;
        }
        s_server.send(200, "application/json", "{}");
        s_restartAt = millis() + 1500;
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
        audio::setVolume(settings::get().volume); // Lautstärke des Weckers
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

    // ---------- Gerätestatus für das Dashboard

    static const char *skyKey(model::Sky s)
    {
        static const char *K[] = {"clear", "partly_cloudy", "cloudy", "fog", "drizzle", "rain", "snow", "thunder"};
        return K[(int)s];
    }

    static void sendStatus()
    {
        static const char *PRAYER_KEYS[model::PRAYER_COUNT] = {"fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"};
        JsonDocument doc;
        doc["lang"] = webLang();

        JsonObject dev = doc["device"].to<JsonObject>();
        dev["name"] = DEVICE_NAME;
        dev["firmware"] = FW_VERSION;
        dev["host"] = String(HOSTNAME) + ".local";
        dev["ip"] = WiFi.localIP().toString();
        dev["uptime"] = millis() / 1000;
        dev["fsUsed"] = LittleFS.usedBytes();   // Dateien (Azan, Hintergründe, App)
        dev["fsTotal"] = LittleFS.totalBytes();
        dev["appUsed"] = ESP.getSketchSize();    // Programm
        dev["appTotal"] = ESP.getFreeSketchSpace(); // Größe einer App-Partition (die andere ist gleich groß)

        const model::WifiInfo w = wifimgr::info();
        JsonObject wifi = doc["wifi"].to<JsonObject>();
        wifi["connected"] = w.connected;
        wifi["ssid"] = w.ssid;
        wifi["bars"] = w.connected ? w.bars : 0;

        const settings::Settings st = settings::get();
        doc["location"]["city"] = st.city;
        doc["location"]["country"] = st.country;

        struct tm now;
        if (timemgr::now(now))
        {
            char b[20];
            strftime(b, sizeof(b), "%Y-%m-%d", &now);
            doc["time"]["date"] = b;
            strftime(b, sizeof(b), "%H:%M:%S", &now);
            doc["time"]["clock"] = b;
            doc["time"]["weekday"] = now.tm_wday;

            model::PrayerDay day;
            if (prayers::forDay(now, day))
            {
                JsonObject times = doc["prayer"]["times"].to<JsonObject>();
                for (int p = 0; p < model::PRAYER_COUNT; p++)
                {
                    snprintf(b, sizeof(b), "%02d:%02d", day.minutes[p] / 60, day.minutes[p] % 60);
                    times[PRAYER_KEYS[p]] = b;
                }
                model::Prayer next;
                int32_t left;
                prayers::next(now, day, next, left);
                doc["prayer"]["next"]["key"] = PRAYER_KEYS[next];
                doc["prayer"]["next"]["seconds"] = left;
                doc["prayer"]["hijri"]["day"] = day.hijriDay;
                doc["prayer"]["hijri"]["month"] = day.hijriMonth;
                doc["prayer"]["hijri"]["year"] = day.hijriYear;
                static const char *HOLIDAY_KEYS[] = {"new_year", "ashura", "isra", "ramadan", "qadr", "eid_fitr", "arafah", "eid_adha"};
                const model::Holiday h = model::holidayOf(day.hijriMonth, day.hijriDay);
                doc["prayer"]["holiday"] = h == model::NO_HOLIDAY ? "" : HOLIDAY_KEYS[h];
                doc["prayer"]["friday"] = now.tm_wday == 5;
            }

            // Letztes Drittel der Nacht: Beginn, Ende (Fajr), Sonnenaufgang und Sekunden bis zum Beginn (negativ: läuft)
            model::NightTimes n;
            if (prayers::night(now, n))
            {
                auto hm = [&](int32_t m) {
                    m = ((m % 1440) + 1440) % 1440;
                    snprintf(b, sizeof(b), "%02d:%02d", m / 60, m % 60);
                    return String(b);
                };
                doc["night"]["lastThird"] = hm(n.lastThird);
                doc["night"]["fajr"] = hm(n.fajr);
                doc["night"]["sunrise"] = hm(n.sunrise);
                doc["night"]["seconds"] = n.secondsToLastThird;
                doc["night"]["alarm"] = st.tahajjudAlarm;
            }
        }

        doc["azan"]["playing"] = azan::status().state == azan::State::PLAYING;

        model::Weather wx;
        if (weather::get(wx))
        {
            doc["weather"]["temp"] = lroundf(wx.temp);
            doc["weather"]["sky"] = skyKey(wx.sky);
            doc["weather"]["day"] = wx.isDay;
        }

        String out;
        serializeJson(doc, out);
        s_server.send(200, "application/json", out);
    }

    // ---------- WLAN und Gerät

    static void wifiScan()
    {
        static wifimgr::Network nets[20];
        const int n = wifimgr::scan(nets, 20);
        JsonDocument doc;
        JsonArray list = doc.to<JsonArray>();
        for (int i = 0; i < n; i++)
        {
            JsonObject o = list.add<JsonObject>();
            o["ssid"] = nets[i].ssid;
            o["bars"] = nets[i].bars;
            o["secure"] = nets[i].secure;
        }
        String out;
        serializeJson(doc, out);
        s_server.send(200, "application/json", out);
    }

    static void wifiConnect()
    {
        JsonDocument doc;
        if (deserializeJson(doc, s_server.arg("plain")) || !(doc["ssid"] | "")[0])
        {
            s_server.send(400, "application/json", "{\"error\":\"ssid\"}");
            return;
        }
        s_server.send(200, "application/json", "{}"); // erst antworten, dann wechseln
        wifimgr::connect(doc["ssid"] | "", doc["password"] | "");
    }

    static void wifiForget()
    {
        wifimgr::forget();
        s_server.send(200, "application/json", "{}");
        s_restartAt = millis() + 800; // nach dem Neustart öffnet sich das Einrichtungsportal
    }

    static void deviceRestart()
    {
        s_server.send(200, "application/json", "{}");
        s_restartAt = millis() + 800;
    }

    // Werkseinstellungen: Einstellungen, Gebetszeiten-Cache, Assistent und WLAN löschen
    static void deviceReset()
    {
        for (const char *ns : {"adhan", "assistant", "web"})
        {
            Preferences p;
            p.begin(ns, false);
            p.clear();
            p.end();
        }
        wifimgr::forget();
        s_server.send(200, "application/json", "{}");
        s_restartAt = millis() + 800;
    }

    // Azan-Test aus der App: läuft wie zur Gebetszeit (Anzeige auf der Uhr, Stopp durch Tippen oder App)
    static void azanTest()
    {
        JsonDocument doc;
        deserializeJson(doc, s_server.arg("plain"));
        const bool fajr = strcmp(doc["prayer"] | "", "fajr") == 0;
        struct tm now;
        const uint16_t minutes = timemgr::now(now) ? now.tm_hour * 60 + now.tm_min : 0;
        azan::start(fajr ? model::FAJR : model::DHUHR, minutes);
        s_server.send(200, "application/json", "{}");
    }

    // Probehören (Lautstärke, Stimme): nur den Ton abspielen, ohne Anzeige auf der Uhr.
    // Body optional {"id": "<stimme>", "prayer": "fajr"}; ohne id die gewählte Stimme,
    // ohne prayer Dhuhr. Die Lautstärke ist die eingestellte des Gebets.
    static void azanPreview()
    {
        JsonDocument doc;
        deserializeJson(doc, s_server.arg("plain"));
        String id = doc["id"] | "";
        if (id.isEmpty())
            id = azan::voice();
        model::Prayer prayer = model::DHUHR;
        for (int i = 0; i < 5; i++)
            if (strcmp(doc["prayer"] | "", AZAN_KEYS[i]) == 0)
                prayer = model::DAILY_PRAYERS[i];
        static char path[96];
        if (azan::status().state != azan::State::IDLE || !azan::voiceFile(id, prayer, path, sizeof(path)))
        {
            s_server.send(409, "application/json", "{\"error\":\"azan\"}");
            return;
        }
        azan::applyVolume(prayer);
        audio::play(LittleFS, path);
        s_server.send(200, "application/json", "{}");
    }

    // Verfügbare Azan-Stimmen (Dateien in /azans ohne _fajr) und die gewählte
    static void sendVoices()
    {
        JsonDocument doc;
        JsonArray list = doc["list"].to<JsonArray>();
        File dir = LittleFS.open("/azans");
        for (File f = dir.openNextFile(); f; f = dir.openNextFile())
        {
            String n = f.name();
            if (n.endsWith(".mp3") && !n.endsWith("_fajr.mp3"))
            {
                n.remove(n.length() - 4);
                list.add(n);
            }
        }
        doc["selected"] = azan::voice();
        String out;
        serializeJson(doc, out);
        s_server.send(200, "application/json", out);
    }

    static void selectVoice()
    {
        JsonDocument doc;
        deserializeJson(doc, s_server.arg("plain"));
        if (!azan::setVoice(doc["id"] | ""))
        {
            s_server.send(400, "application/json", "{\"error\":\"voice\"}");
            return;
        }
        sendVoices();
    }

    static void azanStop()
    {
        azan::skip();
        audio::stop();
        s_server.send(200, "application/json", "{}");
    }

    // Bildschirmfoto der Uhr als BMP (16 Bit, RGB565), z. B. zur Kontrolle ohne USB-Kabel.
    // ?page=1..5 zeigt vorher die Seite Uhr/Gebetszeiten/Wetter/Kalender/Einstellungen.
    static void sendScreenshot()
    {
        const int page = s_server.arg("page").toInt();
        if (page >= 1 && page <= ui::PAGE_COUNT)
        {
            ui::showPage((ui::Page)(page - 1));
            for (int i = 0; i < 40; i++) // Wischanimation abwarten
            {
                lv_timer_handler();
                delay(10);
            }
        }
        uint32_t size;
        uint16_t w, h;
        uint8_t *buf = ui::snapshot(size, w, h);
        if (!buf)
        {
            s_server.send(500, "text/plain", "snapshot");
            return;
        }
        // BMP mit BI_BITFIELDS (RGB565), Zeilen von unten nach oben, little-endian
        const uint32_t rowBytes = w * 2, dataOff = 14 + 40 + 12, fileSize = dataOff + rowBytes * h;
        uint8_t hdr[66] = {'B', 'M'};
        auto put32 = [&](int at, uint32_t v) { for (int i = 0; i < 4; i++) hdr[at + i] = v >> (8 * i); };
        auto put16 = [&](int at, uint16_t v) { hdr[at] = v; hdr[at + 1] = v >> 8; };
        put32(2, fileSize); put32(10, dataOff); put32(14, 40); put32(18, w); put32(22, h);
        put16(26, 1); put16(28, 16); put32(30, 3); put32(34, rowBytes * h);
        put32(54, 0xF800); put32(58, 0x07E0); put32(62, 0x001F);
        s_server.setContentLength(fileSize);
        s_server.send(200, "image/bmp", "");
        s_server.sendContent((const char *)hdr, sizeof(hdr));
        static uint8_t row[480 * 2];
        for (int y = h - 1; y >= 0; y--)
        {
            const uint8_t *src = buf + y * rowBytes;
            for (uint32_t x = 0; x < rowBytes; x += 2) // big-endian (LV_COLOR_16_SWAP) -> little-endian
            {
                row[x] = src[x + 1];
                row[x + 1] = src[x];
            }
            s_server.sendContent((const char *)row, rowBytes);
        }
        free(buf);
    }

    // RGB-LED testen: {"r":255,"g":0,"b":0,"w":0,"rgbw":false}
    static void ledSet()
    {
        JsonDocument doc;
        deserializeJson(doc, s_server.arg("plain"));
        rgbled::setFormat(doc["rgbw"] | false);
        rgbled::set(doc["r"] | 0, doc["g"] | 0, doc["b"] | 0, doc["w"] | 0);
        s_server.send(200, "application/json", "{}");
    }

    // Fehlerprotokoll der Web-App: die letzten Fehler vom Handy, nur im RAM (zur Fehlersuche abrufbar)
    static constexpr int CLIENT_LOG_N = 20;
    static String s_clientLog[CLIENT_LOG_N];
    static int s_clientLogNext = 0;

    static void clientLogAdd()
    {
        String line = s_server.arg("plain");
        if (line.length() > 900)
            line = line.substring(0, 900);
        s_clientLog[s_clientLogNext] = String(millis() / 1000) + "s " + line;
        s_clientLogNext = (s_clientLogNext + 1) % CLIENT_LOG_N;
        s_server.send(200, "application/json", "{}");
    }

    static void clientLogSend()
    {
        JsonDocument doc;
        JsonArray list = doc.to<JsonArray>();
        for (int i = 0; i < CLIENT_LOG_N; i++)
        {
            const String &e = s_clientLog[(s_clientLogNext + i) % CLIENT_LOG_N];
            if (e.length())
                list.add(e);
        }
        String out;
        serializeJson(doc, out);
        s_server.send(200, "application/json", out);
    }

    // Sprache von Web-App und Uhr; die Uhr startet neu, damit alle Seiten in der neuen Sprache entstehen
    static void deviceLang()
    {
        JsonDocument doc;
        deserializeJson(doc, s_server.arg("plain"));
        if (!lang::save(doc["lang"] | ""))
        {
            s_server.send(400, "application/json", "{\"error\":\"lang\"}");
            return;
        }
        s_server.send(200, "application/json", "{}");
        s_restartAt = millis() + 800;
    }

    static void start()
    {
        s_server.on("/api/status", HTTP_GET, sendStatus);
        s_server.on("/api/wifi/scan", HTTP_GET, wifiScan);
        s_server.on("/api/wifi/connect", HTTP_POST, wifiConnect);
        s_server.on("/api/wifi/forget", HTTP_POST, wifiForget);
        s_server.on("/api/device/restart", HTTP_POST, deviceRestart);
        s_server.on("/api/device/reset", HTTP_POST, deviceReset);
        s_server.on("/api/device/lang", HTTP_POST, deviceLang);
        s_server.on("/api/azan/test", HTTP_POST, azanTest);
        s_server.on("/api/screenshot", HTTP_GET, sendScreenshot);
        s_server.on("/api/led", HTTP_POST, ledSet);
        s_server.on("/api/clientlog", HTTP_POST, clientLogAdd);
        s_server.on("/api/clientlog", HTTP_GET, clientLogSend);
        s_server.on("/api/azan/stop", HTTP_POST, azanStop);
        s_server.on("/api/azan/preview", HTTP_POST, azanPreview);
        s_server.on("/api/azan/voices", HTTP_GET, sendVoices);
        s_server.on("/api/azan/voice", HTTP_POST, selectVoice);
        s_server.on("/api/sounds", HTTP_GET, sendSounds);
        s_server.on("/api/sound", HTTP_POST, selectSound);
        s_server.on("/api/preview", HTTP_POST, previewSound);
        s_server.on("/api/mawaqit/search", HTTP_GET, searchMosques);
        s_server.on("/api/backgrounds", HTTP_GET, sendBackgrounds);
        s_server.on("/api/update", HTTP_POST, updateDone, updateData);
        s_server.on("/api/background/upload", HTTP_POST, backgroundUploadDone, backgroundUploadData);
        s_server.on("/api/background/delete", HTTP_POST, backgroundDelete);
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

        // Firmware und Dateisystem über WLAN aktualisieren (kein USB-Kabel nötig)
        ArduinoOTA.setHostname(HOSTNAME);
        ArduinoOTA.setPassword(OTA_PASSWORD);
        ArduinoOTA.setMdnsEnabled(false); // mDNS läuft schon (oben)
        ArduinoOTA.onStart([] {
            audio::stop();
            Serial.println("OTA: Update beginnt");
        });
        ArduinoOTA.onEnd([] { Serial.println("OTA: fertig, Neustart"); });
        ArduinoOTA.onError([](ota_error_t e) { Serial.printf("OTA: Fehler %u\n", e); });
        ArduinoOTA.begin();
        MDNS.enableArduino(3232, true);
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
        ArduinoOTA.handle();
        if (s_restartAt && (int32_t)(millis() - s_restartAt) > 0)
        {
            Serial.println("Web: Neustart");
            delay(100);
            ESP.restart();
        }
    }

    const char *url() { return s_url; }
}

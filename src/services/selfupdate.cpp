#include "selfupdate.h"
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <LittleFS.h>
#include <Preferences.h>
#include <Update.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <mbedtls/pk.h>
#include <mbedtls/sha256.h>
#include "alarm_clock.h"
#include "audio_manager.h"
#include "azan_controller.h"
#include "config.h"
#include "net_lock.h"
#include "ota_pubkey.h"
#include "prayer_times.h"
#include "settings.h"
#include "fleet.h"

// Aufbau von manifest.json (erzeugt von tools/release.py):
// {"build":25,"version":"2.5","base":"https://…/ota/25/",
//  "fw":{"n":"firmware.bin","s":<Bytes>,"h":"<sha256>"},
//  "files":[["/www/index.html",<Bytes>,"<sha256>"],…],
//  "prune":["/www/assets"]}            Verzeichnisse, in denen nicht genannte Dateien gelöscht werden
// manifest.sig: ECDSA-P256-Unterschrift (DER, hexadezimal) über die Bytes von manifest.json.

namespace selfupdate
{
    static constexpr int MAX_FILES = 80;
    static SemaphoreHandle_t s_lock;
    static Status s_status;
    static uint32_t s_checkedAt = 0;
    static volatile bool s_wantCheck = false, s_wantInstall = false;
    static int8_t s_auto = -1;
    static String s_manifest; // zuletzt geprüftes, gültiges Verzeichnis
    static int s_lastCode = 0; // letzter HTTP-Status (Fehlersuche)

    static void setState(State st, const char *err = nullptr, uint8_t progress = 0)
    {
        xSemaphoreTake(s_lock, portMAX_DELAY);
        s_status.state = st;
        s_status.progress = progress;
        strlcpy(s_status.error, err ? err : "", sizeof(s_status.error));
        xSemaphoreGive(s_lock);
        if (err)
            Serial.printf("Update: %s\n", err);
    }

    Status status()
    {
        xSemaphoreTake(s_lock, portMAX_DELAY);
        Status s = s_status;
        xSemaphoreGive(s_lock);
        s.checkedAgoSec = s_checkedAt ? (millis() - s_checkedAt) / 1000 : 0;
        return s;
    }

    bool autoUpdate()
    {
        if (s_auto < 0)
        {
            Preferences p;
            p.begin("upd", true);
            s_auto = p.getBool("auto", true) ? 1 : 0;
            p.end();
        }
        return s_auto == 1;
    }

    void setAutoUpdate(bool on)
    {
        Preferences p;
        p.begin("upd", false);
        p.putBool("auto", on);
        p.end();
        s_auto = on ? 1 : 0;
    }

    void requestCheck() { s_wantCheck = true; }
    void requestInstall() { s_wantInstall = true; }

    // ---------- Herunterladen

    struct Sink
    {
        virtual bool write(const uint8_t *buf, size_t n) = 0;
        virtual ~Sink() = default;
    };
    struct StringSink : Sink
    {
        String &s;
        size_t max;
        StringSink(String &out, size_t limit) : s(out), max(limit) {}
        bool write(const uint8_t *buf, size_t n) override
        {
            if (s.length() + n > max)
                return false;
            return s.concat((const char *)buf, n);
        }
    };
    struct FileSink : Sink
    {
        File &f;
        explicit FileSink(File &file) : f(file) {}
        bool write(const uint8_t *buf, size_t n) override { return f.write(buf, n) == n; }
    };
    struct FlashSink : Sink
    {
        bool write(const uint8_t *buf, size_t n) override { return Update.write((uint8_t *)buf, n) == n; }
    };

    static void hexOf(const uint8_t *d, size_t n, char *out)
    {
        static const char *H = "0123456789abcdef";
        for (size_t i = 0; i < n; i++)
        {
            out[2 * i] = H[d[i] >> 4];
            out[2 * i + 1] = H[d[i] & 15];
        }
        out[2 * n] = 0;
    }

    // Lädt url in sink; prüft Größe (expect, 0 = egal) und SHA-256 (sha, nullptr = egal).
    // done/total: Fortschritt über alle Downloads (für die Anzeige)
    static bool download(const String &url, Sink &sink, size_t expect, const char *sha, size_t &done, size_t total)
    {
        netlock::Guard net;
        WiFiClientSecure client;
        client.setInsecure(); // Echtheit prüft die Unterschrift des Verzeichnisses, nicht TLS
        HTTPClient http;
        http.useHTTP10(true);
        http.setTimeout(20000);
        http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
        http.setUserAgent("Bilal/" FW_VERSION);
        if (!http.begin(client, url))
        {
            s_lastCode = -100;
            return false;
        }
        const int code = http.GET();
        s_lastCode = code;
        if (code != 200)
        {
            Serial.printf("Update: HTTP %d fuer %s\n", code, url.c_str());
            http.end();
            return false;
        }
        const int len = http.getSize();
        if (expect && len >= 0 && (size_t)len != expect)
        {
            http.end();
            return false;
        }
        mbedtls_sha256_context ctx;
        mbedtls_sha256_init(&ctx);
        mbedtls_sha256_starts(&ctx, 0);
        WiFiClient *stream = http.getStreamPtr();
        static uint8_t buf[2048];
        size_t got = 0;
        uint32_t last = millis();
        bool ok = true;
        while (ok && (len < 0 || got < (size_t)len))
        {
            const int avail = stream->available();
            if (avail > 0)
            {
                const int n = stream->readBytes(buf, min(avail, (int)sizeof(buf)));
                mbedtls_sha256_update(&ctx, buf, n);
                ok = sink.write(buf, n);
                got += n;
                done += n;
                last = millis();
                if (total)
                {
                    xSemaphoreTake(s_lock, portMAX_DELAY);
                    s_status.progress = min<size_t>(99, done * 100 / total);
                    xSemaphoreGive(s_lock);
                }
            }
            else if (!stream->connected())
                break;
            else if (millis() - last > 20000)
                ok = false;
            else
                vTaskDelay(pdMS_TO_TICKS(2));
        }
        http.end();
        uint8_t digest[32];
        mbedtls_sha256_finish(&ctx, digest);
        mbedtls_sha256_free(&ctx);
        if (!ok || (expect && got != expect))
            return false;
        if (sha)
        {
            char hex[65];
            hexOf(digest, 32, hex);
            if (strcasecmp(hex, sha) != 0)
            {
                Serial.printf("Update: Pruefsumme falsch fuer %s\n", url.c_str());
                return false;
            }
        }
        return true;
    }

    // ---------- Unterschrift

    static bool verify(const String &manifest, const String &sigHex)
    {
        uint8_t sig[80];
        String h = sigHex;
        h.trim();
        const size_t n = h.length() / 2;
        if (n < 8 || n > sizeof(sig))
            return false;
        for (size_t i = 0; i < n; i++)
            sig[i] = (uint8_t)strtoul(h.substring(2 * i, 2 * i + 2).c_str(), nullptr, 16);

        uint8_t hash[32];
        mbedtls_sha256((const uint8_t *)manifest.c_str(), manifest.length(), hash, 0);

        mbedtls_pk_context pk;
        mbedtls_pk_init(&pk);
        bool ok = mbedtls_pk_parse_public_key(&pk, (const uint8_t *)OTA_PUBLIC_KEY, sizeof(OTA_PUBLIC_KEY)) == 0 &&
                  mbedtls_pk_verify(&pk, MBEDTLS_MD_SHA256, hash, sizeof(hash), sig, n) == 0;
        mbedtls_pk_free(&pk);
        return ok;
    }

    // Lädt und prüft das Verzeichnis; true = gültig (in s_manifest)
    static bool fetchManifest()
    {
        String man, sig;
        size_t done = 0;
        StringSink ms(man, 32768), ss(sig, 400);
        if (!download(OTA_MANIFEST_URL, ms, 0, nullptr, done, 0))
        {
            char e[48];
            snprintf(e, sizeof(e), "Verzeichnis: %d, RAM %u/%u", s_lastCode, (unsigned)heap_caps_get_free_size(MALLOC_CAP_INTERNAL) / 1024,
                     (unsigned)heap_caps_get_largest_free_block(MALLOC_CAP_INTERNAL) / 1024);
            setState(State::FAILED, e);
            return false;
        }
        String sigUrl = OTA_MANIFEST_URL;
        sigUrl.replace("manifest.json", "manifest.sig");
        if (!download(sigUrl, ss, 0, nullptr, done, 0) || !verify(man, sig))
        {
            setState(State::FAILED, "Unterschrift ungueltig");
            return false;
        }
        s_manifest = man;
        return true;
    }

    // ---------- Prüfen und installieren

    static bool sameLocal(const char *path, size_t size, const char *sha)
    {
        File f = LittleFS.open(path, FILE_READ);
        if (!f || f.isDirectory() || f.size() != size)
            return false;
        mbedtls_sha256_context ctx;
        mbedtls_sha256_init(&ctx);
        mbedtls_sha256_starts(&ctx, 0);
        static uint8_t buf[2048];
        int n;
        while ((n = f.read(buf, sizeof(buf))) > 0)
            mbedtls_sha256_update(&ctx, buf, n);
        f.close();
        uint8_t d[32];
        mbedtls_sha256_finish(&ctx, d);
        mbedtls_sha256_free(&ctx);
        char hex[65];
        hexOf(d, 32, hex);
        return strcasecmp(hex, sha) == 0;
    }

    static void check()
    {
        setState(State::CHECKING);
        if (!fetchManifest())
            return;
        s_checkedAt = millis();
        JsonDocument doc;
        if (deserializeJson(doc, s_manifest))
        {
            setState(State::FAILED, "Verzeichnis fehlerhaft");
            return;
        }
        const int build = doc["build"] | 0;
        fleet::setUrl(doc["fleet"] | ""); // Adresse der Zentrale (signiert)
        xSemaphoreTake(s_lock, portMAX_DELAY);
        s_status.latestBuild = build;
        strlcpy(s_status.latestVersion, doc["version"] | "", sizeof(s_status.latestVersion));
        xSemaphoreGive(s_lock);
        setState(build > FW_BUILD ? State::AVAILABLE : State::UP_TO_DATE);
        Serial.printf("Update: installiert %d, verfuegbar %d\n", FW_BUILD, build);
    }

    static bool busy()
    {
        return azan::status().state == azan::State::PLAYING || alarmclock::ringing();
    }

    static void install()
    {
        JsonDocument doc;
        if (deserializeJson(doc, s_manifest) || (doc["build"] | 0) <= FW_BUILD)
            return;
        if (busy())
        {
            setState(State::AVAILABLE, "Azan oder Wecker laeuft");
            return;
        }
        setState(State::INSTALLING);
        audio::stop();
        const String base = doc["base"] | "";
        JsonArray files = doc["files"];
        JsonObject fw = doc["fw"];

        // Was muss geladen werden?
        bool need[MAX_FILES] = {};
        size_t total = fw["s"] | 0, needBytes = 0;
        int i = 0;
        for (JsonArray f : files)
        {
            if (i >= MAX_FILES)
                break;
            need[i] = !sameLocal(f[0] | "", f[1] | 0, f[2] | "");
            if (need[i])
            {
                total += f[1].as<size_t>();
                needBytes += f[1].as<size_t>();
            }
            i++;
        }
        if (needBytes + 64 * 1024 > LittleFS.totalBytes() - LittleFS.usedBytes())
        {
            setState(State::FAILED, "Zu wenig Speicher");
            return;
        }

        // 1. Geänderte Dateien als <Pfad>.new laden
        size_t done = 0;
        bool ok = true;
        i = 0;
        for (JsonArray f : files)
        {
            if (i >= MAX_FILES || !ok)
                break;
            if (need[i])
            {
                const String path = f[0] | "";
                File out = LittleFS.open(path + ".new", FILE_WRITE, true);
                FileSink sink(out);
                ok = out && download(base + path.substring(1), sink, f[1] | 0, f[2] | "", done, total);
                out.close();
            }
            i++;
        }

        // 2. Firmware in die freie App-Partition schreiben
        if (ok)
        {
            ok = Update.begin(fw["s"] | 0, U_FLASH);
            FlashSink sink;
            ok = ok && download(base + (const char *)(fw["n"] | "firmware.bin"), sink, fw["s"] | 0, fw["h"] | "", done, total);
            if (ok)
                ok = Update.end(true);
            else
                Update.abort();
        }

        if (!ok)
        {
            i = 0;
            for (JsonArray f : files)
                if (i < MAX_FILES && need[i++])
                    LittleFS.remove(String(f[0] | "") + ".new");
            setState(State::FAILED, "Download fehlgeschlagen");
            return;
        }

        // 3. Neue Dateien übernehmen und veraltete App-Dateien löschen
        i = 0;
        for (JsonArray f : files)
        {
            if (i < MAX_FILES && need[i])
            {
                const String path = f[0] | "";
                LittleFS.remove(path);
                LittleFS.rename(path + ".new", path);
            }
            i++;
        }
        for (JsonVariant dv : doc["prune"].as<JsonArray>())
        {
            const char *dir = dv | "";
            File d = LittleFS.open(dir);
            std::vector<String> drop;
            for (File e = d.openNextFile(); e; e = d.openNextFile())
            {
                const String p = String(dir) + "/" + e.name();
                bool keep = false;
                for (JsonArray f : files)
                    if (p == (const char *)(f[0] | ""))
                        keep = true;
                if (!keep && !e.isDirectory())
                    drop.push_back(p);
            }
            d.close();
            for (const String &p : drop)
                LittleFS.remove(p);
        }
        setState(State::DONE, nullptr, 100);
        Serial.println("Update: installiert, Neustart");
        delay(1500);
        ESP.restart();
    }

    // Nachts, wenn in den nächsten 30 Minuten weder Gebet noch Wecker anstehen
    static bool quietNight(const struct tm &now)
    {
        if (now.tm_hour != 2)
            return false;
        model::PrayerDay day;
        model::Prayer p;
        int32_t left = 0;
        if (prayers::forDay(now, day))
        {
            prayers::next(now, day, p, left);
            if (left < 30 * 60)
                return false;
        }
        const int alarm = alarmclock::nextAlarmMinutes(now, settings::get());
        if (alarm >= 0)
        {
            int diff = alarm - (now.tm_hour * 60 + now.tm_min);
            if (diff < 0)
                diff += 24 * 60;
            if (diff < 30)
                return false;
        }
        return !busy();
    }

    static void task(void *)
    {
        vTaskDelay(pdMS_TO_TICKS(90 * 1000)); // nach dem Start erst Zeit, WLAN und Gebetszeiten
        int lastAutoDay = -1;
        const int autoMinute = (uint32_t)ESP.getEfuseMac() % 50; // Uhren verteilen sich über die Stunde
        bool firstCheck = true;
        for (;;)
        {
            vTaskDelay(pdMS_TO_TICKS(1000));
            if (WiFi.status() != WL_CONNECTED)
                continue;
            if (firstCheck)
            {
                firstCheck = false;
                s_wantCheck = true; // einmal nach dem Start: zeigt in der App, ob es Neues gibt
            }
            struct tm now;
            if (autoUpdate() && getLocalTime(&now, 0) && now.tm_yday != lastAutoDay && now.tm_min >= autoMinute && quietNight(now))
            {
                lastAutoDay = now.tm_yday;
                s_wantInstall = true;
            }
            if (s_wantInstall)
            {
                s_wantInstall = s_wantCheck = false;
                check();
                if (status().state == State::AVAILABLE)
                    install();
            }
            else if (s_wantCheck)
            {
                s_wantCheck = false;
                check();
            }
        }
    }

    void begin()
    {
        s_lock = xSemaphoreCreateMutex();
        xTaskCreatePinnedToCore(task, "update", 12288, nullptr, 1, nullptr, 0);
    }
}

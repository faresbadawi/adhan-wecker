#include "prayer_times.h"
#include <Arduino.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include "config.h"
#include "http_util.h"
#include "mawaqit.h"
#include "net_lock.h"
#include "settings.h"
#include "storage.h"

namespace prayers
{
    using model::PRAYER_COUNT;

    // Ein Monat Gebetszeiten, so wie er im NVS liegt
    struct MonthCache
    {
        uint16_t magic;
        int16_t year;
        int8_t month;
        uint8_t days;
        uint16_t minutes[31][PRAYER_COUNT];
        int16_t hijriYear[31];
        int8_t hijriMonth[31];
        int8_t hijriDay[31];
        // Parameter, mit denen der Monat geladen wurde; ändern sie sich, wird neu geladen
        float latitude, longitude;
        uint8_t method, school;
        uint8_t source;    // settings::PrayerSource
        uint32_t slugHash; // gewählte Mawaqit-Moschee
    };
    static constexpr uint16_t CACHE_MAGIC = 0xA7A3;

    static uint32_t hashOf(const char *s) // FNV-1a
    {
        uint32_t h = 2166136261u;
        for (; *s; s++)
            h = (h ^ (uint8_t)*s) * 16777619u;
        return h;
    }
    static constexpr const char *CACHE_KEY = "prayer_month";

    static bool s_demo = false;
    static SemaphoreHandle_t s_lock;
    static MonthCache s_cache = {};
    static volatile uint32_t s_version = 0;

    static const char *API_KEYS[PRAYER_COUNT] = {"Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"};

    // "05:42" oder "05:42 (CEST)" -> Minuten seit Mitternacht
    static int parseHHMM(const char *s)
    {
        if (!s || strlen(s) < 5 || s[2] != ':')
            return -1;
        return atoi(s) * 60 + atoi(s + 3);
    }

    static bool sameParams(const MonthCache &c, const settings::Settings &st)
    {
        if (c.source != st.prayerSource)
            return false;
        if (st.prayerSource == settings::SOURCE_MAWAQIT)
            return c.slugHash == hashOf(st.mawaqitSlug); // Hijri-Datum hängt nicht von der Methode ab
        return c.latitude == st.latitude && c.longitude == st.longitude && c.method == st.calculationMethod &&
               c.school == st.madhhab;
    }

    static bool fetchMonth(int year, int month, const settings::Settings &st, MonthCache &out)
    {
        char url[220];
        snprintf(url, sizeof(url),
                 "https://api.aladhan.com/v1/calendar/%d/%d?latitude=%.4f&longitude=%.4f&method=%d&school=%d",
                 year, month, st.latitude, st.longitude, st.calculationMethod, st.madhhab);

        netlock::Guard net; // nicht gleichzeitig mit dem Wetter
        WiFiClientSecure client;
        client.setInsecure(); // öffentliche Daten, kein Zertifikat hinterlegt
        HTTPClient http;
        http.useHTTP10(true); // kein Chunked-Encoding, Länge steht im Header
        http.setTimeout(15000);
        if (!http.begin(client, url))
            return false;
        const int code = http.GET();
        if (code != 200)
        {
            Serial.printf("Gebetszeiten: HTTP %d\n", code);
            http.end();
            return false;
        }

        JsonDocument filter;
        JsonObject f = filter["data"].add<JsonObject>();
        for (const char *k : API_KEYS)
            f["timings"][k] = true;
        f["date"]["gregorian"]["day"] = true;
        f["date"]["hijri"]["day"] = true;
        f["date"]["hijri"]["month"]["number"] = true;
        f["date"]["hijri"]["year"] = true;

        // Erst vollständig laden (~40 kB, landet im PSRAM), dann auswerten. Direkt aus dem
        // TLS-Stream zu lesen bricht ab, wenn die Daten kurz stocken.
        String body;
        const bool complete = httputil::readBody(http, body);
        http.end();
        if (!complete)
        {
            Serial.println("Gebetszeiten: Antwort unvollstaendig");
            return false;
        }
        JsonDocument doc;
        const DeserializationError err = deserializeJson(doc, body, DeserializationOption::Filter(filter));
        if (err)
        {
            Serial.printf("Gebetszeiten: JSON-Fehler %s\n", err.c_str());
            return false;
        }

        JsonArray days = doc["data"].as<JsonArray>();
        if (days.size() < 28 || days.size() > 31)
            return false;

        out = {};
        out.magic = CACHE_MAGIC;
        out.year = year;
        out.month = month;
        out.days = days.size();
        out.latitude = st.latitude;
        out.longitude = st.longitude;
        out.method = st.calculationMethod;
        out.school = st.madhhab;
        out.source = settings::SOURCE_CALCULATED;
        out.slugHash = 0;
        for (JsonObject d : days)
        {
            const int idx = atoi(d["date"]["gregorian"]["day"] | "0") - 1;
            if (idx < 0 || idx >= 31)
                return false;
            for (int p = 0; p < PRAYER_COUNT; p++)
            {
                const int m = parseHHMM(d["timings"][API_KEYS[p]]);
                if (m < 0)
                    return false;
                out.minutes[idx][p] = m;
            }
            out.hijriDay[idx] = atoi(d["date"]["hijri"]["day"] | "0");
            out.hijriMonth[idx] = d["date"]["hijri"]["month"]["number"] | 0;
            out.hijriYear[idx] = atoi(d["date"]["hijri"]["year"] | "0");
        }
        return true;
    }

    // Bei Quelle Mawaqit die berechneten Zeiten durch den Kalender der Moschee ersetzen.
    // Das Hijri-Datum bleibt aus dem Aladhan-Abruf.
    static bool applyMawaqit(const settings::Settings &st, MonthCache &c)
    {
        if (st.prayerSource != settings::SOURCE_MAWAQIT)
            return true;
        static uint16_t mq[31][6];
        int days = 0;
        if (!mawaqit::fetchMonth(st.mawaqitSlug, c.month, mq, days))
        {
            Serial.printf("Mawaqit: Kalender von %s nicht geladen\n", st.mawaqitSlug);
            return false; // alte Zeiten behalten, später erneut versuchen
        }
        for (int d = 0; d < min<int>(days, c.days); d++)
            for (int p = 0; p < PRAYER_COUNT; p++)
                c.minutes[d][p] = mq[d][p];
        c.source = settings::SOURCE_MAWAQIT;
        c.slugHash = hashOf(st.mawaqitSlug);
        Serial.printf("Mawaqit: Zeiten von %s uebernommen\n", st.mawaqitSlug);
        return true;
    }

    static void task(void *)
    {
        int fetchedYmd = 0; // Tag des letzten erfolgreichen Abrufs
        for (;;)
        {
            const time_t now = time(nullptr);
            if (WiFi.status() == WL_CONNECTED && now > 1700000000)
            {
                struct tm t;
                localtime_r(&now, &t);
                const int ymd = (t.tm_year + 1900) * 10000 + (t.tm_mon + 1) * 100 + t.tm_mday;
                const settings::Settings st = settings::get();
                xSemaphoreTake(s_lock, portMAX_DELAY);
                const bool changed = !sameParams(s_cache, st);
                xSemaphoreGive(s_lock);
                // einmal täglich aktualisieren, sofort bei geändertem Standort/Methode
                if (ymd != fetchedYmd || changed)
                {
                    static MonthCache fresh; // groß, nicht auf den Task-Stack
                    if (fetchMonth(t.tm_year + 1900, t.tm_mon + 1, st, fresh) && applyMawaqit(st, fresh))
                    {
                        fetchedYmd = ymd;
                        xSemaphoreTake(s_lock, portMAX_DELAY);
                        s_cache = fresh;
                        xSemaphoreGive(s_lock);
                        storage::saveBlob(CACHE_KEY, &fresh, sizeof(fresh));
                        s_version++;
                        Serial.printf("Gebetszeiten fuer %02d/%04d geladen\n", fresh.month, fresh.year);
                    }
                    else
                    {
                        vTaskDelay(pdMS_TO_TICKS(60000)); // später erneut versuchen
                        continue;
                    }
                }
            }
            vTaskDelay(pdMS_TO_TICKS(2000));
        }
    }

    void begin(bool demo)
    {
        s_demo = demo;
        s_lock = xSemaphoreCreateMutex();
        if (demo)
        {
            s_version = 1;
            return;
        }
        if (storage::loadBlob(CACHE_KEY, &s_cache, sizeof(s_cache)) && s_cache.magic == CACHE_MAGIC)
        {
            Serial.printf("Gebetszeiten: Cache %02d/%04d geladen\n", s_cache.month, s_cache.year);
            s_version = 1;
        }
        else
        {
            s_cache = {};
        }
        xTaskCreatePinnedToCore(task, "prayers", 8192, nullptr, 1, nullptr, 0);
    }

    static void demoDay(const struct tm &day, model::PrayerDay &out)
    {
        static const uint16_t DEMO[PRAYER_COUNT] = {5 * 60 + 48, 7 * 60 + 31, 13 * 60 + 21,
                                                   16 * 60 + 42, 19 * 60 + 24, 21 * 60 + 3};
        out.valid = true;
        out.year = day.tm_year + 1900;
        out.month = day.tm_mon + 1;
        out.day = day.tm_mday;
        memcpy(out.minutes, DEMO, sizeof(DEMO));
        out.hijriYear = 1448;
        out.hijriMonth = 4;
        out.hijriDay = 19;
    }

    bool forDay(const struct tm &day, model::PrayerDay &out)
    {
        out = {};
        if (s_demo)
        {
            demoDay(day, out);
            return true;
        }

        xSemaphoreTake(s_lock, portMAX_DELAY);
        const MonthCache &c = s_cache;
        bool ok = c.magic == CACHE_MAGIC && c.days > 0;
        if (ok)
        {
            // Passt der Monat nicht (z. B. offline am Monatswechsel), den nächstliegenden Tag nehmen
            const int want = (day.tm_year + 1900) * 12 + day.tm_mon;
            const int have = c.year * 12 + (c.month - 1);
            int idx = day.tm_mday - 1;
            if (want > have)
                idx = c.days - 1;
            else if (want < have)
                idx = 0;
            idx = constrain(idx, 0, c.days - 1);

            out.valid = true;
            out.year = c.year;
            out.month = c.month;
            out.day = idx + 1;
            memcpy(out.minutes, c.minutes[idx], sizeof(out.minutes));

            // Korrekturen aus den Einstellungen (Minuten), Sonnenaufgang bleibt unverändert
            const settings::Settings st = settings::get();
            const int8_t offsets[PRAYER_COUNT] = {st.fajrOffset, 0, st.dhuhrOffset, st.asrOffset,
                                                  st.maghribOffset, st.ishaOffset};
            for (int p = 0; p < PRAYER_COUNT; p++)
                out.minutes[p] = constrain((int)out.minutes[p] + offsets[p], 0, 24 * 60 - 1);
            out.hijriYear = c.hijriYear[idx];
            out.hijriMonth = c.hijriMonth[idx];
            out.hijriDay = c.hijriDay[idx];
        }
        xSemaphoreGive(s_lock);
        return ok;
    }

    void next(const struct tm &now, const model::PrayerDay &day, model::Prayer &prayer, int32_t &secondsLeft)
    {
        const int32_t nowSec = now.tm_hour * 3600 + now.tm_min * 60 + now.tm_sec;
        for (model::Prayer p : model::DAILY_PRAYERS)
        {
            if (day.minutes[p] * 60 > nowSec)
            {
                prayer = p;
                secondsLeft = day.minutes[p] * 60 - nowSec;
                return;
            }
        }
        prayer = model::FAJR;
        secondsLeft = day.minutes[model::FAJR] * 60 + 24 * 3600 - nowSec;
    }

    bool night(const struct tm &now, model::NightTimes &out)
    {
        out = {};
        // Tage um Heute herum; mktime rechnet über Monatsgrenzen
        auto dayAt = [&](int offset, model::PrayerDay &d) {
            struct tm t = now;
            t.tm_mday += offset;
            t.tm_hour = 12;
            t.tm_isdst = -1;
            mktime(&t);
            return forDay(t, d);
        };
        model::PrayerDay today, tomorrow, evening;
        if (!dayAt(0, today) || !dayAt(1, tomorrow))
            return false;

        const int32_t nowSec = now.tm_hour * 3600 + now.tm_min * 60 + now.tm_sec;
        // Vor Fajr gehört die Zeit noch zur Nacht, die gestern Abend begann
        const bool before = nowSec < today.minutes[model::FAJR] * 60;
        int32_t frameSec = nowSec;
        int32_t fajr = today.minutes[model::FAJR];
        if (before)
        {
            if (!dayAt(-1, evening))
                return false;
            frameSec += 24 * 3600;
            fajr += 24 * 60;
        }
        else
        {
            evening = today;
            fajr = tomorrow.minutes[model::FAJR] + 24 * 60;
        }

        out.maghrib = evening.minutes[model::MAGHRIB];
        out.fajr = fajr;
        out.lengthMin = fajr - out.maghrib;
        if (out.lengthMin <= 0)
            return false;
        out.midnight = out.maghrib + (out.lengthMin + 1) / 2;
        out.lastThird = out.maghrib + (out.lengthMin * 2 + 1) / 3;
        out.sunrise = nowSec < today.minutes[model::SUNRISE] * 60 ? today.minutes[model::SUNRISE]
                                                                  : tomorrow.minutes[model::SUNRISE] + 24 * 60;
        out.secondsToLastThird = out.lastThird * 60 - frameSec;
        out.valid = true;
        return true;
    }

    // Auch Änderungen der Einstellungen (z. B. Korrekturen) zählen als neue Zeiten
    uint32_t version() { return s_version + settings::version(); }
}

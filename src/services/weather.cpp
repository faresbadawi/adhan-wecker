#include "weather.h"
#include <Arduino.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include "config.h"
#include "http_util.h"
#include "net_lock.h"
#include "settings.h"

namespace weather
{
    static SemaphoreHandle_t s_lock;
    static model::Weather s_data;
    static volatile uint32_t s_version = 0;

    // WMO-Wettercode -> Himmel (https://open-meteo.com/en/docs, "WMO Weather interpretation codes")
    static model::Sky skyFromWmo(int code)
    {
        using model::Sky;
        if (code == 0) return Sky::CLEAR;
        if (code <= 2) return Sky::PARTLY_CLOUDY;
        if (code == 3) return Sky::CLOUDY;
        if (code == 45 || code == 48) return Sky::FOG;
        if (code >= 51 && code <= 57) return Sky::DRIZZLE;
        if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return Sky::RAIN;
        if ((code >= 71 && code <= 77) || code == 85 || code == 86) return Sky::SNOW;
        if (code >= 95) return Sky::THUNDER;
        return Sky::CLOUDY;
    }

    static bool fetch(float lat, float lon, model::Weather &w)
    {
        char url[320];
        snprintf(url, sizeof(url),
                 "http://api.open-meteo.com/v1/forecast?latitude=%.4f&longitude=%.4f"
                 "&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day"
                 "&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=3",
                 lat, lon);

        // Einfaches HTTP: öffentliche Daten, und TLS bräuchte ~40 kB internen RAM
        netlock::Guard net; // nicht gleichzeitig mit den Gebetszeiten
        WiFiClient client;
        HTTPClient http;
        http.useHTTP10(true);
        http.setTimeout(15000);
        if (!http.begin(client, url))
            return false;
        const int code = http.GET();
        if (code != 200)
        {
            Serial.printf("Wetter: HTTP %d\n", code);
            http.end();
            return false;
        }
        String body; // klein (~1 kB)
        const bool complete = httputil::readBody(http, body);
        http.end();
        if (!complete)
            return false;

        JsonDocument doc;
        const DeserializationError err = deserializeJson(doc, body);
        if (err)
        {
            Serial.printf("Wetter: JSON-Fehler %s\n", err.c_str());
            return false;
        }

        JsonObject cur = doc["current"];
        JsonObject daily = doc["daily"];
        if (cur.isNull() || daily.isNull())
            return false;

        w = {};
        w.valid = true;
        w.isDay = (cur["is_day"] | 1) == 1;
        w.sky = skyFromWmo(cur["weather_code"] | 3);
        w.temp = cur["temperature_2m"] | 0.0f;
        w.feelsLike = cur["apparent_temperature"] | 0.0f;
        w.humidity = cur["relative_humidity_2m"] | 0;
        w.windKmh = cur["wind_speed_10m"] | 0.0f;
        for (int i = 0; i < 3; i++)
        {
            w.forecast[i].sky = skyFromWmo(daily["weather_code"][i] | 3);
            w.forecast[i].tempMax = lroundf(daily["temperature_2m_max"][i] | 0.0f);
            w.forecast[i].tempMin = lroundf(daily["temperature_2m_min"][i] | 0.0f);
        }
        w.tempMax = w.forecast[0].tempMax;
        w.tempMin = w.forecast[0].tempMin;
        return true;
    }

    static void task(void *)
    {
        uint32_t loadedFor = 0;  // Einstellungs-Version des letzten Abrufs
        uint32_t nextFetch = 0;  // millis() des nächsten planmäßigen Abrufs
        for (;;)
        {
            vTaskDelay(pdMS_TO_TICKS(2000));
            const bool moved = settings::version() != loadedFor; // Standort evtl. geändert
            if (WiFi.status() != WL_CONNECTED || (!moved && (int32_t)(millis() - nextFetch) < 0))
                continue;

            const uint32_t ver = settings::version();
            const settings::Settings st = settings::get();
            static model::Weather fresh;
            if (fetch(st.latitude, st.longitude, fresh))
            {
                xSemaphoreTake(s_lock, portMAX_DELAY);
                s_data = fresh;
                xSemaphoreGive(s_lock);
                s_version++;
                loadedFor = ver;
                nextFetch = millis() + WEATHER_INTERVAL_MIN * 60000UL;
                Serial.printf("Wetter geladen: %.1f C\n", fresh.temp);
            }
            else
            {
                loadedFor = ver;
                nextFetch = millis() + 60000; // später erneut versuchen
            }
        }
    }

    void begin()
    {
        s_lock = xSemaphoreCreateMutex();
        xTaskCreatePinnedToCore(task, "weather", 8192, nullptr, 1, nullptr, 0);
    }

    bool get(model::Weather &out)
    {
        xSemaphoreTake(s_lock, portMAX_DELAY);
        out = s_data;
        xSemaphoreGive(s_lock);
        return out.valid;
    }

    uint32_t version() { return s_version; }

    bool fetchAt(float lat, float lon, model::Weather &out) { return fetch(lat, lon, out); }

    bool geocode(const char *name, float &lat, float &lon, String &displayName)
    {
        String url = "http://geocoding-api.open-meteo.com/v1/search?count=1&language=ar&name=";
        for (const char *p = name; *p; p++) // URL-kodieren
        {
            const uint8_t c = *p;
            if (isalnum(c) || c == '-' || c == '.')
                url += (char)c;
            else
            {
                char b[4];
                snprintf(b, sizeof(b), "%%%02X", c);
                url += b;
            }
        }
        netlock::Guard net;
        WiFiClient client;
        HTTPClient http;
        http.useHTTP10(true);
        http.setTimeout(10000);
        if (!http.begin(client, url) || http.GET() != 200)
        {
            http.end();
            return false;
        }
        String body;
        const bool ok = httputil::readBody(http, body);
        http.end();
        JsonDocument doc;
        if (!ok || deserializeJson(doc, body))
            return false;
        JsonObject r = doc["results"][0];
        if (r.isNull())
            return false;
        lat = r["latitude"] | 0.0f;
        lon = r["longitude"] | 0.0f;
        displayName = String((const char *)(r["name"] | name)) + "، " + String((const char *)(r["country"] | ""));
        return true;
    }
}

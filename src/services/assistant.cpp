#include "assistant.h"
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <LittleFS.h>
#include <Preferences.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <time.h>
#include "audio_manager.h"
#include "http_util.h"
#include "net_lock.h"
#include "prayer_times.h"
#include "settings.h"
#include "time_manager.h"
#include "weather.h"

namespace assistant
{
    static constexpr const char *HOST = "https://api.openai.com";
    static constexpr const char *NVS = "assistant";
    static constexpr size_t MAX_SAMPLES = 16000 * 8; // höchstens 8 s Aufnahme
    static constexpr const char *TTS_FILE = "/tts.mp3";

    struct Request
    {
        bool voice;
        char text[200];
    };

    static SemaphoreHandle_t s_lock;
    static QueueHandle_t s_queue;
    static Status s_status;
    static volatile bool s_dismissed = false;
    static String s_key;
    static Config s_config;

    // ---------- Status

    static void setState(State st, const String *question = nullptr, const String *answer = nullptr,
                         const String *error = nullptr)
    {
        xSemaphoreTake(s_lock, portMAX_DELAY);
        s_status.state = st;
        if (question)
            s_status.question = *question;
        if (answer)
            s_status.answer = *answer;
        if (error)
            s_status.error = *error;
        s_status.version++;
        xSemaphoreGive(s_lock);
    }

    static void fail(const String &msg)
    {
        Serial.printf("Assistent: %s\n", msg.c_str());
        if (!s_dismissed)
            setState(State::ERROR, nullptr, nullptr, &msg);
    }

    // ---------- HTTP zu OpenAI

    // Fehlermeldung aus {"error":{"message":...}} herauslösen
    static String apiError(int code, const String &body)
    {
        JsonDocument doc;
        String msg;
        if (!deserializeJson(doc, body))
            msg = doc["error"]["message"] | "";
        if (msg.length() > 140)
            msg = msg.substring(0, 140) + "…";
        return "OpenAI " + String(code) + (msg.length() ? ": " + msg : "");
    }

    static bool begin(HTTPClient &http, WiFiClientSecure &client, const char *path)
    {
        Serial.printf("Assistent: %s, RAM intern frei %u kB (groesster Block %u kB)\n", path,
                      heap_caps_get_free_size(MALLOC_CAP_INTERNAL) / 1024,
                      heap_caps_get_largest_free_block(MALLOC_CAP_INTERNAL) / 1024);
        client.setInsecure(); // TLS ohne hinterlegtes Zertifikat
        http.useHTTP10(true);
        http.setTimeout(30000);
        if (!http.begin(client, String(HOST) + path))
            return false;
        http.addHeader("Authorization", "Bearer " + s_key);
        return true;
    }

    static int postJson(const char *path, const String &body, String &response)
    {
        netlock::Guard net;
        WiFiClientSecure client;
        HTTPClient http;
        if (!begin(http, client, path))
            return -1;
        http.addHeader("Content-Type", "application/json");
        const int code = http.POST(body);
        if (code > 0)
            httputil::readBody(http, response);
        http.end();
        return code;
    }

    // ---------- Schritt 1: Spracherkennung

    static bool transcribe(int16_t *pcm, size_t samples, String &text)
    {
        // Lautstärke angleichen (Mikrofon ist leise): Spitze auf ~90 %
        int peak = 1;
        for (size_t i = 0; i < samples; i++)
            peak = max(peak, abs((int)pcm[i]));
        const float gain = min(16.0f, 29000.0f / peak);
        for (size_t i = 0; i < samples; i++)
            pcm[i] = (int16_t)constrain((int)(pcm[i] * gain), -32768, 32767);

        // multipart/form-data mit WAV-Datei im PSRAM zusammenbauen
        const char *boundary = "----adhanclock7f3a";
        String head;
        head += String("--") + boundary + "\r\nContent-Disposition: form-data; name=\"model\"\r\n\r\n" + s_config.sttModel + "\r\n";
        head += String("--") + boundary + "\r\nContent-Disposition: form-data; name=\"language\"\r\n\r\nar\r\n";
        head += String("--") + boundary +
                "\r\nContent-Disposition: form-data; name=\"file\"; filename=\"audio.wav\"\r\nContent-Type: audio/wav\r\n\r\n";
        const String tail = String("\r\n--") + boundary + "--\r\n";

        const uint32_t dataBytes = samples * 2;
        uint8_t wav[44];
        auto put32 = [&](int at, uint32_t v) { memcpy(wav + at, &v, 4); };
        auto put16 = [&](int at, uint16_t v) { memcpy(wav + at, &v, 2); };
        memcpy(wav, "RIFF", 4);
        put32(4, 36 + dataBytes);
        memcpy(wav + 8, "WAVEfmt ", 8);
        put32(16, 16);
        put16(20, 1);         // PCM
        put16(22, 1);         // mono
        put32(24, 16000);     // Abtastrate
        put32(28, 16000 * 2); // Bytes pro Sekunde
        put16(32, 2);
        put16(34, 16);
        memcpy(wav + 36, "data", 4);
        put32(40, dataBytes);

        const size_t total = head.length() + sizeof(wav) + dataBytes + tail.length();
        auto *body = (uint8_t *)ps_malloc(total);
        if (!body)
            return false;
        size_t at = 0;
        memcpy(body + at, head.c_str(), head.length());
        at += head.length();
        memcpy(body + at, wav, sizeof(wav));
        at += sizeof(wav);
        memcpy(body + at, pcm, dataBytes);
        at += dataBytes;
        memcpy(body + at, tail.c_str(), tail.length());

        String response;
        int code;
        {
            netlock::Guard net;
            WiFiClientSecure client;
            HTTPClient http;
            if (!begin(http, client, "/v1/audio/transcriptions"))
            {
                free(body);
                return false;
            }
            http.addHeader("Content-Type", String("multipart/form-data; boundary=") + boundary);
            code = http.POST(body, total);
            if (code > 0)
                httputil::readBody(http, response);
            http.end();
        }
        free(body);
        if (code != 200)
        {
            fail(apiError(code, response));
            return false;
        }
        JsonDocument doc;
        if (deserializeJson(doc, response))
            return false;
        text = doc["text"] | "";
        text.trim();
        return true;
    }

    // ---------- Schritt 2: Antwort

    static const char *skyEnglish(model::Sky s)
    {
        static const char *NAMES[] = {"clear", "partly cloudy", "cloudy", "fog", "drizzle", "rain", "snow", "thunderstorm"};
        return NAMES[(int)s];
    }

    static String hhmm(int minutes)
    {
        char b[6];
        snprintf(b, sizeof(b), "%02d:%02d", minutes / 60, minutes % 60);
        return b;
    }

    static String prayerLine(const model::PrayerDay &d)
    {
        static const char *N[] = {"Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"};
        String s;
        for (int p = 0; p < model::PRAYER_COUNT; p++)
            s += String(N[p]) + " " + hhmm(d.minutes[p]) + (p < model::PRAYER_COUNT - 1 ? ", " : "");
        return s;
    }

    static String weatherJson(const model::Weather &w)
    {
        JsonDocument d;
        d["temperature_c"] = lroundf(w.temp);
        d["feels_like_c"] = lroundf(w.feelsLike);
        d["humidity_percent"] = w.humidity;
        d["wind_kmh"] = lroundf(w.windKmh);
        d["condition"] = skyEnglish(w.sky);
        d["is_day"] = w.isDay;
        static const char *DAYS[] = {"today", "tomorrow", "day_after_tomorrow"};
        for (int i = 0; i < 3; i++)
        {
            d[DAYS[i]]["max_c"] = w.forecast[i].tempMax;
            d[DAYS[i]]["min_c"] = w.forecast[i].tempMin;
            d[DAYS[i]]["condition"] = skyEnglish(w.forecast[i].sky);
        }
        String out;
        serializeJson(d, out);
        return out;
    }

    // Hintergrundwissen für die KI: Ort, Zeit, Datum, Gebetszeiten, Wetter
    static String context()
    {
        static const char *WEEKDAYS[] = {"الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"};
        static const char *HIJRI[] = {"محرم", "صفر", "ربيع الأول", "ربيع الآخر", "جمادى الأولى", "جمادى الآخرة",
                                      "رجب", "شعبان", "رمضان", "شوال", "ذو القعدة", "ذو الحجة"};
        const settings::Settings st = settings::get();
        String c = "Location: " + String(st.city) + " (" + st.country + "), lat " + String(st.latitude, 3) +
                   ", lon " + String(st.longitude, 3) + "\n";

        struct tm now;
        if (timemgr::now(now))
        {
            char b[48];
            strftime(b, sizeof(b), "%Y-%m-%d %H:%M", &now);
            c += "Current local time: " + String(b) + ", weekday " + WEEKDAYS[now.tm_wday] + "\n";

            model::PrayerDay today;
            if (prayers::forDay(now, today))
            {
                if (today.hijriMonth >= 1 && today.hijriMonth <= 12)
                    c += "Hijri date: " + String(today.hijriDay) + " " + HIJRI[today.hijriMonth - 1] + " " +
                         String(today.hijriYear) + "\n";
                c += "Prayer times today: " + prayerLine(today) + "\n";
                struct tm t2 = now;
                t2.tm_mday += 1;
                mktime(&t2);
                model::PrayerDay tomorrow;
                if (prayers::forDay(t2, tomorrow))
                    c += "Prayer times tomorrow: " + prayerLine(tomorrow) + "\n";
                model::Prayer next;
                int32_t left;
                prayers::next(now, today, next, left);
                c += "Next prayer: " + String(model::prayerName(next)) + " in " + String(left / 60) + " minutes\n";
            }
            c += String("Prayer time source: ") +
                 (st.prayerSource == settings::SOURCE_MAWAQIT ? "mosque \"" + String(st.mawaqitName) + "\" (Mawaqit)"
                                                              : "astronomical calculation") +
                 "\n";
        }
        model::Weather w;
        if (weather::get(w))
            c += "Weather here now: " + weatherJson(w) + "\n";
        return c;
    }

    // Werkzeug der KI: Wetter einer anderen Stadt
    static String toolWeather(const char *city)
    {
        float lat, lon;
        String name;
        if (!weather::geocode(city, lat, lon, name))
            return "{\"error\":\"city not found\"}";
        model::Weather w;
        if (!weather::fetchAt(lat, lon, w))
            return "{\"error\":\"weather unavailable\"}";
        String j = weatherJson(w);
        j.remove(j.length() - 1);
        JsonDocument n;
        n.set(name);
        String quoted;
        serializeJson(n, quoted);
        return j + ",\"city\":" + quoted + "}";
    }

    static bool chat(const String &question, String &answer)
    {
        JsonDocument req;
        req["model"] = s_config.chatModel;
        req["max_tokens"] = 220;
        JsonArray msgs = req["messages"].to<JsonArray>();
        JsonObject sys = msgs.add<JsonObject>();
        sys["role"] = "system";
        sys["content"] = String(
                             "You are the voice assistant of an Islamic prayer clock (Adhan clock). Always answer in "
                             "Modern Standard Arabic, warmly and very briefly: at most two short sentences, under 30 "
                             "words, because the answer is spoken aloud. Use only the facts below for prayer times, "
                             "date and time; never invent them. Write times as 24-hour digits like 13:08. For the "
                             "weather in another city, call get_weather. If you do not know something, say so "
                             "briefly.\n\nFacts:\n") +
                         context();
        JsonObject user = msgs.add<JsonObject>();
        user["role"] = "user";
        user["content"] = question;

        JsonObject tool = req["tools"].add<JsonObject>();
        tool["type"] = "function";
        tool["function"]["name"] = "get_weather";
        tool["function"]["description"] = "Current weather and 3-day forecast for a city anywhere in the world.";
        tool["function"]["parameters"]["type"] = "object";
        tool["function"]["parameters"]["properties"]["city"]["type"] = "string";
        tool["function"]["parameters"]["properties"]["city"]["description"] = "City name, in any language";
        tool["function"]["parameters"]["required"].add("city");

        for (int round = 0; round < 3; round++)
        {
            String body, response;
            serializeJson(req, body);
            const int code = postJson("/v1/chat/completions", body, response);
            if (code != 200)
            {
                fail(apiError(code, response));
                return false;
            }
            JsonDocument res;
            if (deserializeJson(res, response))
                return false;
            JsonObject msg = res["choices"][0]["message"];
            JsonArray calls = msg["tool_calls"];
            if (calls.isNull() || calls.size() == 0)
            {
                answer = msg["content"] | "";
                answer.trim();
                return answer.length() > 0;
            }

            // Werkzeugaufrufe ausführen und Ergebnisse zurückgeben
            msgs.add(msg);
            for (JsonObject call : calls)
            {
                JsonDocument args;
                deserializeJson(args, call["function"]["arguments"] | "{}");
                const String result = toolWeather(args["city"] | "");
                Serial.printf("Assistent: Wetter fuer %s\n", (const char *)(args["city"] | ""));
                JsonObject t = msgs.add<JsonObject>();
                t["role"] = "tool";
                t["tool_call_id"] = call["id"];
                t["content"] = result;
            }
        }
        return false;
    }

    // ---------- Schritt 3: Sprachausgabe

    static bool speak(const String &text)
    {
        JsonDocument req;
        req["model"] = s_config.ttsModel;
        req["voice"] = s_config.voice;
        req["input"] = text;
        req["response_format"] = "mp3";
        String body;
        serializeJson(req, body);

        int code;
        bool ok = false;
        String error;
        {
            netlock::Guard net;
            WiFiClientSecure client;
            HTTPClient http;
            if (!begin(http, client, "/v1/audio/speech"))
                return false;
            http.addHeader("Content-Type", "application/json");
            code = http.POST(body);
            if (code == 200)
            {
                File f = LittleFS.open(TTS_FILE, "w");
                ok = f && httputil::readBodyToFile(http, f);
                f.close();
            }
            else if (code > 0)
            {
                httputil::readBody(http, error);
            }
            http.end();
        }
        if (code != 200)
        {
            fail(apiError(code, error));
            return false;
        }
        if (!ok)
            return false;
        audio::play(LittleFS, TTS_FILE);
        return true;
    }

    // ---------- Ablauf

    static void handle(const Request &r)
    {
        s_dismissed = false;
        const String empty;
        String question;
        if (r.voice)
        {
            setState(State::LISTENING, &empty, &empty, &empty);
            auto *pcm = (int16_t *)ps_malloc(MAX_SAMPLES * 2);
            if (!pcm)
                return fail("no memory");
            bool speech = false;
            const size_t n = audio::recordSpeech(pcm, MAX_SAMPLES, speech);
            if (s_dismissed)
            {
                free(pcm);
                return setState(State::IDLE);
            }
            if (!speech || n < 16000 / 2)
            {
                free(pcm);
                const String msg = "لم أسمعك، حاول مرة أخرى";
                return setState(State::ERROR, nullptr, nullptr, &msg);
            }
            setState(State::THINKING);
            const bool ok = transcribe(pcm, n, question);
            if (s_dismissed)
            {
                free(pcm);
                return setState(State::IDLE);
            }
            free(pcm);
            if (!ok)
            {
                if (s_status.state != State::ERROR)
                    fail("transcription failed");
                return;
            }
            if (question.isEmpty())
            {
                const String msg = "لم أفهم السؤال، حاول مرة أخرى";
                return setState(State::ERROR, nullptr, nullptr, &msg);
            }
        }
        else
        {
            question = r.text;
        }
        if (s_dismissed)
            return setState(State::IDLE);

        Serial.printf("Assistent: Frage \"%s\"\n", question.c_str());
        setState(State::THINKING, &question, &empty, &empty);
        String answer;
        if (!chat(question, answer))
        {
            if (s_status.state != State::ERROR)
                fail("no answer");
            return;
        }
        Serial.printf("Assistent: Antwort \"%s\"\n", answer.c_str());
        if (s_dismissed)
            return setState(State::IDLE);

        setState(State::SPEAKING, nullptr, &answer);
        if (speak(answer))
        {
            const uint32_t start = millis();
            vTaskDelay(pdMS_TO_TICKS(300));
            while (audio::isPlaying() && !s_dismissed && millis() - start < 60000)
                vTaskDelay(pdMS_TO_TICKS(100));
        }
        else if (s_status.state == State::ERROR)
        {
            return; // Fehler der Sprachausgabe anzeigen, Text bleibt
        }
        setState(s_dismissed ? State::IDLE : State::ANSWER);
    }

    static void task(void *)
    {
        Request r;
        for (;;)
            if (xQueueReceive(s_queue, &r, portMAX_DELAY) == pdTRUE)
                handle(r);
    }

    // ---------- Schnittstelle

    static void loadConfig()
    {
        Preferences p;
        p.begin(NVS, true);
        s_key = p.getString("key", "");
        s_config.chatModel = p.getString("chat", s_config.chatModel);
        s_config.sttModel = p.getString("stt", s_config.sttModel);
        s_config.ttsModel = p.getString("tts", s_config.ttsModel);
        s_config.voice = p.getString("voice", s_config.voice);
        p.end();
    }

    void begin()
    {
        s_lock = xSemaphoreCreateMutex();
        s_queue = xQueueCreate(1, sizeof(Request));
        loadConfig();
        // großer Stack: TLS und JSON
        xTaskCreatePinnedToCore(task, "assistant", 12288, nullptr, 1, nullptr, 0);
    }

    static bool busy()
    {
        const State st = status().state;
        return st == State::LISTENING || st == State::THINKING || st == State::SPEAKING;
    }

    static bool enqueue(const Request &r)
    {
        if (busy() || WiFi.status() != WL_CONNECTED)
            return false;
        if (s_key.isEmpty())
        {
            const String msg = "أدخل مفتاح OpenAI في صفحة الإعدادات";
            setState(State::ERROR, nullptr, nullptr, &msg);
            return false;
        }
        return xQueueSend(s_queue, &r, 0) == pdTRUE;
    }

    bool listen()
    {
        Request r = {true, {}};
        return enqueue(r);
    }

    bool ask(const String &text)
    {
        Request r = {false, {}};
        strlcpy(r.text, text.c_str(), sizeof(r.text));
        return enqueue(r);
    }

    // Schließt das Fenster sofort; ein laufender Ablauf bricht beim nächsten Schritt ab
    void dismiss()
    {
        s_dismissed = true;
        const State st = status().state;
        if (st == State::SPEAKING)
            audio::stop();
        if (st != State::IDLE)
            setState(State::IDLE);
    }

    Status status()
    {
        xSemaphoreTake(s_lock, portMAX_DELAY);
        Status copy = s_status;
        xSemaphoreGive(s_lock);
        return copy;
    }

    uint32_t version() { return s_status.version; }

    bool hasKey() { return !s_key.isEmpty(); }

    String keyHint() { return s_key.length() > 8 ? "…" + s_key.substring(s_key.length() - 4) : ""; }

    void setKey(const String &key)
    {
        s_key = key;
        s_key.trim();
        Preferences p;
        p.begin(NVS, false);
        p.putString("key", s_key);
        p.end();
    }

    Config config() { return s_config; }

    void setConfig(const Config &c)
    {
        s_config = c;
        Preferences p;
        p.begin(NVS, false);
        p.putString("chat", c.chatModel);
        p.putString("stt", c.sttModel);
        p.putString("tts", c.ttsModel);
        p.putString("voice", c.voice);
        p.end();
    }
}

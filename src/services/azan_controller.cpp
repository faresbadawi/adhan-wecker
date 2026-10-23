#include "azan_controller.h"
#include <Arduino.h>
#include <LittleFS.h>
#include <Preferences.h>
#include "audio_manager.h"
#include "config.h"
#include "storage.h"

namespace azan
{
    static Status s_status;
    static uint32_t s_startedMs = 0; // Beginn (millis)
    static uint32_t s_mutedMs = 0;
    static int32_t s_lastKey = -1;   // zuletzt ausgelöstes Gebet (Datum + Index), verhindert Doppelstart
    static uint8_t s_volume[5] = {100, 100, 100, 100, 100}; // Prozent je Gebet

    static const char *fileName(model::Prayer p)
    {
        switch (p)
        {
        case model::FAJR: return "azan_fajr.mp3";
        case model::DHUHR: return "azan_dhuhr.mp3";
        case model::ASR: return "azan_asr.mp3";
        case model::MAGHRIB: return "azan_maghrib.mp3";
        case model::ISHA: return "azan_isha.mp3";
        default: return "";
        }
    }

    static bool validId(const String &id)
    {
        return !id.isEmpty() && id.length() <= 24 && id.indexOf('/') < 0 && id.indexOf('.') < 0;
    }

    bool voiceExists(const String &id) { return validId(id) && LittleFS.exists("/azans/" + id + ".mp3"); }

    String voice()
    {
        Preferences pr;
        pr.begin("audio", true);
        String id = pr.getString("azan", "alafasy");
        pr.end();
        return voiceExists(id) ? id : String("alafasy");
    }

    bool setVoice(const String &id)
    {
        if (!voiceExists(id))
            return false;
        Preferences pr;
        pr.begin("audio", false);
        pr.putString("azan", id);
        pr.end();
        return true;
    }

    bool voiceFile(const String &id, model::Prayer p, char *path, size_t len)
    {
        if (!validId(id))
            return false;
        if (p == model::FAJR)
        {
            snprintf(path, len, "/azans/%s_fajr.mp3", id.c_str());
            if (LittleFS.exists(path))
                return true;
        }
        snprintf(path, len, "/azans/%s.mp3", id.c_str());
        return LittleFS.exists(path);
    }

    static Timing s_timing = {{0, 0, 0, 0, 0}, {0, 0, 0, 0, 0}};
    static bool s_timingLoaded = false;

    static void loadTiming()
    {
        if (s_timingLoaded)
            return;
        s_timingLoaded = true;
        Preferences pr;
        pr.begin("azanx", true);
        uint8_t blob[11] = {};
        if (pr.getBytesLength("timing") == sizeof(blob) && pr.getBytes("timing", blob, sizeof(blob)) == sizeof(blob) && blob[0] == 1)
        {
            memcpy(s_timing.delay, blob + 1, 5);
            memcpy(s_timing.remind, blob + 6, 5);
        }
        pr.end();
    }

    Timing timing()
    {
        loadTiming();
        return s_timing;
    }

    bool setTiming(const Timing &t)
    {
        for (int i = 0; i < 5; i++)
            if (t.delay[i] > MAX_DELAY || t.remind[i] > MAX_REMIND)
                return false;
        loadTiming();
        s_timing = t;
        uint8_t blob[11] = {1};
        memcpy(blob + 1, t.delay, 5);
        memcpy(blob + 6, t.remind, 5);
        Preferences pr;
        pr.begin("azanx", false);
        pr.putBytes("timing", blob, sizeof(blob));
        pr.end();
        return true;
    }

    int maxDelay(const model::PrayerDay &day, int i)
    {
        const int own = day.minutes[model::DAILY_PRAYERS[i]];
        int limit;
        switch (i)
        {
        case 0: limit = day.minutes[model::SUNRISE]; break;
        case 1: limit = day.minutes[model::ASR]; break;
        case 2: limit = day.minutes[model::MAGHRIB]; break;
        case 3: limit = day.minutes[model::ISHA]; break;
        default: limit = 1440; break;
        }
        return constrain(limit - own - 1, 0, (int)MAX_DELAY);
    }

    int azanMinute(const model::PrayerDay &day, int i)
    {
        loadTiming();
        const int d = min<int>(s_timing.delay[i], maxDelay(day, i));
        return day.minutes[model::DAILY_PRAYERS[i]] + d;
    }

    bool playReminder(int i)
    {
        if (audio::isPlaying() || s_status.state != State::IDLE)
            return false;
        char path[96];
        fs::FS *fs = storage::find(AZAN_DIR_SD, "/sounds", "calm.mp3", path, sizeof(path));
        if (!fs)
            return false;
        audio::setVolume(max(1, (int)((s_volume[i] * 21 + 50) / 100 * 6 / 10))); // leiser als der Azan
        audio::play(*fs, path);
        return true;
    }

    void setVolumes(const uint8_t percent[5]) { memcpy(s_volume, percent, sizeof(s_volume)); }

    void applyVolume(model::Prayer p)
    {
        uint8_t percent = 100;
        for (int i = 0; i < 5; i++)
            if (model::DAILY_PRAYERS[i] == p)
                percent = s_volume[i];
        audio::setVolume((percent * 21 + 50) / 100); // Decoder 0..21
    }

    void start(model::Prayer p, uint16_t minutes)
    {
        s_status = {};
        s_status.state = State::PLAYING;
        s_status.prayer = p;
        s_status.minutes = minutes;
        s_startedMs = millis();

        // Eigene Dateien auf der SD-Karte haben Vorrang (z. B. azan_fajr.mp3, azan.mp3),
        // sonst die gewählte Azan-Stimme aus dem LittleFS
        char path[96];
        fs::FS *fs = storage::find(AZAN_DIR_SD, AZAN_DIR_FLASH, fileName(p), path, sizeof(path));
        if (!fs)
            fs = storage::find(AZAN_DIR_SD, AZAN_DIR_FLASH, "azan.mp3", path, sizeof(path));
        if (!fs && (voiceFile(voice(), p, path, sizeof(path)) || voiceFile("alafasy", p, path, sizeof(path))))
            fs = &LittleFS;
        s_status.hasAudio = fs != nullptr;
        if (fs)
        {
            applyVolume(p);
            audio::play(*fs, path);
        }
        Serial.printf("Azan %s: %s\n", model::prayerName(p), fs ? path : "keine Audiodatei gefunden");
    }

    void mute()
    {
        if (s_status.state != State::PLAYING)
            return;
        audio::stop();
        s_status.state = State::MUTED;
        s_mutedMs = millis();
    }

    void skip()
    {
        audio::stop();
        s_status.state = State::IDLE;
    }

    void update(const struct tm &now, const model::PrayerDay &day, uint8_t enabledMask)
    {
        // Beginn einer Gebetszeit erkennen (einmal pro Gebet und Tag)
        if (day.valid && s_status.state == State::IDLE)
        {
            const int nowMin = now.tm_hour * 60 + now.tm_min;
            const int32_t date = (now.tm_year + 1900) * 10000 + (now.tm_mon + 1) * 100 + now.tm_mday;
            for (int i = 0; i < 5; i++)
            {
                const model::Prayer p = model::DAILY_PRAYERS[i];
                const int32_t key = date * 10 + p;
                if (azanMinute(day, i) == nowMin && key != s_lastKey && (enabledMask & (1 << i)))
                {
                    s_lastKey = key;
                    start(p, day.minutes[p]); // angezeigt wird die echte Gebetszeit, nicht die verschobene
                    break;
                }
            }
        }

        switch (s_status.state)
        {
        case State::PLAYING:
            if (s_status.hasAudio)
            {
                s_status.elapsed = audio::elapsedSeconds();
                s_status.duration = audio::durationSeconds();
                if (!audio::isPlaying())
                {
                    if (s_status.elapsed == 0 && millis() - s_startedMs < 3000)
                        s_status.hasAudio = false; // Datei ließ sich nicht abspielen: Hinweis ohne Ton
                    else
                        s_status.state = State::IDLE; // Azan zu Ende
                }
            }
            else
            {
                s_status.elapsed = (millis() - s_startedMs) / 1000;
                s_status.duration = AZAN_NO_AUDIO_SECONDS;
                if (s_status.elapsed >= s_status.duration)
                    s_status.state = State::IDLE;
            }
            break;
        case State::MUTED:
            if (millis() - s_mutedMs > AZAN_MUTED_RETURN_SECONDS * 1000UL)
                s_status.state = State::IDLE;
            break;
        case State::IDLE:
            break;
        }
    }

    Status status() { return s_status; }
}

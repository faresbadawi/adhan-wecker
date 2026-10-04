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
        String id = pr.getString("azan", "default");
        pr.end();
        return voiceExists(id) ? id : String("default");
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
        if (!fs && (voiceFile(voice(), p, path, sizeof(path)) || voiceFile("default", p, path, sizeof(path))))
            fs = &LittleFS;
        s_status.hasAudio = fs != nullptr;
        if (fs)
            audio::play(*fs, path);
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
                if (day.minutes[p] == nowMin && key != s_lastKey && (enabledMask & (1 << i)))
                {
                    s_lastKey = key;
                    start(p, day.minutes[p]);
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

#include "azan_controller.h"
#include <Arduino.h>
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

    void start(model::Prayer p, uint16_t minutes)
    {
        s_status = {};
        s_status.state = State::PLAYING;
        s_status.prayer = p;
        s_status.minutes = minutes;
        s_startedMs = millis();

        // Eigene Datei pro Gebet (z. B. azan_fajr.mp3), sonst die gemeinsame azan.mp3
        char path[96];
        fs::FS *fs = storage::find(AZAN_DIR_SD, AZAN_DIR_FLASH, fileName(p), path, sizeof(path));
        if (!fs)
            fs = storage::find(AZAN_DIR_SD, AZAN_DIR_FLASH, "azan.mp3", path, sizeof(path));
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

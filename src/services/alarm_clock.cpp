#include "alarm_clock.h"
#include <Arduino.h>
#include "audio_manager.h"
#include "config.h"
#include "storage.h"

namespace alarmclock
{
    static constexpr uint32_t MAX_RING_MS = 10 * 60 * 1000; // spätestens nach 10 Minuten aufhören

    static bool s_ringing = false;
    static uint32_t s_startedMs = 0;
    static int32_t s_lastKey = -1; // zuletzt ausgelöster Wecker (Datum + Index)
    static fs::FS *s_fs = nullptr;
    static char s_path[96];

    static void play()
    {
        if (s_fs)
            audio::play(*s_fs, s_path);
    }

    void update(const struct tm &now, const settings::Settings &st, bool azanActive)
    {
        if (s_ringing)
        {
            if (azanActive)
                s_ringing = false; // Azan hat den Ton übernommen, nicht anhalten
            else if (millis() - s_startedMs > MAX_RING_MS)
                stop();
            else if (!audio::isPlaying())
                play(); // Ton wiederholen
            return;
        }
        if (azanActive)
            return;

        const int32_t date = (now.tm_year + 1900) * 10000 + (now.tm_mon + 1) * 100 + now.tm_mday;
        for (int i = 0; i < st.alarmCount; i++)
        {
            const settings::Alarm &a = st.alarms[i];
            const int32_t key = date * 10 + i;
            if (a.enabled && (a.days & (1 << now.tm_wday)) && a.hour == now.tm_hour && a.minute == now.tm_min &&
                key != s_lastKey)
            {
                s_lastKey = key;
                s_ringing = true;
                s_startedMs = millis();
                s_fs = storage::find(AZAN_DIR_SD, AZAN_DIR_FLASH, "alarm.mp3", s_path, sizeof(s_path));
                Serial.printf("Wecker %02d:%02d: %s\n", a.hour, a.minute, s_fs ? s_path : "keine alarm.mp3");
                play();
                break;
            }
        }
    }

    void stop()
    {
        if (!s_ringing)
            return;
        s_ringing = false;
        audio::stop();
    }

    bool ringing() { return s_ringing; }

    int nextAlarmMinutes(const struct tm &now, const settings::Settings &st)
    {
        const int nowMin = now.tm_hour * 60 + now.tm_min;
        int best = -1, bestDelta = 8 * 24 * 60;
        for (int i = 0; i < st.alarmCount; i++)
        {
            const settings::Alarm &a = st.alarms[i];
            if (!a.enabled || !a.days)
                continue;
            const int m = a.hour * 60 + a.minute;
            // nächster passender Wochentag (heute nur, wenn die Zeit noch kommt)
            for (int d = 0; d < 8; d++)
            {
                const int wday = (now.tm_wday + d) % 7;
                if (!(a.days & (1 << wday)) || (d == 0 && m <= nowMin))
                    continue;
                const int delta = d * 24 * 60 + m - nowMin;
                if (delta < bestDelta)
                {
                    bestDelta = delta;
                    best = m;
                }
                break;
            }
        }
        return best;
    }
}

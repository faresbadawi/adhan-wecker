#include "alarm_clock.h"
#include <Arduino.h>
#include "audio_manager.h"
#include "config.h"
#include "storage.h"

namespace alarmclock
{
    static constexpr uint32_t MAX_RING_MS = 10 * 60 * 1000; // spätestens nach 10 Minuten aufhören

    static bool s_ringing = false;
    static int s_index = -1;
    static uint32_t s_startedMs = 0;
    static int64_t s_fired[settings::MAX_ALARMS]; // je Wecker: Datum + Minute des letzten Klingelns
    static bool s_firedInit = false;
    static int s_snoozeIndex = -1; // geschlummerter Wecker, -1 = keiner
    static uint32_t s_snoozeAtMs = 0;
    static fs::FS *s_fs = nullptr;
    static char s_path[96];

    static void play()
    {
        if (s_fs)
            audio::play(*s_fs, s_path);
    }

    static void startRinging(int index, const settings::Settings &st)
    {
        s_ringing = true;
        s_index = index;
        s_startedMs = millis();
        s_fs = storage::find(AZAN_DIR_SD, AZAN_DIR_FLASH, "alarm.mp3", s_path, sizeof(s_path));
        const settings::Alarm &a = st.alarms[index];
        Serial.printf("Wecker %02d:%02d: %s\n", a.hour, a.minute, s_fs ? s_path : "keine alarm.mp3");
        audio::setVolume(st.volume);
        play();
    }

    void update(const struct tm &now, const settings::Settings &st, bool azanActive)
    {
        if (!s_firedInit)
        {
            for (int64_t &k : s_fired)
                k = -1;
            s_firedInit = true;
        }

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

        // Geschlummert: nach Ablauf wieder klingeln (nicht, wenn der Wecker inzwischen gelöscht oder aus ist)
        if (s_snoozeIndex >= 0)
        {
            if (s_snoozeIndex >= st.alarmCount || !st.alarms[s_snoozeIndex].enabled)
                s_snoozeIndex = -1;
            else if ((int32_t)(millis() - s_snoozeAtMs) >= 0)
            {
                const int index = s_snoozeIndex;
                s_snoozeIndex = -1;
                startRinging(index, st);
                return;
            }
        }

        const int64_t minuteKey =
            ((int64_t)((now.tm_year + 1900) * 10000 + (now.tm_mon + 1) * 100 + now.tm_mday)) * 10000 + now.tm_hour * 60 + now.tm_min;
        int first = -1;
        for (int i = 0; i < st.alarmCount; i++)
        {
            const settings::Alarm &a = st.alarms[i];
            if (a.enabled && (a.days & (1 << now.tm_wday)) && a.hour == now.tm_hour && a.minute == now.tm_min &&
                s_fired[i] != minuteKey)
            {
                // Jeder Wecker dieser Minute gilt als erledigt, sonst klingelt der zweite nach dem Stoppen des ersten
                s_fired[i] = minuteKey;
                if (first < 0)
                    first = i;
            }
        }
        if (first >= 0)
        {
            s_snoozeIndex = -1; // ein neuer Termin ersetzt eine laufende Schlummerzeit
            startRinging(first, st);
        }
    }

    void stop()
    {
        s_snoozeIndex = -1;
        if (!s_ringing)
            return;
        s_ringing = false;
        audio::stop();
    }

    void snooze(int minutes)
    {
        if (!s_ringing)
            return;
        s_ringing = false;
        audio::stop();
        s_snoozeIndex = s_index;
        s_snoozeAtMs = millis() + (uint32_t)minutes * 60000UL;
        Serial.printf("Wecker: %d Minuten Schlummern\n", minutes);
    }

    bool ringing() { return s_ringing; }
    int ringingIndex() { return s_ringing ? s_index : -1; }

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
        if (s_snoozeIndex >= 0)
        {
            const int32_t leftMs = (int32_t)(s_snoozeAtMs - millis());
            const int delta = leftMs > 0 ? (leftMs + 59999) / 60000 : 0;
            if (delta < bestDelta)
                best = (nowMin + delta) % (24 * 60);
        }
        return best;
    }
}

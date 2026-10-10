#include "alarm_clock.h"
#include <Arduino.h>
#include "audio_manager.h"
#include "config.h"
#include "prayer_times.h"
#include "storage.h"

namespace alarmclock
{
    static constexpr uint32_t MAX_RING_MS = 10 * 60 * 1000; // spätestens nach 10 Minuten aufhören
    static constexpr uint32_t RAMP_MS = 45 * 1000;          // sanft lauter bis zur eingestellten Lautstärke
    static constexpr int START_VOLUME = 2;                   // Decoder 0..21
    static int s_rampVolume = -1;

    static bool s_ringing = false;
    static int s_index = -1;
    static uint32_t s_startedMs = 0;
    static time_t s_tahajjudFired = 0; // letztes Klingeln des Nachtweckers
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
        if (index == TAHAJJUD)
            Serial.printf("Wecker letztes Nachtdrittel: %s\n", s_fs ? s_path : "keine alarm.mp3");
        else
            Serial.printf("Wecker %02d:%02d: %s\n", st.alarms[index].hour, st.alarms[index].minute,
                          s_fs ? s_path : "keine alarm.mp3");
        s_rampVolume = min<int>(START_VOLUME, st.volume);
        audio::setVolume(s_rampVolume);
        play();
    }

    // Verschiebung des Nachtweckers in Sekunden, höchstens bis zur Fajr-Zeit
    static int32_t tahajjudShift(const model::NightTimes &n, const settings::Settings &st)
    {
        int32_t untilFajr = n.fajr - n.lastThird;
        if (untilFajr < 0)
            untilFajr += 24 * 60;
        return (int32_t)min<int32_t>(st.tahajjudOffset, untilFajr) * 60;
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
            else
            {
                // leise beginnen und in RAMP_MS bis zur eingestellten Lautstärke steigern
                const uint32_t t = min<uint32_t>(millis() - s_startedMs, RAMP_MS);
                const int start = min<int>(START_VOLUME, st.volume);
                const int v = start + (int)((st.volume - start) * t / RAMP_MS);
                if (v != s_rampVolume)
                {
                    s_rampVolume = v;
                    audio::setVolume(v);
                }
                if (!audio::isPlaying())
                    play(); // Ton wiederholen
            }
            return;
        }
        if (azanActive)
            return;

        // Geschlummert: nach Ablauf wieder klingeln (nicht, wenn der Wecker inzwischen gelöscht oder aus ist)
        if (s_snoozeIndex >= 0)
        {
            const bool gone = s_snoozeIndex == TAHAJJUD ? !st.tahajjudAlarm
                                                        : s_snoozeIndex >= st.alarmCount || !st.alarms[s_snoozeIndex].enabled;
            if (gone)
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
        // Nachtwecker: zum Beginn des letzten Drittels (plus Verschiebung), einmal pro Nacht
        if (first < 0 && st.tahajjudAlarm)
        {
            model::NightTimes n;
            struct tm copy = now;
            const time_t nowT = mktime(&copy);
            if (prayers::night(now, n) && n.secondsToLastThird + tahajjudShift(n, st) <= 0 &&
                n.secondsToLastThird + tahajjudShift(n, st) > -120 &&
                (s_tahajjudFired == 0 || nowT - s_tahajjudFired > 6 * 3600))
            {
                s_tahajjudFired = nowT;
                first = TAHAJJUD;
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
        if (st.tahajjudAlarm)
        {
            model::NightTimes n;
            if (prayers::night(now, n))
            {
                const int32_t left = n.secondsToLastThird + tahajjudShift(n, st);
                const int delta = (left + 59) / 60; // Minuten bis zum Klingeln
                if (left > 0 && delta < bestDelta)
                {
                    bestDelta = delta;
                    best = (nowMin + delta) % (24 * 60);
                }
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

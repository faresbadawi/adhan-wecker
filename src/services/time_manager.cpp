#include "time_manager.h"
#include <Arduino.h>
#include <WiFi.h>
#include "config.h"
#include "net_lock.h"
#include "settings.h"

namespace timemgr
{
    static bool s_demo = false;
    static time_t s_demoBase = 0;    // Demo: Epoche beim Start
    static uint32_t s_demoMillis = 0; // millis() beim Start
    static bool s_sntpStarted = false;

    static time_t localEpoch(int year, int month, int day, int hour, int min, int sec)
    {
        struct tm t = {};
        t.tm_year = year - 1900;
        t.tm_mon = month - 1;
        t.tm_mday = day;
        t.tm_hour = hour;
        t.tm_min = min;
        t.tm_sec = sec;
        t.tm_isdst = -1;
        return mktime(&t);
    }

    // Zeitzone des eingestellten Ortes (POSIX-Regel aus den Einstellungen)
    static String s_tz;
    void applyTimezone()
    {
        const String tz = settings::timezone();
        if (tz == s_tz)
            return;
        s_tz = tz;
        setenv("TZ", s_tz.c_str(), 1);
        tzset();
        Serial.printf("Zeitzone: %s\n", s_tz.c_str());
    }

    void begin(bool demo)
    {
        s_demo = demo;
        if (demo)
        {
            applyTimezone();
            s_demoBase = localEpoch(2026, 10, 1, 18, 42, 0);
            s_demoMillis = millis();
        }
        else
        {
            // Zeitzone sofort, SNTP erst in update() (siehe dort)
            applyTimezone();
        }
    }

    void update()
    {
        if (s_demo || s_sntpStarted || WiFi.status() != WL_CONNECTED)
            return;
        // Der Arduino-Core leert beim ersten hostByName() nach dem Verbinden den DNS-Cache ohne
        // TCPIP-Sperre. Läuft dabei schon eine SNTP-Anfrage, stürzt lwIP ab (udp_remove/udp_new).
        // Deshalb erst eine Adresse auflösen und SNTP danach starten. Nicht blockieren, wenn
        // gerade ein anderer Dienst im Netz ist: dann beim nächsten Aufruf erneut versuchen.
        if (xSemaphoreTake(netlock::handle(), 0) != pdTRUE)
            return;
        IPAddress ip;
        WiFi.hostByName(NTP_SERVER_1, ip);
        xSemaphoreGive(netlock::handle());
        configTzTime(s_tz.c_str(), NTP_SERVER_1, NTP_SERVER_2);
        s_sntpStarted = true;
    }

    bool now(struct tm &out)
    {
        time_t t = s_demo ? s_demoBase + (millis() - s_demoMillis) / 1000 : time(nullptr);
        if (t < 1700000000)
            return false;
        localtime_r(&t, &out);
        return true;
    }

    void demoSetTimeOfDay(int seconds)
    {
        if (!s_demo)
            return;
        s_demoBase = localEpoch(2026, 10, 1, seconds / 3600, seconds / 60 % 60, seconds % 60);
        s_demoMillis = millis();
    }
}

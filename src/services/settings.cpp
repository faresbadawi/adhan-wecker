#include "settings.h"
#include <Preferences.h>
#include <Arduino.h>
#include "config.h"
#include "storage.h"

namespace settings
{
    // Bei jeder Änderung des Struct-Aufbaus erhöhen (ältere Fassungen werden in begin() übernommen).
    static constexpr uint16_t LAYOUT_VERSION = 8;
    static constexpr const char *KEY = "settings";

    struct Stored
    {
        uint16_t layout;
        Settings s;
    };
    struct StoredV7
    {
        uint16_t layout;
        SettingsV7 s;
    };
    struct StoredV6
    {
        uint16_t layout;
        SettingsV6 s;
    };
    struct StoredV5
    {
        uint16_t layout;
        SettingsV5 s;
    };
    struct StoredV4
    {
        uint16_t layout;
        SettingsV4 s;
    };
    struct StoredV3
    {
        uint16_t layout;
        SettingsV3 s;
    };
    struct StoredV2
    {
        uint16_t layout;
        SettingsV2 s;
    };
    struct StoredV1
    {
        uint16_t layout;
        SettingsV1 s;
    };

    static SemaphoreHandle_t s_lock;
    static Settings s_current;
    static volatile uint32_t s_version = 1;

    // Standardwerte der mit Fassung 2 hinzugekommenen Felder (entspricht dem bisherigen Aussehen)
    static void setNewDefaults(Settings &s)
    {
        s.colorMain = 0xFFFFFF;   // Schrift weiß
        s.colorAccent = 0xE9A27C; // Roségold (Gold, Orange, etwas Rosa)
        s.colorMuted = 0xC4B6AE;  // warmes helles Grau
        strlcpy(s.background, "noir", sizeof(s.background));
        for (bool &on : s.azanEnabled)
            on = true;
        s.volume = AZAN_VOLUME;
        s.brightness = 100;
    }

    // Standardwerte der mit Fassung 3 hinzugekommenen Felder: bisherige Reihenfolge
    static void setV3Defaults(Settings &s)
    {
        const uint8_t order[PAGE_ID_COUNT] = {PAGE_ID_CLOCK, PAGE_ID_PRAYER, PAGE_ID_WEATHER, PAGE_ID_CALENDAR};
        memcpy(s.pageOrder, order, sizeof(order));
    }

    // Standardwerte der mit Fassung 8 hinzugekommenen Felder: kein Nachtwecker
    static void setV8Defaults(Settings &s)
    {
        s.tahajjudAlarm = false;
        s.tahajjudOffset = 0;
    }

    // Standardwerte der mit Fassung 7 hinzugekommenen Felder: Nachtseite an
    static void setV7Defaults(Settings &s)
    {
        s.showNight = true;
        setV8Defaults(s);
    }

    // Standardwerte der mit Fassung 6 hinzugekommenen Felder: Fajr und Isha leiser (die Leute schlafen),
    // nachts dunkler
    static void setV6Defaults(Settings &s)
    {
        const uint8_t vol[5] = {25, 100, 100, 100, 35};
        memcpy(s.azanVolume, vol, sizeof(vol));
        s.autoDim = true;
        s.nightBrightness = 20;
        setV7Defaults(s);
    }

    // Standardwerte der mit Fassung 5 hinzugekommenen Felder: keine Wecker
    static void setV5Defaults(Settings &s)
    {
        s.alarmCount = 0;
        memset(s.alarms, 0, sizeof(s.alarms));
        setV6Defaults(s);
    }

    // Standardwerte der mit Fassung 4 hinzugekommenen Felder: wie bisher berechnen
    static void setV4Defaults(Settings &s)
    {
        s.prayerSource = SOURCE_CALCULATED;
        s.mawaqitSlug[0] = 0;
        s.mawaqitName[0] = 0;
        setV5Defaults(s);
    }

    static Settings defaults()
    {
        Settings s = {};
        strlcpy(s.city, PRAYER_CITY, sizeof(s.city));
        strlcpy(s.country, PRAYER_COUNTRY, sizeof(s.country));
        s.latitude = atof(WEATHER_LAT);
        s.longitude = atof(WEATHER_LON);
        s.calculationMethod = PRAYER_METHOD;
        s.madhhab = 0;
        s.showPrayerTimes = s.showWeather = s.showCalendar = s.showClock = true;
        s.backgroundColor = 0x040607;
        s.primaryColor = 0xC9A45C;
        setNewDefaults(s);
        setV3Defaults(s);
        setV4Defaults(s);
        return s;
    }

    // Jede Seiten-ID genau einmal
    static bool validOrder(const uint8_t *order)
    {
        uint8_t seen = 0;
        for (int i = 0; i < PAGE_ID_COUNT; i++)
        {
            if (order[i] >= PAGE_ID_COUNT || (seen & (1 << order[i])))
                return false;
            seen |= 1 << order[i];
        }
        return true;
    }

    static bool validAlarms(const Settings &s)
    {
        if (s.alarmCount > MAX_ALARMS)
            return false;
        for (int i = 0; i < s.alarmCount; i++)
            if (s.alarms[i].hour > 23 || s.alarms[i].minute > 59 || s.alarms[i].days > 0x7F)
                return false;
        return true;
    }

    static bool valid(const Settings &s)
    {
        auto offsetOk = [](int8_t o) { return o >= -30 && o <= 30; };
        for (uint8_t v : s.azanVolume)
            if (v > 100)
                return false;
        return s.nightBrightness >= 5 && s.nightBrightness <= 100 && s.latitude >= -90 && s.latitude <= 90 && s.longitude >= -180 && s.longitude <= 180 &&
               s.calculationMethod <= 23 && s.madhhab <= 1 && offsetOk(s.fajrOffset) &&
               offsetOk(s.dhuhrOffset) && offsetOk(s.asrOffset) && offsetOk(s.maghribOffset) &&
               offsetOk(s.ishaOffset) && s.volume <= 21 && s.brightness >= 5 && s.brightness <= 100 &&
               s.colorMain <= 0xFFFFFF && s.colorAccent <= 0xFFFFFF && s.colorMuted <= 0xFFFFFF &&
               validOrder(s.pageOrder) && s.prayerSource <= SOURCE_MAWAQIT && validAlarms(s); // tahajjudOffset: 0..255 Minuten, beim Klingeln auf die Fajr-Zeit begrenzt
    }

    void begin()
    {
        s_lock = xSemaphoreCreateMutex();
        Stored st;
        StoredV7 v7;
        StoredV6 v6;
        StoredV5 v5;
        StoredV4 v4;
        StoredV3 v3;
        StoredV2 v2;
        StoredV1 v1;
        if (storage::loadBlob(KEY, &st, sizeof(st)) && st.layout == LAYOUT_VERSION && valid(st.s))
        {
            s_current = st.s;
        }
        else if (storage::loadBlob(KEY, &v7, sizeof(v7)) && v7.layout == 7)
        {
            // Fassung 7 übernehmen, Nachtwecker ist neu
            s_current = defaults();
            static_cast<SettingsV7 &>(s_current) = v7.s;
            setV8Defaults(s_current);
            if (!valid(s_current))
                s_current = defaults();
        }
        else if (storage::loadBlob(KEY, &v6, sizeof(v6)) && v6.layout == 6)
        {
            // Fassung 6 übernehmen, Nachtseite ist neu
            s_current = defaults();
            static_cast<SettingsV6 &>(s_current) = v6.s;
            setV7Defaults(s_current);
            if (!valid(s_current))
                s_current = defaults();
        }
        else if (storage::loadBlob(KEY, &v5, sizeof(v5)) && v5.layout == 5)
        {
            // Fassung 5 übernehmen, Azan-Lautstärke je Gebet und Nachtdimmung mit Standardwerten
            s_current = defaults();
            static_cast<SettingsV5 &>(s_current) = v5.s;
            setV6Defaults(s_current);
            if (!valid(s_current))
                s_current = defaults();
        }
        else if (storage::loadBlob(KEY, &v4, sizeof(v4)) && v4.layout == 4)
        {
            // Fassung 4 übernehmen, noch keine Wecker
            s_current = defaults();
            static_cast<SettingsV4 &>(s_current) = v4.s;
            setV5Defaults(s_current);
            if (!valid(s_current))
                s_current = defaults();
        }
        else if (storage::loadBlob(KEY, &v3, sizeof(v3)) && v3.layout == 3)
        {
            // Fassung 3 übernehmen, Quelle wie bisher: Berechnung
            s_current = defaults();
            static_cast<SettingsV3 &>(s_current) = v3.s;
            setV4Defaults(s_current);
            if (!valid(s_current))
                s_current = defaults();
        }
        else if (storage::loadBlob(KEY, &v2, sizeof(v2)) && v2.layout == 2)
        {
            // Fassung 2 übernehmen, Seitenreihenfolge mit Standardwerten
            s_current = defaults();
            static_cast<SettingsV2 &>(s_current) = v2.s;
            setV3Defaults(s_current);
            setV4Defaults(s_current);
            if (!valid(s_current))
                s_current = defaults();
        }
        else if (storage::loadBlob(KEY, &v1, sizeof(v1)) && v1.layout == 1)
        {
            // Fassung 1 übernehmen (Standort, Korrekturen, Methode), neue Felder mit Standardwerten
            s_current = defaults();
            static_cast<SettingsV1 &>(s_current) = v1.s;
            setNewDefaults(s_current);
            setV3Defaults(s_current);
            setV4Defaults(s_current);
            if (!valid(s_current))
                s_current = defaults();
        }
        else
        {
            s_current = defaults();
        }
        s_current.background[sizeof(s_current.background) - 1] = 0;
        s_current.mawaqitSlug[sizeof(s_current.mawaqitSlug) - 1] = 0;
        s_current.mawaqitName[sizeof(s_current.mawaqitName) - 1] = 0;
        s_current.city[sizeof(s_current.city) - 1] = 0;
        s_current.country[sizeof(s_current.country) - 1] = 0;
        Serial.printf("Einstellungen: %s (%.4f, %.4f), Methode %d, Madhhab %d\n", s_current.city,
                      s_current.latitude, s_current.longitude, s_current.calculationMethod, s_current.madhhab);
    }

    Settings get()
    {
        xSemaphoreTake(s_lock, portMAX_DELAY);
        Settings copy = s_current;
        xSemaphoreGive(s_lock);
        return copy;
    }

    bool set(const Settings &s)
    {
        if (!valid(s))
            return false;
        xSemaphoreTake(s_lock, portMAX_DELAY);
        s_current = s;
        xSemaphoreGive(s_lock);
        Stored st = {LAYOUT_VERSION, s};
        storage::saveBlob(KEY, &st, sizeof(st));
        s_version++;
        return true;
    }

    uint32_t version() { return s_version; }

    String alarmName(int i)
    {
        Preferences p;
        p.begin("alarms", true);
        String n = p.getString(("n" + String(i)).c_str(), "");
        p.end();
        return n;
    }

    void setAlarmName(int i, const String &name)
    {
        Preferences p;
        p.begin("alarms", false);
        p.putString(("n" + String(i)).c_str(), name.substring(0, 40));
        p.end();
    }

    static const char *const PAGE_KEYS[] = {"clock", "prayer", "weather", "calendar", "night", "moon"};

    String pageLayout()
    {
        Preferences p;
        p.begin("ui", true);
        String l = p.getString("pages", "");
        p.end();
        if (l.length())
            return l;
        // Standard: Gebetszeiten, Uhr, Wetter, Kalender, letztes Drittel der Nacht, Mond & Hijri
        return "prayer,clock,weather,calendar,night,moon";
    }

    bool setPageLayout(const String &layout)
    {
        // nur bekannte Schlüssel, jeder höchstens einmal
        int start = 0, seen = 0;
        while (start < (int)layout.length())
        {
            int end = layout.indexOf(',', start);
            if (end < 0)
                end = layout.length();
            String key = layout.substring(start, end);
            if (key.startsWith("-"))
                key.remove(0, 1);
            int id = -1;
            for (int k = 0; k < 6; k++)
                if (key == PAGE_KEYS[k])
                    id = k;
            if (id < 0 || (seen & (1 << id)))
                return false;
            seen |= 1 << id;
            start = end + 1;
        }
        Preferences p;
        p.begin("ui", false);
        p.putString("pages", layout);
        p.end();
        s_version++;
        return true;
    }
}

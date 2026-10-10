// Adhan-Wecker: Gebetszeiten, große Uhr und Wetter auf Arabisch, Azan zur Gebetszeit.
#include <Arduino.h>
#include <lvgl.h>
#include <Preferences.h>
#include "config.h"
#include "hal/display_port.h"
#include "hal/lcd_st77922.h"
#include "hal/rgb_led.h"
#include "services/alarm_clock.h"
#include "services/audio_manager.h"
#include "services/azan_controller.h"
#include "services/prayer_times.h"
#include "services/settings.h"
#include "services/storage.h"
#include "services/time_manager.h"
#include "services/weather.h"
#include "services/web_server.h"
#include "services/wifi_manager.h"
#include "ui/alarm_screen.h"
#include "ui/calendar_screen.h"
#include "ui/clock_screen.h"
#include "ui/lang.h"
#include "ui/moon_screen.h"
#include "ui/night_screen.h"
#include "ui/prayer_screen.h"
#include "ui/settings_screen.h"
#include "ui/theme.h"
#include "ui/ui.h"
#include "ui/weather_screen.h"

static constexpr int PIN_BOOT_BUTTON = 0;
static model::PrayerDay s_today;

// Einstellungen auf Display, Farben und Audio anwenden (beim Start und nach jeder Änderung)
// Automatischer Seitenwechsel (0 = aus) und die beteiligten Seiten als Bitmaske (1 << ui::Page)
static uint16_t s_rotateSec = 0;
static uint32_t s_rotateMask = 0;

static void applySettings()
{
    static char shownBackground[sizeof(settings::Settings::background)] = "";
    const settings::Settings st = settings::get();

    prayer_screen::setCity(st.city);
    timemgr::applyTimezone(); // Ortszeit des eingestellten Ortes (z. B. Türkei bei einer Moschee dort)
    weather_screen::setCity(st.city);
    theme::setPalette(st.colorMain, st.colorAccent, st.colorMuted);
    lcd::setBrightness(st.brightness);
    azan::setVolumes(st.azanVolume); // Wecker und Vorhören setzen ihre Lautstärke selbst

    // Seiten: Reihenfolge und Sichtbarkeit aller Inhaltsseiten ("night,prayer,-moon,...")
    {
        static const char *const KEYS[] = {"clock", "prayer", "weather", "calendar", "night", "moon"};
        static const ui::Page PAGES[] = {ui::PAGE_CLOCK, ui::PAGE_PRAYER, ui::PAGE_WEATHER, ui::PAGE_CALENDAR, ui::PAGE_NIGHT, ui::PAGE_MOON};
        const String layout = settings::pageLayout();
        ui::Page order[ui::PAGE_COUNT];
        int count = 0, start = 0;
        while (start < (int)layout.length() && count < ui::PAGE_COUNT)
        {
            int end = layout.indexOf(',', start);
            if (end < 0)
                end = layout.length();
            const String key = layout.substring(start, end);
            for (int k = 0; k < 6; k++)
                if (key == KEYS[k])
                    order[count++] = PAGES[k];
            start = end + 1;
        }
        ui::setPages(order, count);

        // Automatischer Seitenwechsel: Intervall und beteiligte Seiten
        s_rotateSec = settings::rotateSeconds();
        s_rotateMask = 0;
        const String rot = settings::rotatePages();
        start = 0;
        while (start < (int)rot.length())
        {
            int end = rot.indexOf(',', start);
            if (end < 0)
                end = rot.length();
            const String key = rot.substring(start, end);
            for (int k = 0; k < 6; k++)
                if (key == KEYS[k])
                    s_rotateMask |= 1u << PAGES[k];
            start = end + 1;
        }
    }

    if (strcmp(shownBackground, st.background) != 0)
    {
        // Fehlt die gewählte Datei, ersatzweise einen der mitgelieferten Hintergründe
        if (theme::setBackground(st.background) || theme::setBackground("islamic") || theme::setBackground("muster"))
            strlcpy(shownBackground, st.background, sizeof(shownBackground));
    }
}

// Helligkeit: nachts (ab Isha bis Fajr) dunkler, solange kein Wecker klingelt.
// Ändert sich der Zielwert, blendet die Anzeige sanft über (je Sekunde ein paar Prozent).
static void updateBrightness(const struct tm &now, bool snap)
{
    static int shown = -1;
    const settings::Settings st = settings::get();
    int target = st.brightness;
    if (st.autoDim && s_today.valid && !alarmclock::ringing())
    {
        const int nowMin = now.tm_hour * 60 + now.tm_min;
        const bool night = nowMin >= s_today.minutes[model::ISHA] || nowMin < s_today.minutes[model::FAJR];
        if (night)
            target = min<int>(st.nightBrightness, st.brightness);
    }
    if (shown < 0 || snap)
        shown = target;
    else if (shown < target)
        shown = min(shown + 4, target);
    else if (shown > target)
        shown = max(shown - 4, target);
    lcd::setBrightness(shown);
}

// Bit i = model::DAILY_PRAYERS[i] darf den Azan automatisch starten
static uint8_t azanMask()
{
    const settings::Settings st = settings::get();
    uint8_t mask = 0;
    for (int i = 0; i < 5; i++)
        if (st.azanEnabled[i])
            mask |= 1 << i;
    return mask;
}

// Ist in dieser Minute ein (eingeschalteter) Azan fällig? Dann hat er Vorrang vor einem Wecker derselben Zeit.
static bool azanDueNow(const struct tm &now)
{
    if (!s_today.valid)
        return false;
    const uint8_t mask = azanMask();
    const int nowMin = now.tm_hour * 60 + now.tm_min;
    for (int i = 0; i < 5; i++)
        if ((mask & (1 << i)) && s_today.minutes[model::DAILY_PRAYERS[i]] == nowMin)
            return true;
    return false;
}

// Kalender mit den Hijri-Tagen aus dem Gebetszeiten-Cache füllen
static void refreshCalendar(const struct tm &now)
{
    calendar_screen::Hijri h;
    struct tm d = now;
    for (int day = 1; day <= 31; day++)
    {
        d.tm_mday = day;
        model::PrayerDay p;
        // nur Tage, die wirklich im geladenen Monat liegen
        if (prayers::forDay(d, p) && p.month == now.tm_mon + 1 && p.day == day)
        {
            h.day[day - 1] = p.hijriDay;
            h.holiday[day - 1] = model::holidayOf(p.hijriMonth, p.hijriDay) != model::NO_HOLIDAY;
            if (!h.firstMonth)
                h.firstMonth = p.hijriMonth;
            h.lastMonth = p.hijriMonth;
            h.year = p.hijriYear;
        }
    }
    calendar_screen::setMonth(now, h);
}

static void refreshEverySecond(const struct tm &now)
{
    static int shownDay = -1;
    static uint32_t version = 0, weatherVersion = 0;

    prayer_screen::setClock(now);
    clock_screen::setClock(now);

    if (now.tm_mday != shownDay || prayers::version() != version)
    {
        version = prayers::version();
        if (prayers::forDay(now, s_today))
            shownDay = now.tm_mday;
        theme::setFriday(now.tm_wday == 5);
        prayer_screen::setPrayers(s_today);
        clock_screen::setHijri(s_today);
        const model::Holiday holiday = s_today.valid ? model::holidayOf(s_today.hijriMonth, s_today.hijriDay) : model::NO_HOLIDAY;
        prayer_screen::setHoliday(holiday);
        clock_screen::setHoliday(holiday);
        refreshCalendar(now);
        struct tm t = now;
        moon_screen::update(mktime(&t), s_today);
    }

    static uint32_t settingsVersion = 0;
    bool settingsChanged = false;
    if (settings::version() != settingsVersion)
    {
        settingsVersion = settings::version();
        applySettings();
        settingsChanged = true;
    }

    // Wecker: auslösen, Fenster zeigen, nächste Weckzeit anzeigen
    {
        const settings::Settings st = settings::get();
        const bool wasRinging = alarmclock::ringing();
        // Azan läuft oder ist genau jetzt fällig: Wecker dieser Minute entfällt, der Azan wird gezeigt
        alarmclock::update(now, st, azan::status().state != azan::State::IDLE || azanDueNow(now));
        if (alarmclock::ringing() != wasRinging)
        {
            const int idx = alarmclock::ringingIndex();
            // Nachtwecker: Name in der Anzeigesprache
            const char *night = lang::rtl() ? "الثلث الأخير من الليل" : lang::get() == lang::Lang::DE ? "Letztes Drittel der Nacht" : "Last third of the night";
            alarm_screen::show(alarmclock::ringing(), now.tm_hour, now.tm_min,
                               idx == alarmclock::TAHAJJUD ? night : settings::alarmName(idx).c_str());
        }
        if (alarmclock::ringing() != wasRinging)
            settingsChanged = true; // Helligkeit sofort umschalten (Wecker: volle Helligkeit)
        const int next = alarmclock::nextAlarmMinutes(now, st);
        prayer_screen::setAlarm(next);
        clock_screen::setAlarm(next);
    }

    // Seiten automatisch wechseln, wenn das Display so lange nicht berührt wurde (nicht während Azan oder Wecker)
    if (s_rotateSec && !alarmclock::ringing() && azan::status().state == azan::State::IDLE &&
        lv_disp_get_inactive_time(nullptr) >= (uint32_t)s_rotateSec * 1000)
    {
        ui::nextPage(s_rotateMask);
        lv_disp_trig_activity(nullptr); // nächstes Intervall beginnt jetzt
    }

    updateBrightness(now, settingsChanged);

    const model::WifiInfo wifi = wifimgr::info();
    prayer_screen::setWifi(wifi);
    settings_screen::setWifi(wifi, web::url());

    if (weather::version() != weatherVersion)
    {
        weatherVersion = weather::version();
        model::Weather w;
        weather::get(w);
        prayer_screen::setWeather(w);
        weather_screen::setWeather(w);
    }

    {
        model::NightTimes n;
        prayers::night(now, n);
        night_screen::set(n);
    }

    {
        static int moonHour = -1;
        if (now.tm_hour != moonHour)
        {
            moonHour = now.tm_hour;
            struct tm t = now;
            moon_screen::update(mktime(&t), s_today);
        }
    }

    if (s_today.valid)
    {
        model::Prayer next;
        int32_t secondsLeft;
        prayers::next(now, s_today, next, secondsLeft);
        prayer_screen::setNext(next, secondsLeft);
    }
}

// Azan zur Gebetszeit starten und die Anzeige nachführen
static void refreshAzan(const struct tm &now)
{
    static bool shown = false;
    // BOOT-Taste (GPIO0, LOW = gedrückt) beendet den Azan ebenfalls
    if (digitalRead(PIN_BOOT_BUTTON) == LOW)
    {
        if (azan::status().state == azan::State::PLAYING)
            azan::skip();
        if (alarmclock::ringing())
        {
            alarmclock::stop();
            alarm_screen::show(false, 0, 0);
        }
    }

    azan::update(now, s_today, azanMask());
    const azan::Status st = azan::status();
    const bool active = st.state == azan::State::PLAYING;
    if (active != shown)
    {
        shown = active;
        if (active)
        {
            ui::showPage(ui::PAGE_PRAYER); // danach steht wieder die Hauptseite da
        }
        prayer_screen::showAzan(active, st.prayer);
    }
}

// Entwicklungshilfen über Serial:
//   S  Bildschirmfoto senden (python tools/screenshot.py)
//   A  Azan für das nächste Gebet sofort starten (zum Testen)
//   1..6  Seite Uhr / Gebetszeiten / Wetter / Kalender / Einstellungen / Nacht zeigen
//   X  Wecker und Azan stoppen
static void handleSerial()
{
    if (!Serial.available())
        return;
    const int cmd = Serial.read();
    if (cmd == 'A' && s_today.valid)
    {
        struct tm now;
        if (timemgr::now(now))
        {
            model::Prayer next;
            int32_t secondsLeft;
            prayers::next(now, s_today, next, secondsLeft);
            azan::start(next, s_today.minutes[next]);
        }
        return;
    }
    if (cmd == 'X')
    {
        azan::skip();
        alarmclock::stop();
        alarm_screen::show(false, 0, 0);
        return;
    }
    if (cmd >= '1' && cmd <= '6')
    {
        ui::showPage((ui::Page)(cmd - '1'));
        return;
    }
    if (cmd != 'S')
        return;

    uint32_t size;
    uint16_t w, h;
    uint8_t *buf = ui::snapshot(size, w, h);
    if (buf)
    {
        Serial.printf("SNAP %d %d %u\n", w, h, size);
        Serial.write(buf, size);
        Serial.flush();
    }
    free(buf);
}

void setup()
{
    Serial.begin(115200);
    delay(300);
    Serial.println("\n=== ADHAN-WECKER ===");

    if (!display::begin())
        Serial.println("Touch antwortet nicht");
    storage::begin(); // SD/LittleFS (Azan-Dateien, Weboberfläche) und NVS
    settings::begin();
    {
        // früherer Sprachassistent: gespeicherten API-Schlüssel entfernen
        Preferences p;
        if (p.begin("assistant", false))
        {
            p.clear();
            p.end();
        }
    }
    audio::begin(AZAN_VOLUME, CODEC_VOLUME); // nach dem Touch: gemeinsamer I2C-Bus

    lang::begin();  // Anzeigesprache vor dem Aufbau der Oberfläche
    theme::begin(); // Farbgruppen vor dem Aufbau der Oberfläche
    ui::begin(settings::get().city);
    alarm_screen::create(
        [] {
            alarmclock::stop();
            alarm_screen::show(false, 0, 0);
        },
        [](int minutes) {
            alarmclock::snooze(minutes);
            alarm_screen::show(false, 0, 0);
        });
    applySettings(); // Farben, Hintergrund, Helligkeit, Lautstärke
    prayer_screen::setAzanCallback(azan::skip);
    pinMode(PIN_BOOT_BUTTON, INPUT_PULLUP);
    rgbled::begin();
    lv_timer_handler();

    timemgr::begin(DEMO_MODE);
    wifimgr::begin(SETUP_AP_NAME);
    prayers::begin(DEMO_MODE);
    weather::begin();
    Serial.printf("RAM frei: intern %u kB (groesster Block %u kB), PSRAM %u kB\n",
                  heap_caps_get_free_size(MALLOC_CAP_INTERNAL) / 1024,
                  heap_caps_get_largest_free_block(MALLOC_CAP_INTERNAL) / 1024,
                  heap_caps_get_free_size(MALLOC_CAP_SPIRAM) / 1024);
}

void loop()
{
    wifimgr::update();
    timemgr::update();
    web::update();
    handleSerial();

    prayer_screen::showWifiSetup(!DEMO_MODE && wifimgr::info().portalActive);

    static time_t lastSecond = 0;
    struct tm now;
    if (timemgr::now(now))
    {
        const time_t sec = mktime(&now);
        if (sec != lastSecond)
        {
            lastSecond = sec;
            refreshEverySecond(now);
        }
        refreshAzan(now);
    }

    lv_timer_handler();
    delay(5);
}

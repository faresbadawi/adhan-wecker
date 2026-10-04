// Adhan-Wecker: Gebetszeiten, große Uhr und Wetter auf Arabisch, Azan zur Gebetszeit.
#include <Arduino.h>
#include <lvgl.h>
#include <Preferences.h>
#include "config.h"
#include "hal/display_port.h"
#include "hal/lcd_st77922.h"
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
#include "ui/prayer_screen.h"
#include "ui/settings_screen.h"
#include "ui/theme.h"
#include "ui/ui.h"
#include "ui/weather_screen.h"

static constexpr int PIN_BOOT_BUTTON = 0;
static model::PrayerDay s_today;

// Einstellungen auf Display, Farben und Audio anwenden (beim Start und nach jeder Änderung)
static void applySettings()
{
    static char shownBackground[sizeof(settings::Settings::background)] = "";
    const settings::Settings st = settings::get();

    prayer_screen::setCity(st.city);
    weather_screen::setCity(st.city);
    theme::setPalette(st.colorMain, st.colorAccent, st.colorMuted);
    lcd::setBrightness(st.brightness);
    audio::setVolume(st.volume);

    // Seiten: Reihenfolge und Sichtbarkeit (Index = settings::PageId = ui::Page)
    bool visible[settings::PAGE_ID_COUNT];
    visible[settings::PAGE_ID_CLOCK] = st.showClock;
    visible[settings::PAGE_ID_PRAYER] = st.showPrayerTimes;
    visible[settings::PAGE_ID_WEATHER] = st.showWeather;
    visible[settings::PAGE_ID_CALENDAR] = st.showCalendar;
    ui::setPages(st.pageOrder, visible);

    if (strcmp(shownBackground, st.background) != 0)
    {
        // Fehlt die gewählte Datei, ersatzweise einen der mitgelieferten Hintergründe
        if (theme::setBackground(st.background) || theme::setBackground("islamic") || theme::setBackground("muster"))
            strlcpy(shownBackground, st.background, sizeof(shownBackground));
    }
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
        prayer_screen::setPrayers(s_today);
        clock_screen::setHijri(s_today);
        refreshCalendar(now);
    }

    static uint32_t settingsVersion = 0;
    if (settings::version() != settingsVersion)
    {
        settingsVersion = settings::version();
        applySettings();
    }

    // Wecker: auslösen, Fenster zeigen, nächste Weckzeit anzeigen
    {
        const settings::Settings st = settings::get();
        const bool wasRinging = alarmclock::ringing();
        alarmclock::update(now, st, azan::status().state != azan::State::IDLE);
        if (alarmclock::ringing() != wasRinging)
            alarm_screen::show(alarmclock::ringing(), now.tm_hour, now.tm_min,
                               settings::alarmName(alarmclock::ringingIndex()).c_str());
        const int next = alarmclock::nextAlarmMinutes(now, st);
        prayer_screen::setAlarm(next);
        clock_screen::setAlarm(next);
    }

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
//   1..5  Seite Uhr / Gebetszeiten / Wetter / Kalender / Einstellungen zeigen
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
    if (cmd >= '1' && cmd <= '5')
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
    alarm_screen::create([] {
        alarmclock::stop();
        alarm_screen::show(false, 0, 0);
    });
    applySettings(); // Farben, Hintergrund, Helligkeit, Lautstärke
    prayer_screen::setAzanCallback(azan::skip);
    pinMode(PIN_BOOT_BUTTON, INPUT_PULLUP);
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

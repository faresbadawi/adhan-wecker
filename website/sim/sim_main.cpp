// Bilal im Browser: dieselbe Oberfläche (src/ui) wie auf der Uhr, übersetzt mit Emscripten.
// Statt WLAN, Aladhan-API und Wetterdienst liefert dieser Teil Beispieldaten:
// Gebetszeiten werden für einen festen Ort berechnet, Uhrzeit kommt vom Browser.
#include <emscripten.h>
#include <lvgl.h>
#include <time.h>
#include <math.h>
#include "Arduino.h"
#include "LittleFS.h"
#include "ui/calendar_screen.h"
#include "ui/clock_screen.h"
#include "ui/lang.h"
#include "ui/moon_screen.h"
#include "ui/night_screen.h"
#include "ui/prayer_screen.h"
#include "ui/settings_screen.h"
#include "ui/splash.h"
#include "ui/theme.h"
#include "ui/ui.h"
#include "ui/weather_screen.h"

SerialStub Serial;
LittleFSStub LittleFS;
char g_simLang[4] = "ar";

extern "C" uint32_t millis(void) { return (uint32_t)emscripten_get_now(); }

// Ort der Beispiel-Gebetszeiten
static const char *CITY = "Berlin";
static const double LAT = 52.52, LNG = 13.405;

// ---------- Gebetszeiten (Muslim World League: Fajr 18°, Isha 17°, Asr Schafi'i)

static double dsin(double d) { return sin(d * M_PI / 180); }
static double dcos(double d) { return cos(d * M_PI / 180); }
static double dtan(double d) { return tan(d * M_PI / 180); }
static double darcsin(double x) { return asin(x) * 180 / M_PI; }
static double darccos(double x) { return acos(x) * 180 / M_PI; }
static double darctan2(double y, double x) { return atan2(y, x) * 180 / M_PI; }
static double darccot(double x) { return atan(1 / x) * 180 / M_PI; }
static double fix(double a, double b) { a = a - b * floor(a / b); return a < 0 ? a + b : a; }

static long jdn(int y, int m, int d)
{
    const int a = (14 - m) / 12;
    const long yy = y + 4800 - a, mm = m + 12 * a - 3;
    return d + (153 * mm + 2) / 5 + 365 * yy + yy / 4 - yy / 100 + yy / 400 - 32045;
}

static void sunPosition(double jd, double &decl, double &eqt)
{
    const double D = jd - 2451545.0;
    const double g = fix(357.529 + 0.98560028 * D, 360);
    const double q = fix(280.459 + 0.98564736 * D, 360);
    const double L = fix(q + 1.915 * dsin(g) + 0.020 * dsin(2 * g), 360);
    const double e = 23.439 - 0.00000036 * D;
    const double RA = fix(darctan2(dcos(e) * dsin(L), dcos(L)) / 15, 24);
    eqt = q / 15 - RA;
    decl = darcsin(dsin(e) * dsin(L));
}

// Stunden zwischen Mittag und dem Zeitpunkt, an dem die Sonne `angle` Grad unter dem Horizont steht
static double hourAngle(double angle, double decl)
{
    return darccos((-dsin(angle) - dsin(decl) * dsin(LAT)) / (dcos(decl) * dcos(LAT))) / 15;
}

static void computeDay(int y, int m, int d, double tz, model::PrayerDay &out)
{
    double decl, eqt;
    sunPosition(jdn(y, m, d) - LNG / 360.0, decl, eqt);
    const double noon = 12 + tz - LNG / 15 - eqt;
    const double sun = hourAngle(0.833, decl);
    double fajr = hourAngle(18, decl), isha = hourAngle(17, decl);
    const double night = 24 - 2 * sun;
    if (isnan(fajr) || fajr - sun > night / 7) fajr = sun + night / 7; // hohe Breiten im Sommer
    if (isnan(isha) || isha - sun > night / 7) isha = sun + night / 7;
    const double asrAngle = -darccot(1 + dtan(fabs(LAT - decl)));
    const double asr = hourAngle(asrAngle, decl);
    const double h[model::PRAYER_COUNT] = {noon - fajr, noon - sun, noon + 2 / 60.0, noon + asr, noon + sun + 1 / 60.0, noon + isha};
    out.valid = true;
    out.year = y;
    out.month = m;
    out.day = d;
    for (int i = 0; i < model::PRAYER_COUNT; i++)
        out.minutes[i] = (uint16_t)constrain((int)lround(h[i] * 60), 0, 24 * 60 - 1);

    // Hijri-Datum nach dem arithmetischen Kalender (kann um einen Tag abweichen)
    long l = jdn(y, m, d) - 1948440 + 10632;
    const long n = (l - 1) / 10631;
    l = l - 10631 * n + 354;
    const long j = ((10985 - l) / 5316) * ((50 * l) / 17719) + (l / 5670) * ((43 * l) / 15238);
    l = l - ((30 - j) / 15) * ((17719 * j) / 50) - (j / 16) * ((15238 * j) / 43) + 29;
    const long hm = (24 * l) / 709;
    out.hijriDay = (int8_t)(l - (709 * hm) / 24);
    out.hijriMonth = (int8_t)hm;
    out.hijriYear = (int16_t)(30 * n + j - 30);
}

static double tzHours(const struct tm &t) { return t.tm_gmtoff / 3600.0; }

static bool forDay(const struct tm &day, model::PrayerDay &out)
{
    out = {};
    computeDay(day.tm_year + 1900, day.tm_mon + 1, day.tm_mday, tzHours(day), out);
    return true;
}

static void nextPrayer(const struct tm &now, const model::PrayerDay &day, model::Prayer &prayer, int32_t &secondsLeft)
{
    const int32_t nowSec = now.tm_hour * 3600 + now.tm_min * 60 + now.tm_sec;
    for (model::Prayer p : model::DAILY_PRAYERS)
        if (day.minutes[p] * 60 > nowSec)
        {
            prayer = p;
            secondsLeft = day.minutes[p] * 60 - nowSec;
            return;
        }
    prayer = model::FAJR;
    secondsLeft = day.minutes[model::FAJR] * 60 + 24 * 3600 - nowSec;
}

// wie prayers::night() auf der Uhr
static bool nightTimes(const struct tm &now, model::NightTimes &out)
{
    out = {};
    auto dayAt = [&](int offset, model::PrayerDay &d) {
        struct tm t = now;
        t.tm_mday += offset;
        t.tm_hour = 12;
        t.tm_isdst = -1;
        mktime(&t);
        return forDay(t, d);
    };
    model::PrayerDay today, tomorrow, evening;
    dayAt(0, today);
    dayAt(1, tomorrow);
    const int32_t nowSec = now.tm_hour * 3600 + now.tm_min * 60 + now.tm_sec;
    const bool before = nowSec < today.minutes[model::FAJR] * 60;
    int32_t frameSec = nowSec;
    int32_t fajr;
    if (before)
    {
        dayAt(-1, evening);
        frameSec += 24 * 3600;
        fajr = today.minutes[model::FAJR] + 24 * 60;
    }
    else
    {
        evening = today;
        fajr = tomorrow.minutes[model::FAJR] + 24 * 60;
    }
    out.maghrib = evening.minutes[model::MAGHRIB];
    out.fajr = fajr;
    out.lengthMin = fajr - out.maghrib;
    if (out.lengthMin <= 0)
        return false;
    out.midnight = out.maghrib + (out.lengthMin + 1) / 2;
    out.lastThird = out.maghrib + (out.lengthMin * 2 + 1) / 3;
    out.sunrise = nowSec < today.minutes[model::SUNRISE] * 60 ? today.minutes[model::SUNRISE]
                                                              : tomorrow.minutes[model::SUNRISE] + 24 * 60;
    out.secondsToLastThird = out.lastThird * 60 - frameSec;
    out.valid = true;
    return true;
}

// ---------- Beispielwetter

static model::Weather sampleWeather(bool isDay)
{
    model::Weather w;
    w.valid = true;
    w.isDay = isDay;
    w.sky = model::Sky::PARTLY_CLOUDY;
    w.temp = 9;
    w.feelsLike = 6;
    w.humidity = 76;
    w.windKmh = 14;
    w.tempMax = 11;
    w.tempMin = 4;
    w.rainChance = 20;
    w.forecast[0] = {model::Sky::PARTLY_CLOUDY, 11, 4};
    w.forecast[1] = {model::Sky::CLEAR, 12, 3};
    w.forecast[2] = {model::Sky::RAIN, 9, 5};
    return w;
}

// ---------- Anzeige und Touch

static constexpr int W = 480, H = 320;
static lv_color_t s_buf[W * H];
static uint8_t s_rgba[W * H * 4];
static int s_dirty = 0;
static int s_touchX = 0, s_touchY = 0, s_touchDown = 0;

static void flush(lv_disp_drv_t *drv, const lv_area_t *a, lv_color_t *px)
{
    for (int y = a->y1; y <= a->y2; y++)
        for (int x = a->x1; x <= a->x2; x++)
        {
            const uint32_t c = lv_color_to32(*px++);
            uint8_t *o = &s_rgba[(y * W + x) * 4];
            o[0] = (c >> 16) & 255;
            o[1] = (c >> 8) & 255;
            o[2] = c & 255;
            o[3] = 255;
        }
    s_dirty = 1;
    lv_disp_flush_ready(drv);
}

static void readTouch(lv_indev_drv_t *, lv_indev_data_t *d)
{
    d->point.x = s_touchX;
    d->point.y = s_touchY;
    d->state = s_touchDown ? LV_INDEV_STATE_PR : LV_INDEV_STATE_REL;
}

// ---------- jede Sekunde, wie refreshEverySecond() auf der Uhr

static model::PrayerDay s_today;

static void refreshCalendar(const struct tm &now)
{
    calendar_screen::Hijri h;
    struct tm d = now;
    for (int day = 1; day <= 31; day++)
    {
        d.tm_mday = day;
        struct tm t = d;
        t.tm_isdst = -1;
        mktime(&t);
        if (t.tm_mon != now.tm_mon)
            break;
        model::PrayerDay p;
        forDay(t, p);
        h.day[day - 1] = p.hijriDay;
        h.holiday[day - 1] = model::holidayOf(p.hijriMonth, p.hijriDay) != model::NO_HOLIDAY;
        if (!h.firstMonth)
            h.firstMonth = p.hijriMonth;
        h.lastMonth = p.hijriMonth;
        h.year = p.hijriYear;
    }
    calendar_screen::setMonth(now, h);
}

static void everySecond(const struct tm &now)
{
    static int shownDay = -1, moonHour = -1;
    prayer_screen::setClock(now);
    clock_screen::setClock(now);

    if (now.tm_mday != shownDay)
    {
        shownDay = now.tm_mday;
        forDay(now, s_today);
        theme::setFriday(now.tm_wday == 5);
        prayer_screen::setPrayers(s_today);
        clock_screen::setHijri(s_today);
        const model::Holiday hol = model::holidayOf(s_today.hijriMonth, s_today.hijriDay);
        prayer_screen::setHoliday(hol);
        clock_screen::setHoliday(hol);
        refreshCalendar(now);
        prayer_screen::setAlarm(-1);
        clock_screen::setAlarm(-1);
    }
    if (now.tm_hour != moonHour)
    {
        moonHour = now.tm_hour;
        struct tm t = now;
        moon_screen::update(mktime(&t), s_today);
        const int m = now.tm_hour * 60 + now.tm_min;
        const model::Weather w = sampleWeather(m >= s_today.minutes[model::SUNRISE] && m < s_today.minutes[model::MAGHRIB]);
        prayer_screen::setWeather(w);
        weather_screen::setWeather(w);
    }

    model::WifiInfo wifi;
    wifi.connected = true;
    wifi.bars = 4;
    strcpy(wifi.ssid, "Bilal");
    prayer_screen::setWifi(wifi);
    settings_screen::setWifi(wifi, "http://bilal.local", "https://faresbadawi.github.io/adhan-wecker/");

    model::NightTimes n;
    nightTimes(now, n);
    night_screen::set(n);

    model::Prayer next;
    int32_t left;
    nextPrayer(now, s_today, next, left);
    const int32_t nowSec = now.tm_hour * 3600 + now.tm_min * 60 + now.tm_sec;
    const int32_t sunriseSec = s_today.minutes[model::SUNRISE] * 60, fajrSec = s_today.minutes[model::FAJR] * 60;
    if (nowSec >= fajrSec && nowSec < sunriseSec)
    {
        next = model::SUNRISE;
        left = sunriseSec - nowSec;
    }
    prayer_screen::setNext(next, left);
}

static void localNow(struct tm &t)
{
    const time_t s = time(nullptr);
    localtime_r(&s, &t);
}

// ---------- Schnittstelle zur Webseite

extern "C"
{
    EMSCRIPTEN_KEEPALIVE void sim_init(const char *langCode)
    {
        snprintf(g_simLang, sizeof(g_simLang), "%s", langCode);
        lv_init();
        static lv_disp_draw_buf_t drawBuf;
        lv_disp_draw_buf_init(&drawBuf, s_buf, nullptr, W * H);
        static lv_disp_drv_t disp;
        lv_disp_drv_init(&disp);
        disp.hor_res = W;
        disp.ver_res = H;
        disp.flush_cb = flush;
        disp.draw_buf = &drawBuf;
        lv_disp_drv_register(&disp);
        static lv_indev_drv_t indev;
        lv_indev_drv_init(&indev);
        indev.type = LV_INDEV_TYPE_POINTER;
        indev.read_cb = readTouch;
        lv_indev_drv_register(&indev);

        lang::begin();
        theme::begin();
        ui::begin(CITY);
        prayer_screen::setCity(CITY);
        weather_screen::setCity(CITY);
        clock_screen::setCity(CITY);
        theme::setPalette(0xFFF4E6, 0xE8A04E, 0xA08E7C); // Werkseinstellung "Anbari"
        theme::setBackground("noir");
        splash::show(3500);
    }

    EMSCRIPTEN_KEEPALIVE void sim_tick()
    {
        static time_t last = 0;
        struct tm now;
        localNow(now);
        const time_t s = time(nullptr);
        if (s != last)
        {
            last = s;
            everySecond(now);
        }
        lv_timer_handler();
    }

    EMSCRIPTEN_KEEPALIVE void sim_touch(int x, int y, int down)
    {
        s_touchX = x;
        s_touchY = y;
        s_touchDown = down;
    }

    EMSCRIPTEN_KEEPALIVE void sim_page(int page) { ui::showPage((ui::Page)page); }

    // Azan-Anzeige für das nächste Gebet ein- oder ausblenden (der Ton kommt von der Webseite)
    EMSCRIPTEN_KEEPALIVE int sim_azan(int on)
    {
        struct tm now;
        localNow(now);
        model::Prayer next;
        int32_t left;
        nextPrayer(now, s_today, next, left);
        if (on)
            ui::showPage(ui::PAGE_PRAYER);
        prayer_screen::showAzan(on, next);
        return next;
    }

    EMSCRIPTEN_KEEPALIVE uint8_t *sim_frame() { return s_rgba; }

    EMSCRIPTEN_KEEPALIVE int sim_dirty()
    {
        const int d = s_dirty;
        s_dirty = 0;
        return d;
    }
}

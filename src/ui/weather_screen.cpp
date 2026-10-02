#include "weather_screen.h"
#include "theme.h"

extern "C"
{
    LV_IMG_DECLARE(img_ar_txt_weather);
    LV_IMG_DECLARE(img_ar_txt_feels);
    LV_IMG_DECLARE(img_ar_txt_humidity);
    LV_IMG_DECLARE(img_ar_txt_wind);
    LV_IMG_DECLARE(img_ar_txt_today);
    LV_IMG_DECLARE(img_ar_txt_tomorrow);
    LV_IMG_DECLARE(img_ar_txt_after);
    LV_IMG_DECLARE(img_ar_txt_no_weather);
}

namespace weather_screen
{
    using namespace theme;

    static constexpr int DAYS = 3;
    static lv_obj_t *s_content, *s_loading, *s_city;
    static lv_obj_t *s_icon, *s_temp, *s_sky;
    static lv_obj_t *s_feels, *s_humidity, *s_wind;
    static lv_obj_t *s_dayIcon[DAYS], *s_dayRange[DAYS];

    // Detailzeile: arabische Bezeichnung rechts, Wert links
    static lv_obj_t *detail(lv_obj_t *parent, lv_coord_t y, const lv_img_dsc_t *name)
    {
        constexpr lv_coord_t X = MARGIN, W = 160;
        lv_obj_t *row = box(parent);
        lv_obj_set_pos(row, X, y);
        lv_obj_set_size(row, W, 34);
        lv_obj_align(image(row, name, Role::MUTED), LV_ALIGN_RIGHT_MID, 0, 0);
        lv_obj_t *v = label(row, &font_josefin_22, Role::MAIN, "");
        lv_obj_align(v, LV_ALIGN_LEFT_MID, 0, 2);
        return v;
    }

    void create(lv_obj_t *parent)
    {
        lv_obj_align(image(parent, &img_ar_txt_weather, Role::ACCENT), LV_ALIGN_TOP_MID, 0, 6);
        s_city = label(parent, &font_josefin_18, Role::MUTED, "");
        lv_obj_set_pos(s_city, MARGIN, 18);

        s_loading = image(parent, &img_ar_txt_no_weather, Role::MUTED);
        lv_obj_align(s_loading, LV_ALIGN_CENTER, 0, 0);

        s_content = box(parent);
        lv_obj_set_size(s_content, SCREEN_W, SCREEN_H);
        lv_obj_add_flag(s_content, LV_OBJ_FLAG_HIDDEN);

        // Rechts: großes Symbol, daneben Temperatur und Beschreibung
        s_icon = image(s_content, nullptr, Role::ACCENT);
        lv_obj_align(s_icon, LV_ALIGN_TOP_RIGHT, -MARGIN, 56);
        s_temp = label(s_content, &font_temp_64, Role::MAIN, "");
        lv_obj_align(s_temp, LV_ALIGN_TOP_RIGHT, -146, 52);
        s_sky = image(s_content, nullptr, Role::MAIN);
        lv_obj_align(s_sky, LV_ALIGN_TOP_RIGHT, -152, 124);

        // Links: Details
        s_feels = detail(s_content, 56, &img_ar_txt_feels);
        s_humidity = detail(s_content, 94, &img_ar_txt_humidity);
        s_wind = detail(s_content, 132, &img_ar_txt_wind);

        divider(s_content, SCREEN_W / 2, 182, SCREEN_W / 2 - MARGIN);

        // Vorhersage von rechts nach links: اليوم ganz rechts
        static const lv_img_dsc_t *NAMES[DAYS] = {&img_ar_txt_today, &img_ar_txt_tomorrow, &img_ar_txt_after};
        constexpr lv_coord_t CW = 138, GAP = 10, Y = 194, H = 106;
        const lv_coord_t x0 = (SCREEN_W - DAYS * CW - (DAYS - 1) * GAP) / 2;
        for (int i = 0; i < DAYS; i++)
        {
            lv_obj_t *c = box(s_content);
            lv_obj_set_pos(c, x0 + (DAYS - 1 - i) * (CW + GAP), Y);
            lv_obj_set_size(c, CW, H);
            lv_obj_set_style_radius(c, 10, 0);
            setRole(c, Role::ACCENT); // Rahmenfarbe
            lv_obj_set_style_bg_color(c, black(), 0);
            lv_obj_set_style_bg_opa(c, LV_OPA_40, 0);
            lv_obj_set_style_border_opa(c, LV_OPA_20, 0);
            lv_obj_set_style_border_width(c, 1, 0);

            lv_obj_align(image(c, NAMES[i], Role::MUTED), LV_ALIGN_TOP_MID, 0, 2);
            s_dayIcon[i] = image(c, nullptr, Role::ACCENT);
            lv_obj_align(s_dayIcon[i], LV_ALIGN_TOP_MID, 0, 38);
            s_dayRange[i] = label(c, &font_josefin_18, Role::MAIN, "");
            lv_obj_align(s_dayRange[i], LV_ALIGN_TOP_MID, 0, 78);
        }
    }

    void setWeather(const model::Weather &w)
    {
        if (!w.valid)
            return;
        lv_obj_add_flag(s_loading, LV_OBJ_FLAG_HIDDEN);
        lv_obj_clear_flag(s_content, LV_OBJ_FLAG_HIDDEN);

        lv_img_set_src(s_icon, weatherIcon(w.sky, w.isDay, true));
        lv_label_set_text_fmt(s_temp, "%d°C", (int)lroundf(w.temp));
        lv_img_set_src(s_sky, theme::skyText(w.sky));
        lv_obj_align(s_sky, LV_ALIGN_TOP_RIGHT, -152, 124);

        lv_label_set_text_fmt(s_feels, "%d°C", (int)lroundf(w.feelsLike));
        lv_label_set_text_fmt(s_humidity, "%d %%", w.humidity);
        lv_label_set_text_fmt(s_wind, "%d km/h", (int)lroundf(w.windKmh));

        for (int i = 0; i < DAYS; i++)
        {
            lv_img_set_src(s_dayIcon[i], weatherIcon(w.forecast[i].sky, true, false));
            lv_obj_align(s_dayIcon[i], LV_ALIGN_TOP_MID, 0, 38);
            lv_label_set_text_fmt(s_dayRange[i], "%d°  /  %d°", w.forecast[i].tempMax, w.forecast[i].tempMin);
            lv_obj_align(s_dayRange[i], LV_ALIGN_TOP_MID, 0, 78);
        }
    }

    void setCity(const char *city) { lv_label_set_text(s_city, city); }
}

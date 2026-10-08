#include "weather_screen.h"
#include "theme.h"

extern "C"
{
    LV_IMG_DECLARE(img_detail_0);
    LV_IMG_DECLARE(img_detail_1);
    LV_IMG_DECLARE(img_detail_2);
}

namespace weather_screen
{
    using namespace theme;

    static constexpr int DAYS = 3;
    static constexpr lv_coord_t COL_W = 152; // drei gleich breite Spalten (Details und Vorhersage)
    static lv_obj_t *s_content, *s_loading, *s_city;
    static lv_obj_t *s_icon, *s_temp, *s_sky;
    static lv_obj_t *s_feels, *s_humidity, *s_wind;
    static lv_obj_t *s_dayIcon[DAYS], *s_dayRange[DAYS];

    static lv_coord_t colX(int i) { return (SCREEN_W - 3 * COL_W) / 2 + (lang::rtl() ? 2 - i : i) * COL_W; }

    // Zeile in Leserichtung der Sprache, mittig in der Spalte
    static lv_obj_t *cell(lv_obj_t *parent, int col, lv_coord_t y, lv_coord_t h)
    {
        lv_obj_t *r = box(parent);
        lv_obj_set_pos(r, colX(col), y);
        lv_obj_set_size(r, COL_W, h);
        lv_obj_set_style_base_dir(r, lang::rtl() ? LV_BASE_DIR_RTL : LV_BASE_DIR_LTR, 0);
        lv_obj_set_flex_flow(r, LV_FLEX_FLOW_ROW);
        lv_obj_set_flex_align(r, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER);
        lv_obj_set_style_pad_column(r, 6, 0);
        return r;
    }

    // Zahlen mit Einheit immer von links nach rechts ("15°/10°", "78 %"), auch auf Arabisch
    static lv_obj_t *digits(lv_obj_t *parent, const lv_font_t *font, Role role)
    {
        lv_obj_t *l = label(parent, font, role, "");
        lv_obj_set_style_base_dir(l, LV_BASE_DIR_LTR, 0);
        return l;
    }

    // Detail rechts neben der Temperatur: Symbol und Wert (Gegenseite zum großen Symbol)
    static lv_obj_t *detail(lv_obj_t *parent, int row, const lv_img_dsc_t *icon)
    {
        lv_obj_t *r = box(parent);
        lv_obj_set_size(r, 122, 36);
        lv_obj_set_style_base_dir(r, lang::rtl() ? LV_BASE_DIR_RTL : LV_BASE_DIR_LTR, 0);
        lv_obj_set_flex_flow(r, LV_FLEX_FLOW_ROW);
        lv_obj_set_flex_align(r, LV_FLEX_ALIGN_START, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER);
        lv_obj_set_style_pad_column(r, 10, 0);
        lv_obj_align(r, lang::rtl() ? LV_ALIGN_TOP_LEFT : LV_ALIGN_TOP_RIGHT, lang::rtl() ? MARGIN : -MARGIN, 52 + row * 40);
        image(r, icon, Role::ACCENT);
        return digits(r, &font_josefin_25, Role::MAIN);
    }

    void create(lv_obj_t *parent)
    {
        lv_obj_align(image(parent, lang::text(TXT_WEATHER), Role::ACCENT), LV_ALIGN_TOP_MID, 0, 6);
        s_city = label(parent, &font_josefin_20, Role::MUTED, "");
        lv_obj_set_pos(s_city, MARGIN, 18);

        s_loading = image(parent, lang::text(TXT_NO_WEATHER), Role::MUTED);
        lv_obj_align(s_loading, LV_ALIGN_CENTER, 0, 0);

        s_content = box(parent);
        lv_obj_set_size(s_content, SCREEN_W, SCREEN_H);
        lv_obj_add_flag(s_content, LV_OBJ_FLAG_HIDDEN);

        // Oben: großes Symbol, daneben Temperatur und Beschreibung (an der Anfangsseite der Sprache)
        s_icon = image(s_content, nullptr, Role::ACCENT);
        alignStart(s_icon, MARGIN, 50);
        s_temp = digits(s_content, &font_temp_64, Role::MAIN);
        alignStart(s_temp, 144, 50);
        s_sky = image(s_content, nullptr, Role::MAIN);
        alignStart(s_sky, 146, 124);

        // Rechts: Gefühlt, Feuchte, Wind
        s_feels = detail(s_content, 0, &img_detail_0);
        s_humidity = detail(s_content, 1, &img_detail_1);
        s_wind = detail(s_content, 2, &img_detail_2);

        divider(s_content, SCREEN_W / 2, 190, SCREEN_W / 2 - MARGIN);

        // Vorhersage ohne Kästen, nur durch feine senkrechte Linien getrennt;
        // in Leserichtung: "heute" auf Arabisch ganz rechts, sonst ganz links
        static const int NAMES[DAYS] = {TXT_DAY_0, TXT_DAY_1, TXT_DAY_2};
        for (int i = 0; i < DAYS; i++)
        {
            lv_obj_t *name = image(s_content, lang::text(NAMES[i]), Role::ACCENT);
            lv_obj_set_pos(name, colX(i) + (COL_W - lang::text(NAMES[i])->header.w) / 2, 197);
            // Symbol über den Temperaturen, mittig in der Spalte
            lv_obj_t *r = box(s_content);
            lv_obj_set_pos(r, colX(i), 238);
            lv_obj_set_size(r, COL_W, 72);
            lv_obj_set_flex_flow(r, LV_FLEX_FLOW_COLUMN);
            lv_obj_set_flex_align(r, LV_FLEX_ALIGN_START, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER);
            lv_obj_set_style_pad_row(r, 0, 0);
            s_dayIcon[i] = image(r, nullptr, Role::ACCENT);
            s_dayRange[i] = digits(r, &font_josefin_25, Role::MAIN);
            if (i < DAYS - 1)
            {
                lv_obj_t *sep = box(s_content);
                setRole(sep, Role::ACCENT);
                lv_obj_set_pos(sep, colX(i) + (lang::rtl() ? 0 : COL_W) - 1, 200);
                lv_obj_set_size(sep, 2, 98);
                lv_obj_set_style_bg_opa(sep, LV_OPA_50, 0);
            }
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
        alignStart(s_sky, 146, 124);

        lv_label_set_text_fmt(s_feels, "%d°C", (int)lroundf(w.feelsLike));
        lv_label_set_text_fmt(s_humidity, "%d %%", w.humidity);
        lv_label_set_text_fmt(s_wind, "%d km/h", (int)lroundf(w.windKmh));

        for (int i = 0; i < DAYS; i++)
        {
            lv_img_set_src(s_dayIcon[i], weatherIcon(w.forecast[i].sky, true, false));
            lv_label_set_text_fmt(s_dayRange[i], "%d°/%d°", w.forecast[i].tempMax, w.forecast[i].tempMin);
        }
    }

    void setCity(const char *city) { lv_label_set_text(s_city, city); }
}

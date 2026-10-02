#include "weather_screen.h"
#include <ctype.h>
#include "theme.h"

namespace weather_screen
{
    using namespace theme;

    static constexpr int DETAILS = 3;
    static constexpr int DAYS = 3;

    static lv_obj_t *s_icon, *s_temp, *s_text, *s_range;
    static lv_obj_t *s_detailValue[DETAILS];
    static lv_obj_t *s_dayIcon[DAYS], *s_dayRange[DAYS];

    static lv_obj_t *detailRow(lv_obj_t *parent, lv_coord_t y, const char *icon, const char *name)
    {
        constexpr lv_coord_t X = 290, W = SCREEN_W - MARGIN - X;
        lv_obj_t *row = box(parent);
        lv_obj_set_pos(row, X, y);
        lv_obj_set_size(row, W, 30);

        lv_obj_t *i = label(row, &font_icons_20, gold(), icon);
        lv_obj_align(i, LV_ALIGN_LEFT_MID, 0, 0);
        lv_obj_t *n = label(row, &font_josefin_15, muted(), name);
        lv_obj_align(n, LV_ALIGN_LEFT_MID, 30, 1);
        lv_obj_t *v = label(row, &font_josefin_18, white(), "–");
        lv_obj_align(v, LV_ALIGN_RIGHT_MID, 0, 1);
        return v;
    }

    void create(lv_obj_t *parent, const char *location)
    {
        // Überschrift "WETTER · PEINE"
        char title[48];
        snprintf(title, sizeof(title), "WETTER  ·  %s", location);
        for (char *c = title; *c; c++)
            *c = toupper((unsigned char)*c);
        lv_obj_t *cap = label(parent, &font_josefin_15, muted(), title);
        lv_obj_set_style_text_letter_space(cap, 3, 0);
        lv_obj_align(cap, LV_ALIGN_TOP_MID, 0, 16);

        // Aktuell: großes Symbol, Temperatur, Beschreibung, Tageshöchst/-tiefstwert
        s_icon = label(parent, &font_icons_96, gold(), "");
        lv_obj_set_pos(s_icon, MARGIN + 4, 44);

        s_temp = label(parent, &font_temp_64, white(), "--°C");
        lv_obj_set_pos(s_temp, 136, 48);

        s_text = label(parent, &font_josefin_18, white(), "");
        lv_obj_set_pos(s_text, 140, 116);

        s_range = label(parent, &font_josefin_15, muted(), "");
        lv_obj_set_pos(s_range, 140, 142);

        // Details
        s_detailValue[0] = detailRow(parent, 54, ICON_THERMOMETER, "Gefühlt");
        s_detailValue[1] = detailRow(parent, 90, ICON_HUMIDITY, "Luftfeuchte");
        s_detailValue[2] = detailRow(parent, 126, ICON_WINDY, "Wind");

        divider(parent, SCREEN_W / 2, 182, SCREEN_W / 2 - MARGIN);

        // Vorhersage
        static const char *NAMES[DAYS] = {"Heute", "Morgen", "Übermorgen"};
        constexpr lv_coord_t CW = 138, GAP = 10, Y = 196, H = 96;
        const lv_coord_t x0 = (SCREEN_W - DAYS * CW - (DAYS - 1) * GAP) / 2;
        for (int i = 0; i < DAYS; i++)
        {
            lv_obj_t *c = box(parent);
            lv_obj_set_pos(c, x0 + i * (CW + GAP), Y);
            lv_obj_set_size(c, CW, H);
            lv_obj_set_style_radius(c, 10, 0);
            lv_obj_set_style_bg_color(c, black(), 0);
            lv_obj_set_style_bg_opa(c, LV_OPA_40, 0);
            lv_obj_set_style_border_color(c, gold(), 0);
            lv_obj_set_style_border_opa(c, LV_OPA_20, 0);
            lv_obj_set_style_border_width(c, 1, 0);

            lv_obj_t *n = label(c, &font_josefin_15, muted(), NAMES[i]);
            lv_obj_align(n, LV_ALIGN_TOP_MID, 0, 8);
            s_dayIcon[i] = label(c, &font_icons_32, gold(), "");
            lv_obj_align(s_dayIcon[i], LV_ALIGN_TOP_MID, 0, 30);
            s_dayRange[i] = label(c, &font_josefin_18, white(), "");
            lv_obj_align(s_dayRange[i], LV_ALIGN_TOP_MID, 0, 66);
        }
    }

    void setWeather(const model::Weather &w)
    {
        if (!w.valid)
        {
            lv_label_set_text(s_text, "Keine Wetterdaten");
            return;
        }
        lv_label_set_text(s_icon, skyIcon(w.sky, w.isDay));
        lv_label_set_text_fmt(s_temp, "%d°C", (int)lroundf(w.temp));
        lv_label_set_text(s_text, model::skyText(w.sky));
        lv_label_set_text_fmt(s_range, "max %d°   min %d°", w.tempMax, w.tempMin);

        lv_label_set_text_fmt(s_detailValue[0], "%d°C", (int)lroundf(w.feelsLike));
        lv_label_set_text_fmt(s_detailValue[1], "%d %%", w.humidity);
        lv_label_set_text_fmt(s_detailValue[2], "%d km/h", (int)lroundf(w.windKmh));

        for (int i = 0; i < DAYS; i++)
        {
            lv_label_set_text(s_dayIcon[i], skyIcon(w.forecast[i].sky, true));
            lv_label_set_text_fmt(s_dayRange[i], "%d°  /  %d°", w.forecast[i].tempMax, w.forecast[i].tempMin);
        }
    }
}

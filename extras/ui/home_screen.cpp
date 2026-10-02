#include "home_screen.h"
#include "theme.h"

namespace home
{
    using namespace theme;

    static constexpr lv_coord_t ROW_Y = 236; // Leiste mit den fünf Gebetszeiten
    static constexpr lv_coord_t CELL_W = 86, CELL_H = 62;
    static constexpr int CELLS = sizeof(model::DAILY_PRAYERS) / sizeof(model::DAILY_PRAYERS[0]);

    static lv_obj_t *s_clock, *s_date;
    static lv_obj_t *s_wxIcon, *s_wxTemp, *s_wxText;
    static lv_obj_t *s_nextName, *s_nextAt, *s_countdown;
    static lv_obj_t *s_cell[CELLS], *s_cellName[CELLS], *s_cellTime[CELLS];

    static void createTop(lv_obj_t *parent)
    {
        s_clock = label(parent, &font_clock_64, white(), "--:--");
        lv_obj_set_pos(s_clock, MARGIN, 14);

        s_date = label(parent, &font_josefin_15, muted(), "");
        lv_obj_set_pos(s_date, MARGIN + 2, 80);

        // Wetter: Symbol links, Temperatur und Beschreibung rechts daneben
        lv_obj_t *wx = box(parent);
        lv_obj_set_size(wx, LV_SIZE_CONTENT, LV_SIZE_CONTENT);
        lv_obj_set_flex_flow(wx, LV_FLEX_FLOW_ROW);
        lv_obj_set_flex_align(wx, LV_FLEX_ALIGN_END, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER);
        lv_obj_set_style_pad_column(wx, 10, 0);
        lv_obj_align(wx, LV_ALIGN_TOP_RIGHT, -MARGIN, 34);

        s_wxIcon = label(wx, &font_icons_32, gold(), "");
        lv_obj_t *col = box(wx);
        lv_obj_set_size(col, LV_SIZE_CONTENT, LV_SIZE_CONTENT);
        lv_obj_set_flex_flow(col, LV_FLEX_FLOW_COLUMN);
        lv_obj_set_flex_align(col, LV_FLEX_ALIGN_START, LV_FLEX_ALIGN_END, LV_FLEX_ALIGN_END);
        s_wxTemp = label(col, &font_temp_30, white(), "--°C");
        s_wxText = label(col, &font_josefin_15, muted(), "");
    }

    static void createCenter(lv_obj_t *parent)
    {
        divider(parent, SCREEN_W / 2, 108, SCREEN_W / 2 - MARGIN);

        lv_obj_t *cap = label(parent, &font_josefin_15, muted(), "NÄCHSTES GEBET");
        lv_obj_set_style_text_letter_space(cap, 3, 0);
        lv_obj_align(cap, LV_ALIGN_TOP_MID, 0, 120);

        // "MAGHRIB  19:24"
        lv_obj_t *row = box(parent);
        lv_obj_set_size(row, LV_SIZE_CONTENT, LV_SIZE_CONTENT);
        lv_obj_set_flex_flow(row, LV_FLEX_FLOW_ROW);
        lv_obj_set_flex_align(row, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER);
        lv_obj_set_style_pad_column(row, 14, 0);
        lv_obj_align(row, LV_ALIGN_TOP_MID, 0, 140);
        s_nextName = label(row, &font_marcellus_26, gold(), "");
        lv_obj_set_style_text_letter_space(s_nextName, 4, 0);
        s_nextAt = label(row, &font_josefin_18, muted(), "");

        s_countdown = label(parent, &font_count_52, white(), "--:--:--");
        lv_obj_align(s_countdown, LV_ALIGN_TOP_MID, 0, 172);
    }

    static void createPrayerRow(lv_obj_t *parent)
    {
        const lv_coord_t x0 = (SCREEN_W - CELLS * CELL_W) / 2;
        for (int i = 0; i < CELLS; i++)
        {
            lv_obj_t *c = box(parent);
            lv_obj_set_pos(c, x0 + i * CELL_W + 3, ROW_Y);
            lv_obj_set_size(c, CELL_W - 6, CELL_H);
            lv_obj_set_style_radius(c, 10, 0);
            lv_obj_set_style_border_color(c, gold(), 0);
            lv_obj_set_style_border_width(c, 0, 0);
            lv_obj_set_style_bg_color(c, gold(), 0);
            s_cell[i] = c;

            s_cellName[i] = label(c, &font_josefin_15, muted(), model::prayerName(model::DAILY_PRAYERS[i]));
            lv_obj_set_style_text_letter_space(s_cellName[i], 1, 0);
            lv_obj_align(s_cellName[i], LV_ALIGN_TOP_MID, 0, 9);

            s_cellTime[i] = label(c, &font_josefin_22, white(), "--:--");
            lv_obj_align(s_cellTime[i], LV_ALIGN_TOP_MID, 0, 30);
        }
    }

    void create(lv_obj_t *parent)
    {
        createTop(parent);
        createCenter(parent);
        createPrayerRow(parent);
    }

    void setClock(const struct tm &t)
    {
        static const char *DAYS[] = {"Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"};
        static const char *MONTHS[] = {"Januar", "Februar", "März", "April", "Mai", "Juni",
                                       "Juli", "August", "September", "Oktober", "November", "Dezember"};
        static int lastMin = -1, lastDay = -1;
        if (t.tm_min != lastMin)
        {
            lastMin = t.tm_min;
            lv_label_set_text_fmt(s_clock, "%02d:%02d", t.tm_hour, t.tm_min);
        }
        if (t.tm_mday != lastDay)
        {
            lastDay = t.tm_mday;
            lv_label_set_text_fmt(s_date, "%s, %d. %s %d", DAYS[t.tm_wday], t.tm_mday, MONTHS[t.tm_mon],
                                  t.tm_year + 1900);
        }
    }

    void setPrayers(const model::PrayerDay &day)
    {
        for (int i = 0; i < CELLS; i++)
        {
            const uint16_t m = day.minutes[model::DAILY_PRAYERS[i]];
            lv_label_set_text_fmt(s_cellTime[i], "%02d:%02d", m / 60, m % 60);
        }
    }

    void setNext(model::Prayer p, int32_t secondsLeft, uint16_t atMinutes)
    {
        static int lastPrayer = -1;
        if (p != lastPrayer)
        {
            lastPrayer = p;
            char upper[16];
            const char *n = model::prayerName(p);
            size_t i = 0;
            for (; n[i] && i < sizeof(upper) - 1; i++)
                upper[i] = toupper((unsigned char)n[i]);
            upper[i] = 0;
            lv_label_set_text(s_nextName, upper);

            // Zelle des nächsten Gebets dezent golden hervorheben
            for (int c = 0; c < CELLS; c++)
            {
                const bool on = model::DAILY_PRAYERS[c] == p;
                lv_obj_set_style_border_width(s_cell[c], on ? 1 : 0, 0);
                lv_obj_set_style_border_opa(s_cell[c], LV_OPA_70, 0);
                lv_obj_set_style_bg_opa(s_cell[c], on ? LV_OPA_10 : LV_OPA_TRANSP, 0);
                lv_obj_set_style_text_color(s_cellName[c], on ? gold() : muted(), 0);
                lv_obj_set_style_text_color(s_cellTime[c], on ? gold() : white(), 0);
            }
        }
        lv_label_set_text_fmt(s_nextAt, "%02d:%02d", atMinutes / 60, atMinutes % 60);

        if (secondsLeft < 0)
            secondsLeft = 0;
        lv_label_set_text_fmt(s_countdown, "%02ld:%02ld:%02ld", (long)(secondsLeft / 3600),
                              (long)(secondsLeft / 60 % 60), (long)(secondsLeft % 60));
    }

    void setWeather(const model::Weather &w)
    {
        if (!w.valid)
        {
            lv_label_set_text(s_wxIcon, "");
            lv_label_set_text(s_wxTemp, "--°C");
            lv_label_set_text(s_wxText, "");
            return;
        }
        lv_label_set_text(s_wxIcon, skyIcon(w.sky, w.isDay));
        lv_label_set_text_fmt(s_wxTemp, "%d°C", (int)lroundf(w.temp));
        lv_label_set_text(s_wxText, model::skyText(w.sky));
    }
}

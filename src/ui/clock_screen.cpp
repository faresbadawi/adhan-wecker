#include "clock_screen.h"
#include "theme.h"

extern "C"
{
    LV_IMG_DECLARE(img_alarm);
}

namespace clock_screen
{
    using namespace theme;

    static lv_obj_t *s_time, *s_sec, *s_weekday, *s_date;
    static lv_obj_t *s_hijri, *s_hDay, *s_hMonth, *s_hYear;
    static lv_obj_t *s_alarmRow, *s_alarmTime;

    void create(lv_obj_t *parent)
    {
        // Nächster Wecker oben rechts (nur sichtbar, wenn einer aktiv ist)
        s_alarmRow = box(parent);
        lv_obj_set_size(s_alarmRow, LV_SIZE_CONTENT, LV_SIZE_CONTENT);
        lv_obj_set_flex_flow(s_alarmRow, LV_FLEX_FLOW_ROW);
        lv_obj_set_flex_align(s_alarmRow, LV_FLEX_ALIGN_START, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER);
        lv_obj_set_style_pad_column(s_alarmRow, 4, 0);
        lv_obj_align(s_alarmRow, LV_ALIGN_TOP_RIGHT, -MARGIN, 10);
        image(s_alarmRow, &img_alarm, Role::ACCENT);
        s_alarmTime = label(s_alarmRow, &font_josefin_17, Role::MUTED, "");
        lv_obj_add_flag(s_alarmRow, LV_OBJ_FLAG_HIDDEN);

        // Uhrzeit und Sekunden nebeneinander, unten bündig, gemeinsam zentriert
        lv_obj_t *row = box(parent);
        lv_obj_set_size(row, LV_SIZE_CONTENT, LV_SIZE_CONTENT);
        lv_obj_set_flex_flow(row, LV_FLEX_FLOW_ROW);
        lv_obj_set_flex_align(row, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_END, LV_FLEX_ALIGN_END);
        lv_obj_set_style_pad_column(row, 14, 0);
        lv_obj_align(row, LV_ALIGN_TOP_MID, 0, 26);

        s_time = label(row, &font_clock_130, Role::MAIN, "--:--");
        s_sec = label(row, &font_count_52, Role::ACCENT, "--");
        // gleiche Grundlinie: Unterlänge der großen Schrift (33) minus der kleinen (13)
        lv_obj_set_style_pad_bottom(s_sec, 33 - 13, 0);

        divider(parent, SCREEN_W / 2, 166, 120);

        s_weekday = image(parent, nullptr, Role::MAIN);
        lv_obj_align(s_weekday, LV_ALIGN_TOP_MID, 0, 176);

        // Hijri-Datum in Leserichtung: Tag, Monat, Jahr
        s_hijri = box(parent);
        lv_obj_set_size(s_hijri, LV_SIZE_CONTENT, LV_SIZE_CONTENT);
        lv_obj_set_style_base_dir(s_hijri, lang::rtl() ? LV_BASE_DIR_RTL : LV_BASE_DIR_LTR, 0);
        lv_obj_set_flex_flow(s_hijri, LV_FLEX_FLOW_ROW);
        lv_obj_set_flex_align(s_hijri, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER);
        lv_obj_set_style_pad_column(s_hijri, 10, 0);
        lv_obj_align(s_hijri, LV_ALIGN_TOP_MID, 0, 222);
        s_hDay = label(s_hijri, &font_josefin_25, Role::ACCENT, "");
        s_hMonth = image(s_hijri, nullptr, Role::ACCENT);
        s_hYear = label(s_hijri, &font_josefin_25, Role::ACCENT, "");
        lv_obj_add_flag(s_hijri, LV_OBJ_FLAG_HIDDEN);

        s_date = label(parent, &font_josefin_20, Role::MUTED, "");
        lv_obj_align(s_date, LV_ALIGN_TOP_MID, 0, 276);
    }

    void setClock(const struct tm &t)
    {
        static int lastMin = -1, lastDay = -1;
        lv_label_set_text_fmt(s_sec, "%02d", t.tm_sec);
        if (t.tm_min != lastMin)
        {
            lastMin = t.tm_min;
            lv_label_set_text_fmt(s_time, "%02d:%02d", t.tm_hour, t.tm_min);
        }
        if (t.tm_mday != lastDay)
        {
            lastDay = t.tm_mday;
            lv_img_set_src(s_weekday, weekday(t.tm_wday));
            lv_obj_align(s_weekday, LV_ALIGN_TOP_MID, 0, 176);
            lv_label_set_text_fmt(s_date, "%02d.%02d.%04d", t.tm_mday, t.tm_mon + 1, t.tm_year + 1900);
        }
    }

    void setHijri(const model::PrayerDay &day)
    {
        if (!day.valid || day.hijriMonth < 1)
            return;
        lv_label_set_text_fmt(s_hDay, "%d", day.hijriDay);
        lv_img_set_src(s_hMonth, hijriMonth(day.hijriMonth));
        lv_label_set_text_fmt(s_hYear, "%d", day.hijriYear);
        lv_obj_clear_flag(s_hijri, LV_OBJ_FLAG_HIDDEN);
    }

    void setAlarm(int minutes)
    {
        if (minutes < 0)
        {
            lv_obj_add_flag(s_alarmRow, LV_OBJ_FLAG_HIDDEN);
            return;
        }
        lv_label_set_text_fmt(s_alarmTime, "%02d:%02d", minutes / 60, minutes % 60);
        lv_obj_clear_flag(s_alarmRow, LV_OBJ_FLAG_HIDDEN);
        lv_obj_align(s_alarmRow, LV_ALIGN_TOP_RIGHT, -MARGIN, 10);
    }
}

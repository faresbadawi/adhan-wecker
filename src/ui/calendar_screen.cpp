#include "calendar_screen.h"
#include "theme.h"

namespace calendar_screen
{
    using namespace theme;

    static constexpr int COLS = 7, ROWS = 6;
    static constexpr lv_coord_t CELL_W = 61, CELL_H = 37;
    static constexpr lv_coord_t GRID_X = (SCREEN_W - COLS * CELL_W) / 2, GRID_Y = 82;
    static constexpr int FRIDAY = 6; // Spalte von rechts: Samstag = 0 ... Freitag = 6

    static lv_obj_t *s_gMonth, *s_gYear;
    static lv_obj_t *s_hRow, *s_hFirst, *s_hSep, *s_hLast, *s_hYear;
    static lv_obj_t *s_cell[ROWS * COLS], *s_greg[ROWS * COLS], *s_hijri[ROWS * COLS];

    // Spalte von rechts gezählt: Samstag = 0 ... Freitag = 6
    static int columnOf(int wday) { return (wday + 1) % 7; }
    static lv_coord_t columnX(int col) { return GRID_X + (COLS - 1 - col) * CELL_W; }

    static void show(lv_obj_t *o, bool on)
    {
        if (on)
            lv_obj_clear_flag(o, LV_OBJ_FLAG_HIDDEN);
        else
            lv_obj_add_flag(o, LV_OBJ_FLAG_HIDDEN);
    }

    static int daysInMonth(int year, int month) // month 1..12
    {
        static const int DAYS[] = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
        const bool leap = (year % 4 == 0 && year % 100 != 0) || year % 400 == 0;
        return DAYS[month - 1] + (month == 2 && leap ? 1 : 0);
    }

    static lv_obj_t *rtlRow(lv_obj_t *parent, lv_coord_t gap)
    {
        lv_obj_t *r = box(parent);
        lv_obj_set_size(r, LV_SIZE_CONTENT, LV_SIZE_CONTENT);
        lv_obj_set_style_base_dir(r, LV_BASE_DIR_RTL, 0);
        lv_obj_set_flex_flow(r, LV_FLEX_FLOW_ROW);
        lv_obj_set_flex_align(r, LV_FLEX_ALIGN_START, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER);
        lv_obj_set_style_pad_column(r, gap, 0);
        return r;
    }

    void create(lv_obj_t *parent)
    {
        // Rechts: gregorianischer Monat und Jahr
        lv_obj_t *title = rtlRow(parent, 10);
        lv_obj_align(title, LV_ALIGN_TOP_RIGHT, -GRID_X, 6);
        s_gMonth = image(title, nullptr, Role::ACCENT);
        s_gYear = label(title, &font_josefin_22, Role::ACCENT, "");

        // Links: Hijri-Monat(e) und Jahr
        s_hRow = rtlRow(parent, 6);
        lv_obj_align(s_hRow, LV_ALIGN_TOP_LEFT, GRID_X, 12);
        s_hFirst = image(s_hRow, nullptr, Role::MUTED);
        s_hSep = label(s_hRow, &font_josefin_15, Role::MUTED, "/");
        s_hLast = image(s_hRow, nullptr, Role::MUTED);
        s_hYear = label(s_hRow, &font_josefin_15, Role::MUTED, "");
        lv_obj_add_flag(s_hRow, LV_OBJ_FLAG_HIDDEN);

        // Kopfzeile mit Wochentagen, Freitag in der Akzentfarbe, darunter eine feine Linie
        for (int wday = 0; wday < 7; wday++)
        {
            const int col = columnOf(wday);
            lv_obj_t *h = image(parent, weekdayShort(wday), col == FRIDAY ? Role::ACCENT : Role::MUTED);
            lv_obj_set_pos(h, columnX(col) + (CELL_W - weekdayShort(wday)->header.w) / 2, GRID_Y - 32);
        }
        divider(parent, SCREEN_W / 2, GRID_Y - 3, COLS * CELL_W / 2);

        for (int i = 0; i < ROWS * COLS; i++)
        {
            const int col = i % COLS, row = i / COLS;
            lv_obj_t *c = box(parent);
            lv_obj_set_pos(c, columnX(col) + 3, GRID_Y + row * CELL_H + 3);
            lv_obj_set_size(c, CELL_W - 6, CELL_H - 4);
            lv_obj_set_style_radius(c, 8, 0);
            setRole(c, Role::ACCENT); // Fläche für "heute"
            s_cell[i] = c;

            // gregorianisch groß und mittig, Hijri klein oben links in der Ecke
            s_greg[i] = label(c, &font_josefin_22, Role::MAIN, "");
            lv_obj_align(s_greg[i], LV_ALIGN_CENTER, 7, 3);
            s_hijri[i] = label(c, &font_josefin_15, Role::ACCENT, "");
            lv_obj_set_style_text_opa(s_hijri[i], LV_OPA_70, 0);
            lv_obj_align(s_hijri[i], LV_ALIGN_TOP_LEFT, 3, -1);
        }
    }

    void setMonth(const struct tm &today, const Hijri &hijri)
    {
        const int year = today.tm_year + 1900, month = today.tm_mon + 1;
        // Wochentag des Ersten: vom heutigen Wochentag zurückrechnen
        const int firstWday = ((today.tm_wday - (today.tm_mday - 1)) % 7 + 7) % 7;
        const int offset = columnOf(firstWday);
        const int days = daysInMonth(year, month);
        const int prevDays = daysInMonth(month == 1 ? year - 1 : year, month == 1 ? 12 : month - 1);
        const int usedRows = (offset + days + COLS - 1) / COLS;

        lv_img_set_src(s_gMonth, gregMonth(month));
        lv_label_set_text_fmt(s_gYear, "%d", year);

        if (hijri.firstMonth > 0)
        {
            lv_img_set_src(s_hFirst, hijriMonthSmall(hijri.firstMonth));
            const bool two = hijri.lastMonth > 0 && hijri.lastMonth != hijri.firstMonth;
            if (two)
                lv_img_set_src(s_hLast, hijriMonthSmall(hijri.lastMonth));
            show(s_hSep, two);
            show(s_hLast, two);
            lv_label_set_text_fmt(s_hYear, "%d", hijri.year);
            show(s_hRow, true);
        }

        for (int i = 0; i < ROWS * COLS; i++)
        {
            int d = i - offset + 1; // Monatstag in dieser Zelle
            const bool inMonth = d >= 1 && d <= days;
            const bool isToday = inMonth && d == today.tm_mday;
            const bool isFriday = i % COLS == FRIDAY;

            // Tage aus Vor- und Folgemonat blass; Zeilen ganz außerhalb des Monats ausblenden
            if (d < 1)
                d += prevDays;
            else if (d > days)
                d -= days;
            show(s_cell[i], i / COLS < usedRows);

            lv_label_set_text_fmt(s_greg[i], "%d", d);
            lv_obj_align(s_greg[i], LV_ALIGN_CENTER, 7, 3);
            if (inMonth && hijri.day[d - 1] > 0)
                lv_label_set_text_fmt(s_hijri[i], "%d", hijri.day[d - 1]);
            else
                lv_label_set_text(s_hijri[i], "");

            lv_obj_set_style_bg_opa(s_cell[i], isToday ? LV_OPA_COVER : LV_OPA_TRANSP, 0);
            lv_obj_set_style_text_opa(s_greg[i], inMonth ? LV_OPA_COVER : LV_OPA_30, 0);
            setRole(s_greg[i], isFriday && inMonth ? Role::ACCENT : Role::MAIN);
            if (isToday)
            {
                // dunkle Schrift auf der Akzentfläche
                lv_obj_set_style_text_color(s_greg[i], black(), 0);
                lv_obj_set_style_text_color(s_hijri[i], black(), 0);
            }
            else
            {
                lv_obj_remove_local_style_prop(s_greg[i], LV_STYLE_TEXT_COLOR, 0);
                lv_obj_remove_local_style_prop(s_hijri[i], LV_STYLE_TEXT_COLOR, 0);
            }
        }
    }
}

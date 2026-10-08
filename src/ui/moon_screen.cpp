#include "moon_screen.h"
#include <math.h>
#include "theme.h"

extern "C"
{
    LV_IMG_DECLARE(img_moon_orn);
}

namespace moon_screen
{
    using namespace theme;

    static constexpr lv_coord_t MOON = 132;  // Durchmesser der Mondscheibe
    static constexpr lv_coord_t CX = 128, CY = 176; // Mittelpunkt (LTR; bei Arabisch gespiegelt)
    static constexpr double SYNODIC = 29.530588853;

    static lv_obj_t *s_canvas, *s_glow, *s_orn, *s_phase, *s_pct;
    static lv_obj_t *s_hDay, *s_hMonth, *s_hYear, *s_days[30];
    static lv_color_t *s_buf = nullptr;
    static int s_lastAge10 = -1;

    // Mond immer links, Text rechts – in allen Sprachen gleich
    static lv_coord_t mx(lv_coord_t x) { return x; }

    // Mondalter in Tagen (0 = Neumond), Referenz-Neumond 6. Januar 2000, 18:14 UTC
    static double moonAge(time_t now)
    {
        const double days = (double)(now - 947182440) / 86400.0;
        double age = fmod(days, SYNODIC);
        return age < 0 ? age + SYNODIC : age;
    }

    // Mondscheibe Pixel für Pixel: beleuchteter Teil hell, Schattenteil dunkel (Erdlicht), Rand geglättet
    static void drawMoon(double age)
    {
        const double th = 2 * M_PI * age / SYNODIC;
        const double r = MOON / 2.0 - 1;
        const lv_color_t lit = lv_color_hex(0xF2E6C9), dark = lv_color_hex(0x161925);
        for (int y = 0; y < MOON; y++)
        {
            for (int x = 0; x < MOON; x++)
            {
                // 2x2-Überabtastung für weiche Kanten
                int inside = 0, bright = 0;
                for (int sy = 0; sy < 2; sy++)
                    for (int sx = 0; sx < 2; sx++)
                    {
                        const double px = x + 0.25 + 0.5 * sx - MOON / 2.0, py = y + 0.25 + 0.5 * sy - MOON / 2.0;
                        if (px * px + py * py > r * r)
                            continue;
                        inside++;
                        const double w = sqrt(r * r - py * py);
                        // zunehmend: rechte Seite hell ab w*cos(th); abnehmend: linke Seite bis -w*cos(th)
                        const bool on = th < M_PI ? px >= w * cos(th) : px <= -w * cos(th);
                        if (on)
                            bright++;
                    }
                // Schattenteil durchscheinend (Erdlicht), beleuchteter Teil deckend
                const lv_opa_t a = (inside * (150 + 105 * bright / (inside ? inside : 1))) / 4;
                const lv_color_t c = lv_color_mix(lit, dark, bright * 255 / (inside ? inside : 1));
                lv_canvas_set_px_color(s_canvas, x, y, c);
                lv_canvas_set_px_opa(s_canvas, x, y, a);
            }
        }
        lv_obj_invalidate(s_canvas);
    }

    void create(lv_obj_t *parent)
    {
        lv_obj_align(image(parent, lang::text(TXT_MOON_TITLE), Role::ACCENT), LV_ALIGN_TOP_MID, 0, 8);

        // Schein hinter dem Mond (atmet langsam)
        s_glow = box(parent);
        lv_obj_set_size(s_glow, MOON + 34, MOON + 34);
        lv_obj_set_pos(s_glow, mx(CX) - (MOON + 34) / 2, CY - (MOON + 34) / 2);
        lv_obj_set_style_radius(s_glow, LV_RADIUS_CIRCLE, 0);
        setRole(s_glow, Role::ACCENT);
        lv_obj_set_style_bg_opa(s_glow, LV_OPA_COVER, 0);
        lv_obj_set_style_bg_opa(s_glow, LV_OPA_30, 0);

        // Achtstern-Ornament um den Mond, blendet versetzt zum Schein langsam auf und ab
        // (Drehen von Alphamasken verträgt LVGL 8 nicht)
        s_orn = image(parent, &img_moon_orn, Role::ACCENT);
        lv_obj_set_pos(s_orn, mx(CX) - img_moon_orn.header.w / 2, CY - img_moon_orn.header.h / 2);
        lv_obj_set_style_img_opa(s_orn, LV_OPA_80, 0);

        // Mondscheibe
        s_buf = (lv_color_t *)heap_caps_malloc(LV_CANVAS_BUF_SIZE_TRUE_COLOR_ALPHA(MOON, MOON), MALLOC_CAP_SPIRAM);
        s_canvas = lv_canvas_create(parent);
        lv_canvas_set_buffer(s_canvas, s_buf, MOON, MOON, LV_IMG_CF_TRUE_COLOR_ALPHA);
        lv_canvas_fill_bg(s_canvas, lv_color_black(), LV_OPA_TRANSP);
        lv_obj_set_pos(s_canvas, mx(CX) - MOON / 2, CY - MOON / 2);

        // funkelnde Sterne um den Mond
        static const lv_coord_t STARS[][2] = {{30, 70}, {214, 92}, {44, 270}, {222, 250}, {120, 58}, {196, 296}};
        for (int i = 0; i < 6; i++)
        {
            lv_obj_t *st = box(parent);
            lv_obj_set_size(st, 4, 4);
            lv_obj_set_style_radius(st, LV_RADIUS_CIRCLE, 0);
            setRole(st, Role::MAIN);
            lv_obj_set_style_bg_opa(st, LV_OPA_COVER, 0);
            lv_obj_set_pos(st, mx(STARS[i][0]), STARS[i][1]);
            lv_obj_set_style_bg_opa(st, i % 2 ? LV_OPA_50 : LV_OPA_COVER, 0);
        }

        // Hijri-Datum groß, an der anderen Seite
        const lv_coord_t TX = 262; // linker Rand der Textspalte (LTR)
        lv_obj_t *col = box(parent);
        lv_obj_set_size(col, SCREEN_W - TX - MARGIN, 236);
        lv_obj_set_pos(col, TX, 60);
        lv_obj_set_flex_flow(col, LV_FLEX_FLOW_COLUMN);
        lv_obj_set_flex_align(col, LV_FLEX_ALIGN_START, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER);
        lv_obj_set_style_pad_row(col, 4, 0);
        s_hDay = label(col, &font_count_52, Role::ACCENT, "--");
        s_hMonth = image(col, nullptr, Role::MAIN);
        s_hYear = label(col, &font_josefin_20, Role::MUTED, "");

        // Monatsleiste: 30 Punkte, Weiße Tage größer, heute in der Akzentfarbe
        lv_obj_t *bar = box(col);
        lv_obj_set_size(bar, SCREEN_W - TX - MARGIN, 26);
        lv_obj_set_style_pad_top(bar, 10, 0);
        lv_obj_set_style_base_dir(bar, lang::rtl() ? LV_BASE_DIR_RTL : LV_BASE_DIR_LTR, 0);
        lv_obj_set_flex_flow(bar, LV_FLEX_FLOW_ROW_WRAP);
        lv_obj_set_flex_align(bar, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER);
        lv_obj_set_style_pad_column(bar, 2, 0);
        for (int i = 0; i < 30; i++)
        {
            s_days[i] = box(bar);
            const bool white = i >= 12 && i <= 14;
            lv_obj_set_size(s_days[i], white ? 6 : 4, white ? 6 : 4);
            lv_obj_set_style_radius(s_days[i], LV_RADIUS_CIRCLE, 0);
            setRole(s_days[i], Role::MUTED);
            lv_obj_set_style_bg_opa(s_days[i], LV_OPA_COVER, 0);
        }
        lv_obj_t *wd = box(col);
        lv_obj_set_size(wd, LV_SIZE_CONTENT, LV_SIZE_CONTENT);
        lv_obj_set_flex_flow(wd, LV_FLEX_FLOW_ROW);
        lv_obj_set_flex_align(wd, LV_FLEX_ALIGN_START, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER);
        lv_obj_set_style_pad_column(wd, 6, 0);
        lv_obj_set_style_base_dir(wd, lang::rtl() ? LV_BASE_DIR_RTL : LV_BASE_DIR_LTR, 0);
        image(wd, lang::text(TXT_WHITE_DAYS), Role::MUTED);
        lv_obj_t *range = label(wd, &font_josefin_17, Role::MUTED, "13–15");
        lv_obj_set_style_base_dir(range, LV_BASE_DIR_LTR, 0); // Zahlenbereich nicht umdrehen

        // Mondphase in Worten und beleuchteter Anteil
        lv_obj_t *ph = box(col);
        lv_obj_set_size(ph, LV_SIZE_CONTENT, LV_SIZE_CONTENT);
        lv_obj_set_style_pad_top(ph, 8, 0);
        lv_obj_set_flex_flow(ph, LV_FLEX_FLOW_ROW);
        lv_obj_set_flex_align(ph, LV_FLEX_ALIGN_START, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER);
        lv_obj_set_style_pad_column(ph, 8, 0);
        lv_obj_set_style_base_dir(ph, lang::rtl() ? LV_BASE_DIR_RTL : LV_BASE_DIR_LTR, 0);
        s_phase = image(ph, nullptr, Role::MAIN);
        s_pct = label(ph, &font_josefin_20, Role::ACCENT, "");
    }

    void update(time_t now, const model::PrayerDay &day)
    {
        const double age = moonAge(now);
        const int age10 = (int)(age * 10);
        if (age10 != s_lastAge10)
        {
            s_lastAge10 = age10;
            drawMoon(age);
        }
        const double illum = (1 - cos(2 * M_PI * age / SYNODIC)) / 2;
        lv_label_set_text_fmt(s_pct, "%d %%", (int)lround(illum * 100));
        const int octant = (int)floor(age / SYNODIC * 8 + 0.5) % 8;
        lv_img_set_src(s_phase, lang::text(TXT_MOONPHASE_0 + octant));

        if (day.valid && day.hijriMonth >= 1)
        {
            lv_label_set_text_fmt(s_hDay, "%d", day.hijriDay);
            lv_img_set_src(s_hMonth, hijriMonth(day.hijriMonth));
            lv_label_set_text_fmt(s_hYear, "%d", day.hijriYear);
            for (int i = 0; i < 30; i++)
            {
                const bool past = i < day.hijriDay - 1, today = i == day.hijriDay - 1;
                setRole(s_days[i], today ? Role::ACCENT : (i >= 12 && i <= 14 ? Role::MAIN : Role::MUTED));
                lv_obj_set_style_bg_opa(s_days[i], today ? LV_OPA_COVER : past ? LV_OPA_40 : LV_OPA_80, 0);
                lv_obj_set_size(s_days[i], today ? 10 : (i >= 12 && i <= 14 ? 6 : 4), today ? 10 : (i >= 12 && i <= 14 ? 6 : 4));
            }
        }
    }
}

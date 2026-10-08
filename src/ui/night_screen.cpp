#include "night_screen.h"
#include "theme.h"

namespace night_screen
{
    using namespace theme;

    // Zeitleiste der Nacht: Maghrib (0) ... Mitte (1/2) ... letztes Drittel (2/3) ... Fajr (1)
    static constexpr lv_coord_t LINE_X0 = 48, LINE_X1 = SCREEN_W - 48, LINE_Y = 214;

    static lv_obj_t *s_content, *s_loading;
    static lv_obj_t *s_time, *s_state, *s_countdown, *s_sunrise;
    static lv_obj_t *s_tMaghrib, *s_tMidnight, *s_tFajr, *s_now;

    // Zahlen immer von links nach rechts, auch in der arabischen Anzeige
    static lv_obj_t *digits(lv_obj_t *parent, const lv_font_t *font, Role role)
    {
        lv_obj_t *l = label(parent, font, role, "");
        lv_obj_set_style_base_dir(l, LV_BASE_DIR_LTR, 0);
        return l;
    }

    static void setClockText(lv_obj_t *l, int32_t minutes)
    {
        const int m = ((minutes % 1440) + 1440) % 1440;
        lv_label_set_text_fmt(l, "%02d:%02d", m / 60, m % 60);
    }

    // Position auf der Leiste; Arabisch von rechts nach links (Maghrib rechts)
    static lv_coord_t lineX(float f)
    {
        const lv_coord_t x = LINE_X0 + (lv_coord_t)((LINE_X1 - LINE_X0) * f);
        return lang::rtl() ? SCREEN_W - x : x;
    }

    static lv_obj_t *bar(lv_obj_t *parent, lv_coord_t x0, lv_coord_t x1, lv_coord_t h, lv_opa_t opa)
    {
        lv_obj_t *b = box(parent);
        lv_obj_set_pos(b, LV_MIN(x0, x1), LINE_Y - h / 2);
        lv_obj_set_size(b, LV_ABS(x1 - x0), h);
        lv_obj_set_style_radius(b, h / 2, 0);
        setRole(b, Role::ACCENT);
        lv_obj_set_style_bg_opa(b, opa, 0);
        return b;
    }

    // Name und Uhrzeit über einem Punkt der Leiste
    static lv_obj_t *mark(lv_obj_t *parent, float f, const lv_img_dsc_t *name)
    {
        const lv_coord_t x = lineX(f);
        lv_obj_t *tick = box(parent);
        lv_obj_set_size(tick, 2, 14);
        lv_obj_set_pos(tick, x - 1, LINE_Y - 7);
        setRole(tick, Role::MUTED);
        lv_obj_set_style_bg_opa(tick, LV_OPA_COVER, 0);

        lv_obj_t *col = box(parent);
        lv_obj_set_size(col, 120, LV_SIZE_CONTENT);
        lv_obj_set_flex_flow(col, LV_FLEX_FLOW_COLUMN);
        lv_obj_set_flex_align(col, LV_FLEX_ALIGN_START, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER);
        lv_obj_set_style_pad_row(col, 0, 0);
        image(col, name, Role::MUTED);
        lv_obj_t *t = digits(col, &font_josefin_20, Role::MAIN);
        // Enden nach innen bündig, damit nichts über den Rand ragt
        lv_coord_t left = x - 60;
        left = LV_MAX(MARGIN - 10, LV_MIN(left, SCREEN_W - MARGIN + 10 - 120));
        lv_obj_set_pos(col, left, LINE_Y - 56);
        return t;
    }

    void create(lv_obj_t *parent)
    {
        lv_obj_align(image(parent, lang::text(TXT_NIGHT_TITLE), Role::ACCENT), LV_ALIGN_TOP_MID, 0, 8);

        s_loading = image(parent, lang::text(TXT_LOADING), Role::MUTED);
        lv_obj_align(s_loading, LV_ALIGN_CENTER, 0, 0);

        s_content = box(parent);
        lv_obj_set_size(s_content, SCREEN_W, SCREEN_H);
        lv_obj_add_flag(s_content, LV_OBJ_FLAG_HIDDEN);

        // Beginn des letzten Drittels groß, darunter der Countdown
        s_time = digits(s_content, &font_clock_64, Role::MAIN);
        lv_obj_align(s_time, LV_ALIGN_TOP_MID, 0, 52);

        lv_obj_t *row = box(s_content);
        lv_obj_set_size(row, LV_SIZE_CONTENT, 32);
        lv_obj_set_style_base_dir(row, lang::rtl() ? LV_BASE_DIR_RTL : LV_BASE_DIR_LTR, 0);
        lv_obj_set_flex_flow(row, LV_FLEX_FLOW_ROW);
        lv_obj_set_flex_align(row, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER);
        lv_obj_set_style_pad_column(row, 10, 0);
        lv_obj_align(row, LV_ALIGN_TOP_MID, 0, 122);
        s_state = image(row, lang::text(TXT_NIGHT_IN), Role::MUTED);
        s_countdown = digits(row, &font_josefin_25, Role::ACCENT);

        // Zeitleiste: ganze Nacht dünn, letztes Drittel kräftig
        bar(s_content, lineX(0), lineX(1), 2, LV_OPA_40);
        bar(s_content, lineX(2.0f / 3), lineX(1), 8, LV_OPA_COVER);
        s_tMaghrib = mark(s_content, 0, prayerName(model::MAGHRIB, false));
        s_tMidnight = mark(s_content, 0.5f, lang::text(TXT_MIDNIGHT_LBL));
        s_tFajr = mark(s_content, 1, prayerName(model::FAJR, false));

        // Beschriftung des hervorgehobenen Abschnitts unter der Leiste
        const lv_img_dsc_t *thirdTxt = lang::text(TXT_LASTTHIRD_LBL);
        lv_obj_t *third = image(s_content, thirdTxt, Role::ACCENT);
        lv_obj_set_pos(third, (lineX(2.0f / 3) + lineX(1)) / 2 - thirdTxt->header.w / 2, LINE_Y + 10);

        // Punkt für "jetzt"
        s_now = box(s_content);
        lv_obj_set_size(s_now, 14, 14);
        lv_obj_set_style_radius(s_now, LV_RADIUS_CIRCLE, 0);
        setRole(s_now, Role::MAIN);
        lv_obj_set_style_bg_opa(s_now, LV_OPA_COVER, 0);
        lv_obj_add_flag(s_now, LV_OBJ_FLAG_HIDDEN);

        // Sonnenaufgang klein unten
        lv_obj_t *sun = box(s_content);
        lv_obj_set_size(sun, LV_SIZE_CONTENT, LV_SIZE_CONTENT);
        lv_obj_set_style_base_dir(sun, lang::rtl() ? LV_BASE_DIR_RTL : LV_BASE_DIR_LTR, 0);
        lv_obj_set_flex_flow(sun, LV_FLEX_FLOW_ROW);
        lv_obj_set_flex_align(sun, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER);
        lv_obj_set_style_pad_column(sun, 8, 0);
        image(sun, prayerName(model::SUNRISE, false), Role::MUTED);
        s_sunrise = digits(sun, &font_josefin_20, Role::MUTED);
        lv_obj_align(sun, LV_ALIGN_TOP_MID, 0, 262);
    }

    void set(const model::NightTimes &n)
    {
        if (!n.valid)
        {
            lv_obj_add_flag(s_content, LV_OBJ_FLAG_HIDDEN);
            lv_obj_clear_flag(s_loading, LV_OBJ_FLAG_HIDDEN);
            return;
        }
        lv_obj_clear_flag(s_content, LV_OBJ_FLAG_HIDDEN);
        lv_obj_add_flag(s_loading, LV_OBJ_FLAG_HIDDEN);

        setClockText(s_time, n.lastThird);
        setClockText(s_tMaghrib, n.maghrib);
        setClockText(s_tMidnight, n.midnight);
        setClockText(s_tFajr, n.fajr);
        setClockText(s_sunrise, n.sunrise);

        if (n.secondsToLastThird > 0)
        {
            const int32_t s = n.secondsToLastThird;
            lv_img_set_src(s_state, lang::text(TXT_NIGHT_IN));
            lv_label_set_text_fmt(s_countdown, "%02d:%02d:%02d", (int)(s / 3600), (int)(s / 60 % 60), (int)(s % 60));
            lv_obj_clear_flag(s_countdown, LV_OBJ_FLAG_HIDDEN);
        }
        else
        {
            lv_img_set_src(s_state, lang::text(TXT_NIGHT_NOW));
            lv_obj_add_flag(s_countdown, LV_OBJ_FLAG_HIDDEN);
        }

        // "jetzt" auf der Leiste, nur während der Nacht
        const float len = (float)(n.fajr - n.maghrib);
        const float pos = ((float)n.lastThird - n.secondsToLastThird / 60.0f - n.maghrib) / (len > 0 ? len : 1);
        if (pos >= 0 && pos <= 1)
        {
            lv_obj_set_pos(s_now, lineX(pos) - 7, LINE_Y - 7);
            lv_obj_clear_flag(s_now, LV_OBJ_FLAG_HIDDEN);
        }
        else
            lv_obj_add_flag(s_now, LV_OBJ_FLAG_HIDDEN);
    }
}

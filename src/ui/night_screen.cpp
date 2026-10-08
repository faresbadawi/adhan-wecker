#include "night_screen.h"
#include "theme.h"

namespace night_screen
{
    using namespace theme;

    static constexpr lv_coord_t CARD_W = 214, CARD_H = 78, CARD_Y = 42;
    static constexpr lv_coord_t SIDE_W = 112; // Fajr und Sonnenaufgang links und rechts vom Rahmen

    static lv_obj_t *s_content, *s_loading;
    static lv_obj_t *s_time, *s_state, *s_countdown;
    static lv_obj_t *s_fajr, *s_sunrise;

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

    // Name über Uhrzeit, mittig in einer Spalte der Breite SIDE_W
    static lv_obj_t *sideCell(lv_obj_t *parent, lv_coord_t x, int nameId)
    {
        lv_obj_t *c = box(parent);
        lv_obj_set_pos(c, x, CARD_Y + 11);
        lv_obj_set_size(c, SIDE_W, 56);
        lv_obj_t *name = image(c, lang::text(nameId), Role::ACCENT);
        lv_obj_align(name, LV_ALIGN_TOP_MID, 0, 0);
        lv_obj_t *t = digits(c, &font_josefin_25, Role::MAIN);
        lv_obj_align(t, LV_ALIGN_TOP_MID, 0, 26);
        return t;
    }

    void create(lv_obj_t *parent)
    {
        lv_obj_align(image(parent, lang::text(TXT_NIGHT_TITLE), Role::ACCENT), LV_ALIGN_TOP_MID, 0, 6);

        s_loading = image(parent, lang::text(TXT_LOADING), Role::MUTED);
        lv_obj_align(s_loading, LV_ALIGN_CENTER, 0, 0);

        s_content = box(parent);
        lv_obj_set_size(s_content, SCREEN_W, SCREEN_H);
        lv_obj_add_flag(s_content, LV_OBJ_FLAG_HIDDEN);

        // Mitte: Beginn des letzten Drittels in doppeltem Rahmen
        lv_obj_t *card = box(s_content);
        lv_obj_set_size(card, CARD_W, CARD_H);
        lv_obj_align(card, LV_ALIGN_TOP_MID, 0, CARD_Y);
        lv_obj_set_style_radius(card, 16, 0);
        setRole(card, Role::ACCENT);
        lv_obj_set_style_border_opa(card, LV_OPA_COVER, 0);
        lv_obj_set_style_border_width(card, 2, 0);
        lv_obj_set_style_outline_width(card, 1, 0);
        lv_obj_set_style_outline_pad(card, 4, 0);
        lv_obj_set_style_outline_opa(card, LV_OPA_50, 0);
        lv_obj_set_style_outline_color(card, lv_obj_get_style_border_color(card, 0), 0);
        s_time = digits(card, &font_clock_64, Role::MAIN);
        lv_obj_center(s_time);

        // Fajr und Sonnenaufgang beiderseits, in Leserichtung (Arabisch: Fajr rechts)
        const lv_coord_t xFirst = lang::rtl() ? SCREEN_W - MARGIN - SIDE_W : MARGIN;
        const lv_coord_t xSecond = lang::rtl() ? MARGIN : SCREEN_W - MARGIN - SIDE_W;
        s_fajr = sideCell(s_content, xFirst, TXT_NIGHTCOL_0);
        s_sunrise = sideCell(s_content, xSecond, TXT_NIGHTCOL_1);

        // Countdown bzw. "jetzt"
        lv_obj_t *row = box(s_content);
        lv_obj_set_size(row, LV_SIZE_CONTENT, 34);
        lv_obj_set_style_base_dir(row, lang::rtl() ? LV_BASE_DIR_RTL : LV_BASE_DIR_LTR, 0);
        lv_obj_set_flex_flow(row, LV_FLEX_FLOW_ROW);
        lv_obj_set_flex_align(row, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER);
        lv_obj_set_style_pad_column(row, 10, 0);
        lv_obj_align(row, LV_ALIGN_TOP_MID, 0, 126);
        s_state = image(row, lang::text(TXT_NIGHT_IN), Role::MUTED);
        s_countdown = digits(row, &font_josefin_25, Role::ACCENT);

        divider(s_content, SCREEN_W / 2, 168, SCREEN_W / 2 - MARGIN);

        // Vers zum Nachtgebet
        lv_obj_t *verse = image(s_content, lang::text(TXT_VERSE), Role::MAIN);
        lv_obj_align(verse, LV_ALIGN_TOP_MID, 0, 178);
        lv_obj_align_to(image(s_content, lang::text(TXT_VERSE_SRC), Role::ACCENT), verse, LV_ALIGN_OUT_BOTTOM_MID, 0, 8);
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
        setClockText(s_fajr, n.fajr);
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
    }
}

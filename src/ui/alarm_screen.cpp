#include "alarm_screen.h"
#include "theme.h"

extern "C"
{
    LV_IMG_DECLARE(img_alarm_lg);
    LV_IMG_DECLARE(img_snooze);
}

namespace alarm_screen
{
    using namespace theme;

    static lv_obj_t *s_root, *s_time, *s_title, *s_name;
    static void (*s_onStop)() = nullptr;
    static void (*s_onSnooze)(int) = nullptr;
    // Schlummern: Dauer mit - und + in 5er-Schritten (5..30 Minuten), Tippen auf die Mitte schlummert
    static constexpr int SNOOZE_MIN = 5, SNOOZE_MAX = 30, SNOOZE_STEP = 5;
    static int s_snooze = SNOOZE_MIN;
    static lv_obj_t *s_snoozeLbl;

    static void setSnoozeText()
    {
        if (lang::rtl())
            lv_label_set_text_fmt(s_snoozeLbl, "%d د", s_snooze);
        else
            lv_label_set_text_fmt(s_snoozeLbl, "%d min", s_snooze);
    }

    // Runde, zurückhaltende Taste; Berührungen stoppen den Wecker nicht (eigenes Klick-Ereignis)
    static lv_obj_t *pill(lv_obj_t *row, lv_coord_t w, lv_event_cb_t cb, intptr_t data)
    {
        lv_obj_t *b = box(row);
        lv_obj_add_flag(b, LV_OBJ_FLAG_CLICKABLE);
        lv_obj_set_size(b, w, 40);
        lv_obj_set_style_radius(b, 20, 0);
        setRole(b, Role::MUTED);
        lv_obj_set_style_border_width(b, 1, 0);
        lv_obj_set_style_border_opa(b, LV_OPA_60, 0);
        lv_obj_set_style_bg_opa(b, LV_OPA_TRANSP, 0);
        lv_obj_set_style_bg_opa(b, LV_OPA_20, LV_STATE_PRESSED);
        lv_obj_set_ext_click_area(b, 6);
        lv_obj_set_user_data(b, (void *)data);
        lv_obj_add_event_cb(b, cb, LV_EVENT_CLICKED, nullptr);
        return b;
    }

    static void step(lv_event_t *e)
    {
        const int d = (int)(intptr_t)lv_obj_get_user_data(lv_event_get_target(e));
        s_snooze = LV_CLAMP(SNOOZE_MIN, s_snooze + d, SNOOZE_MAX);
        setSnoozeText();
    }

    void create(void (*onStop)(), void (*onSnooze)(int minutes))
    {
        s_onStop = onStop;
        s_onSnooze = onSnooze;

        // Vollflächig und klickbar: ein Tippen irgendwo stoppt den Wecker
        s_root = box(lv_layer_top());
        lv_obj_add_flag(s_root, LV_OBJ_FLAG_CLICKABLE);
        lv_obj_add_flag(s_root, LV_OBJ_FLAG_HIDDEN);
        lv_obj_set_size(s_root, SCREEN_W, SCREEN_H);
        lv_obj_add_event_cb(s_root, [](lv_event_t *) { if (s_onStop) s_onStop(); }, LV_EVENT_CLICKED, nullptr);
        background(s_root);

        lv_obj_t *card = box(s_root);
        lv_obj_set_size(card, 400, 296);
        lv_obj_center(card);
        lv_obj_set_style_radius(card, 14, 0);
        setRole(card, Role::ACCENT);
        lv_obj_set_style_bg_color(card, black(), 0);
        lv_obj_set_style_bg_opa(card, LV_OPA_70, 0);
        lv_obj_set_style_border_opa(card, LV_OPA_70, 0);
        lv_obj_set_style_border_width(card, 1, 0);

        lv_obj_align(image(card, &img_alarm_lg, Role::ACCENT), LV_ALIGN_TOP_MID, 0, 12);
        s_title = image(card, lang::text(TXT_ALARM), Role::ACCENT);
        lv_obj_align(s_title, LV_ALIGN_TOP_MID, 0, 76);
        // eigener Name statt "Wecker" (Schrift mit arabischer Ersatzschrift)
        s_name = label(card, &font_josefin_20, Role::ACCENT, "");
        lv_obj_set_width(s_name, 360);
        lv_label_set_long_mode(s_name, LV_LABEL_LONG_DOT);
        lv_obj_set_style_text_align(s_name, LV_TEXT_ALIGN_CENTER, 0);
        lv_obj_set_style_base_dir(s_name, LV_BASE_DIR_AUTO, 0);
        lv_obj_align(s_name, LV_ALIGN_TOP_MID, 0, 82);
        s_time = label(card, &font_count_52, Role::MAIN, "");
        lv_obj_align(s_time, LV_ALIGN_TOP_MID, 0, 116);
        divider(card, 200, 184, 150);
        lv_obj_align(image(card, lang::text(TXT_ALARM_STOP), Role::MAIN), LV_ALIGN_TOP_MID, 0, 196);

        // Schlummern: [-] [Symbol + Minuten] [+], Mitte antippen = schlummern
        lv_obj_t *row = box(card);
        lv_obj_set_size(row, LV_SIZE_CONTENT, LV_SIZE_CONTENT);
        lv_obj_set_flex_flow(row, LV_FLEX_FLOW_ROW);
        lv_obj_set_flex_align(row, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER);
        lv_obj_set_style_pad_column(row, 10, 0);
        lv_obj_set_style_base_dir(row, LV_BASE_DIR_LTR, 0);
        lv_obj_align(row, LV_ALIGN_TOP_MID, 0, 238);

        lv_obj_t *minus = pill(row, 40, step, -SNOOZE_STEP);
        lv_obj_center(label(minus, &font_josefin_20, Role::MUTED, "-"));

        lv_obj_t *mid = pill(row, 132, [](lv_event_t *) { if (s_onSnooze) s_onSnooze(s_snooze); }, 0);
        lv_obj_t *in = box(mid);
        lv_obj_set_size(in, LV_SIZE_CONTENT, LV_SIZE_CONTENT);
        lv_obj_set_flex_flow(in, LV_FLEX_FLOW_ROW);
        lv_obj_set_flex_align(in, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER);
        lv_obj_set_style_pad_column(in, 8, 0);
        lv_obj_clear_flag(in, LV_OBJ_FLAG_CLICKABLE);
        lv_obj_center(in);
        image(in, &img_snooze, Role::MUTED);
        s_snoozeLbl = label(in, &font_josefin_17, Role::MUTED, "");
        setSnoozeText();

        lv_obj_t *plus = pill(row, 40, step, SNOOZE_STEP);
        lv_obj_center(label(plus, &font_josefin_20, Role::MUTED, "+"));
    }

    void show(bool on, int hour, int minute, const char *name)
    {
        if (on)
        {
            const bool named = name && name[0];
            lv_label_set_text(s_name, named ? name : "");
            if (named)
            {
                lv_obj_add_flag(s_title, LV_OBJ_FLAG_HIDDEN);
                lv_obj_clear_flag(s_name, LV_OBJ_FLAG_HIDDEN);
            }
            else
            {
                lv_obj_clear_flag(s_title, LV_OBJ_FLAG_HIDDEN);
                lv_obj_add_flag(s_name, LV_OBJ_FLAG_HIDDEN);
            }
            lv_label_set_text_fmt(s_time, "%02d:%02d", hour, minute);
            s_snooze = SNOOZE_MIN; // jedes Klingeln beginnt wieder mit 5 Minuten
            setSnoozeText();
            lv_obj_align(s_time, LV_ALIGN_TOP_MID, 0, 116);
            lv_obj_clear_flag(s_root, LV_OBJ_FLAG_HIDDEN);
        }
        else
        {
            lv_obj_add_flag(s_root, LV_OBJ_FLAG_HIDDEN);
        }
    }
}

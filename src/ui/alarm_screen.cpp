#include "alarm_screen.h"
#include "theme.h"

extern "C"
{
    LV_IMG_DECLARE(img_alarm_lg);
}

namespace alarm_screen
{
    using namespace theme;

    static lv_obj_t *s_root, *s_time;
    static void (*s_onStop)() = nullptr;

    void create(void (*onStop)())
    {
        s_onStop = onStop;

        // Vollflächig und klickbar: ein Tippen irgendwo stoppt den Wecker
        s_root = box(lv_layer_top());
        lv_obj_add_flag(s_root, LV_OBJ_FLAG_CLICKABLE);
        lv_obj_add_flag(s_root, LV_OBJ_FLAG_HIDDEN);
        lv_obj_set_size(s_root, SCREEN_W, SCREEN_H);
        lv_obj_add_event_cb(s_root, [](lv_event_t *) { if (s_onStop) s_onStop(); }, LV_EVENT_CLICKED, nullptr);
        background(s_root);

        lv_obj_t *card = box(s_root);
        lv_obj_set_size(card, 380, 250);
        lv_obj_center(card);
        lv_obj_set_style_radius(card, 14, 0);
        setRole(card, Role::ACCENT);
        lv_obj_set_style_bg_color(card, black(), 0);
        lv_obj_set_style_bg_opa(card, LV_OPA_70, 0);
        lv_obj_set_style_border_opa(card, LV_OPA_70, 0);
        lv_obj_set_style_border_width(card, 1, 0);

        lv_obj_align(image(card, &img_alarm_lg, Role::ACCENT), LV_ALIGN_TOP_MID, 0, 18);
        lv_obj_align(image(card, lang::text(TXT_ALARM), Role::ACCENT), LV_ALIGN_TOP_MID, 0, 86);
        s_time = label(card, &font_count_52, Role::MAIN, "");
        lv_obj_align(s_time, LV_ALIGN_TOP_MID, 0, 128);
        divider(card, 190, 192, 140);
        lv_obj_align(image(card, lang::text(TXT_ALARM_STOP), Role::MUTED), LV_ALIGN_TOP_MID, 0, 204);
    }

    void show(bool on, int hour, int minute)
    {
        if (on)
        {
            lv_label_set_text_fmt(s_time, "%02d:%02d", hour, minute);
            lv_obj_align(s_time, LV_ALIGN_TOP_MID, 0, 128);
            lv_obj_clear_flag(s_root, LV_OBJ_FLAG_HIDDEN);
        }
        else
        {
            lv_obj_add_flag(s_root, LV_OBJ_FLAG_HIDDEN);
        }
    }
}

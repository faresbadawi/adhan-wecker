#include "azan_screen.h"
#include <ctype.h>
#include "theme.h"

namespace azan_screen
{
    using namespace theme;

    static lv_obj_t *s_root;
    static lv_obj_t *s_clock, *s_title, *s_arabic, *s_time, *s_caption;
    static lv_obj_t *s_bar, *s_progress, *s_mutedNote;
    static lv_obj_t *s_btnMute;

    static void show(lv_obj_t *o, bool on)
    {
        if (on)
            lv_obj_clear_flag(o, LV_OBJ_FLAG_HIDDEN);
        else
            lv_obj_add_flag(o, LV_OBJ_FLAG_HIDDEN);
    }

    static void clicked(lv_event_t *e)
    {
        auto cb = (Callback)lv_event_get_user_data(e);
        if (cb)
            cb();
    }

    static lv_obj_t *button(lv_obj_t *parent, const char *icon, const char *text, bool filled, Callback cb)
    {
        lv_obj_t *b = lv_btn_create(parent);
        lv_obj_remove_style_all(b);
        lv_obj_set_size(b, 200, 54);
        lv_obj_set_style_radius(b, 27, 0);
        lv_obj_set_style_border_color(b, gold(), 0);
        lv_obj_set_style_border_width(b, 1, 0);
        lv_obj_set_style_bg_color(b, gold(), 0);
        lv_obj_set_style_bg_opa(b, filled ? LV_OPA_COVER : LV_OPA_TRANSP, 0);
        lv_obj_set_style_bg_opa(b, filled ? LV_OPA_70 : LV_OPA_20, LV_STATE_PRESSED);
        lv_obj_set_style_opa(b, LV_OPA_40, LV_STATE_DISABLED);
        lv_obj_set_flex_flow(b, LV_FLEX_FLOW_ROW);
        lv_obj_set_flex_align(b, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER);
        lv_obj_set_style_pad_column(b, 8, 0);
        lv_obj_add_event_cb(b, clicked, LV_EVENT_CLICKED, (void *)cb);

        const lv_color_t fg = filled ? black() : gold();
        label(b, &font_icons_26, fg, icon);
        lv_obj_t *t = label(b, &font_josefin_18, fg, text);
        lv_obj_set_style_text_letter_space(t, 2, 0);
        return b;
    }

    void create(Callback onMute, Callback onSkip)
    {
        // Vollflächig, klickbar -> blockiert Wischen und Tippen auf die Bildschirme darunter
        s_root = lv_obj_create(lv_layer_top());
        lv_obj_remove_style_all(s_root);
        lv_obj_set_size(s_root, SCREEN_W, SCREEN_H);
        lv_obj_add_flag(s_root, LV_OBJ_FLAG_CLICKABLE);
        lv_obj_clear_flag(s_root, LV_OBJ_FLAG_SCROLLABLE);
        lv_obj_add_flag(s_root, LV_OBJ_FLAG_HIDDEN);

        lv_obj_t *bg = lv_img_create(s_root);
        lv_img_set_src(bg, &img_bg_pattern);

        s_clock = label(s_root, &font_josefin_18, muted(), "");
        lv_obj_align(s_clock, LV_ALIGN_TOP_RIGHT, -MARGIN, 14);

        lv_obj_t *mosque = label(s_root, &font_icons_60, gold(), ICON_MOSQUE);
        lv_obj_align(mosque, LV_ALIGN_TOP_MID, 0, 12);

        s_title = label(s_root, &font_marcellus_26, white(), "");
        lv_obj_set_style_text_letter_space(s_title, 3, 0);
        lv_obj_align(s_title, LV_ALIGN_TOP_MID, 0, 78);

        s_arabic = lv_img_create(s_root);
        lv_obj_align(s_arabic, LV_ALIGN_TOP_MID, 0, 112);

        s_time = label(s_root, &font_count_52, gold(), "");
        lv_obj_align(s_time, LV_ALIGN_TOP_MID, 0, 152);

        s_caption = label(s_root, &font_josefin_15, muted(), "GEBETSZEIT");
        lv_obj_set_style_text_letter_space(s_caption, 3, 0);
        lv_obj_align(s_caption, LV_ALIGN_TOP_MID, 0, 204);

        // Fortschritt
        s_bar = lv_bar_create(s_root);
        lv_obj_set_size(s_bar, 300, 3);
        lv_obj_align(s_bar, LV_ALIGN_TOP_MID, -26, 236);
        lv_obj_set_style_bg_color(s_bar, white(), LV_PART_MAIN);
        lv_obj_set_style_bg_opa(s_bar, LV_OPA_20, LV_PART_MAIN);
        lv_obj_set_style_bg_color(s_bar, gold(), LV_PART_INDICATOR);
        lv_obj_set_style_radius(s_bar, 2, LV_PART_MAIN);
        lv_obj_set_style_radius(s_bar, 2, LV_PART_INDICATOR);
        lv_bar_set_range(s_bar, 0, 1000);

        s_progress = label(s_root, &font_josefin_15, muted(), "");
        lv_obj_align_to(s_progress, s_bar, LV_ALIGN_OUT_RIGHT_MID, 12, 0);

        s_mutedNote = label(s_root, &font_josefin_15, muted(), "Stummgeschaltet");
        lv_obj_set_style_text_letter_space(s_mutedNote, 2, 0);
        lv_obj_align(s_mutedNote, LV_ALIGN_TOP_MID, 0, 228);
        lv_obj_add_flag(s_mutedNote, LV_OBJ_FLAG_HIDDEN);

        s_btnMute = button(s_root, ICON_VOLUME_OFF, "STUMM", false, onMute);
        lv_obj_align(s_btnMute, LV_ALIGN_BOTTOM_LEFT, 30, -14);
        lv_obj_t *skip = button(s_root, ICON_SKIP_NEXT, "ÜBERSPRINGEN", true, onSkip);
        lv_obj_align(skip, LV_ALIGN_BOTTOM_RIGHT, -30, -14);
    }

    static void fmtDuration(char *buf, size_t n, uint32_t s) { snprintf(buf, n, "%lu:%02lu", (unsigned long)(s / 60), (unsigned long)(s % 60)); }

    void update(const azan::Status &s, const struct tm &now)
    {
        static model::Prayer shownPrayer = model::PRAYER_COUNT;

        if (s.state == azan::State::IDLE)
        {
            show(s_root, false);
            shownPrayer = model::PRAYER_COUNT;
            return;
        }

        if (shownPrayer != s.prayer)
        {
            shownPrayer = s.prayer;
            char title[40];
            snprintf(title, sizeof(title), "JETZT IST %s", model::prayerName(s.prayer));
            for (char *c = title; *c; c++)
                *c = toupper((unsigned char)*c);
            lv_label_set_text(s_title, title);
            lv_img_set_src(s_arabic, arabicName(s.prayer, true));
            lv_label_set_text_fmt(s_time, "%02d:%02d", s.minutes / 60, s.minutes % 60);
            show(s_root, true);
        }

        lv_label_set_text_fmt(s_clock, "%02d:%02d", now.tm_hour, now.tm_min);

        const bool muted = s.state == azan::State::MUTED;
        if (muted)
            lv_obj_add_state(s_btnMute, LV_STATE_DISABLED);
        else
            lv_obj_clear_state(s_btnMute, LV_STATE_DISABLED);
        show(s_bar, !muted);
        show(s_progress, !muted);
        show(s_mutedNote, muted);
        if (muted)
            return;

        // Fortschritt; ohne bekannte Dauer nur die verstrichene Zeit
        char a[12], b[12], text[28];
        fmtDuration(a, sizeof(a), s.elapsed);
        if (s.duration > 0)
        {
            fmtDuration(b, sizeof(b), s.duration);
            snprintf(text, sizeof(text), "%s / %s", a, b);
            lv_bar_set_value(s_bar, min<uint32_t>(1000, s.elapsed * 1000 / s.duration), LV_ANIM_OFF);
        }
        else
        {
            snprintf(text, sizeof(text), "%s", a);
            lv_bar_set_value(s_bar, 0, LV_ANIM_OFF);
        }
        lv_label_set_text(s_progress, text);
    }

    bool visible() { return !lv_obj_has_flag(s_root, LV_OBJ_FLAG_HIDDEN); }
}

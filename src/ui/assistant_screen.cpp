#include "assistant_screen.h"
#include "theme.h"

extern "C"
{
    LV_IMG_DECLARE(img_mic_lg);
    LV_IMG_DECLARE(img_ar_txt_listening);
    LV_IMG_DECLARE(img_ar_txt_thinking);
    LV_IMG_DECLARE(img_ar_txt_assistant);
    LV_IMG_DECLARE(img_ar_txt_close);
}

namespace assistant_screen
{
    using namespace theme;
    using assistant::State;

    static constexpr lv_coord_t TEXT_W = 404;

    static lv_obj_t *s_root, *s_icon, *s_title, *s_question, *s_answer;
    static void (*s_onTap)() = nullptr;

    // Text für die Anzeige aufbereiten (LVGL hat nur eine vereinfachte Bidi-Logik und setzt keine Vokalzeichen):
    //  - arabische Vokalzeichen (U+064B..U+0652, U+0670) entfernen, sie erschienen sonst als eigene Zeichen
    //  - Uhrzeiten "HH:MM" als Links-nach-rechts-Block: LRM (U+200E, leere Glyphe) davor und U+2236 statt ":"
    //    (gleich gezeichnet, aber nicht "neutral"); sonst wird "17:36" im arabischen Satz zu "36:17"
    static String displayText(const String &in)
    {
        static const char LRM[] = "\xE2\x80\x8E";
        static const char RATIO[] = "\xE2\x88\xB6";
        String out;
        out.reserve(in.length() + 16);
        const char *p = in.c_str();
        while (*p)
        {
            const uint8_t c = *p;
            // zweibytige UTF-8-Folge im Bereich U+0640..U+067F: D9 xx
            if (c == 0xD9 && p[1])
            {
                const uint32_t cp = 0x640 + ((uint8_t)p[1] - 0x80);
                if ((cp >= 0x64B && cp <= 0x652) || cp == 0x670)
                {
                    p += 2;
                    continue;
                }
            }
            // Beginn einer Uhrzeit: Ziffern, dann ":" und eine Ziffer
            if (isdigit(c) && (p == in.c_str() || !isdigit((uint8_t)p[-1])))
            {
                const char *q = p;
                while (isdigit((uint8_t)*q))
                    q++;
                if (*q == ':' && isdigit((uint8_t)q[1]))
                    out += LRM;
            }
            if (c == ':' && p != in.c_str() && isdigit((uint8_t)p[-1]) && isdigit((uint8_t)p[1]))
            {
                out += RATIO;
                p++;
                continue;
            }
            out += (char)c;
            p++;
        }
        return out;
    }

    static lv_obj_t *textLabel(lv_obj_t *parent, const lv_font_t *font, Role role)
    {
        lv_obj_t *l = label(parent, font, role, "");
        lv_obj_set_width(l, TEXT_W);
        lv_label_set_long_mode(l, LV_LABEL_LONG_WRAP);
        lv_obj_set_style_text_align(l, LV_TEXT_ALIGN_CENTER, 0);
        lv_obj_set_style_text_line_space(l, 10, 0); // Platz für arabische Ober- und Unterlängen
        return l;
    }

    void create(void (*onTap)())
    {
        s_onTap = onTap;
        s_root = box(lv_layer_top());
        lv_obj_add_flag(s_root, LV_OBJ_FLAG_CLICKABLE);
        lv_obj_add_flag(s_root, LV_OBJ_FLAG_HIDDEN);
        lv_obj_set_size(s_root, SCREEN_W, SCREEN_H);
        lv_obj_add_event_cb(s_root, [](lv_event_t *) { if (s_onTap) s_onTap(); }, LV_EVENT_CLICKED, nullptr);
        background(s_root);

        lv_obj_t *card = box(s_root);
        lv_obj_set_size(card, 448, 292);
        lv_obj_center(card);
        lv_obj_set_style_radius(card, 14, 0);
        setRole(card, Role::ACCENT);
        lv_obj_set_style_bg_color(card, black(), 0);
        lv_obj_set_style_bg_opa(card, LV_OPA_80, 0);
        lv_obj_set_style_border_opa(card, LV_OPA_60, 0);
        lv_obj_set_style_border_width(card, 1, 0);

        s_icon = image(card, &img_mic_lg, Role::ACCENT);
        lv_obj_align(s_icon, LV_ALIGN_TOP_MID, 0, 14);
        s_title = image(card, &img_ar_txt_listening, Role::ACCENT);
        lv_obj_align(s_title, LV_ALIGN_TOP_MID, 0, 74);

        s_question = textLabel(card, &font_josefin_15, Role::MUTED);
        lv_obj_align(s_question, LV_ALIGN_TOP_MID, 0, 116);
        s_answer = textLabel(card, &font_josefin_18, Role::MAIN);
        lv_obj_align_to(s_answer, s_question, LV_ALIGN_OUT_BOTTOM_MID, 0, 10);

        lv_obj_align(image(card, &img_ar_txt_close, Role::MUTED), LV_ALIGN_BOTTOM_MID, 0, -8);
    }

    void update(const assistant::Status &s)
    {
        if (s.state == State::IDLE)
        {
            lv_obj_add_flag(s_root, LV_OBJ_FLAG_HIDDEN);
            return;
        }
        lv_obj_clear_flag(s_root, LV_OBJ_FLAG_HIDDEN);

        const bool listening = s.state == State::LISTENING;
        const bool thinking = s.state == State::THINKING && s.question.isEmpty();
        // Mikrofon nur beim Zuhören groß; sonst Titel nach oben
        if (listening)
            lv_obj_clear_flag(s_icon, LV_OBJ_FLAG_HIDDEN);
        else
            lv_obj_add_flag(s_icon, LV_OBJ_FLAG_HIDDEN);
        lv_img_set_src(s_title, listening ? &img_ar_txt_listening
                                          : (thinking || s.state == State::THINKING ? &img_ar_txt_thinking
                                                                                    : &img_ar_txt_assistant));
        lv_obj_align(s_title, LV_ALIGN_TOP_MID, 0, listening ? 74 : 14);

        lv_label_set_text(s_question, displayText(s.question).c_str());
        lv_obj_align(s_question, LV_ALIGN_TOP_MID, 0, listening ? 116 : 62);
        const bool error = s.state == State::ERROR;
        lv_label_set_text(s_answer, displayText(error ? s.error : s.answer).c_str());
        setRole(s_answer, error ? Role::ACCENT : Role::MAIN);
        lv_obj_align_to(s_answer, s_question, LV_ALIGN_OUT_BOTTOM_MID, 0, s.question.isEmpty() ? 0 : 12);
    }
}

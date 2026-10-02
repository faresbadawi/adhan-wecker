#include "theme.h"
#include <LittleFS.h>

namespace theme
{
    static lv_style_t s_style[3];
    static lv_color_t s_color[3] = {lv_color_hex(0xF4F1EA), lv_color_hex(0xC9A45C), lv_color_hex(0x8C978F)};

    static void applyStyle(Role r)
    {
        lv_style_t *st = &s_style[(int)r];
        const lv_color_t c = s_color[(int)r];
        lv_style_set_text_color(st, c);
        lv_style_set_img_recolor(st, c);
        lv_style_set_img_recolor_opa(st, LV_OPA_COVER);
        lv_style_set_line_color(st, c);
        lv_style_set_border_color(st, c);
        lv_style_set_bg_color(st, c);
    }

    void begin()
    {
        for (int i = 0; i < 3; i++)
        {
            lv_style_init(&s_style[i]);
            applyStyle((Role)i);
        }
    }

    void setPalette(uint32_t main, uint32_t accent, uint32_t muted)
    {
        const uint32_t hex[3] = {main, accent, muted};
        for (int i = 0; i < 3; i++)
        {
            s_color[i] = lv_color_hex(hex[i]);
            applyStyle((Role)i);
            lv_obj_report_style_change(&s_style[i]);
        }
    }

    void setRole(lv_obj_t *obj, Role role)
    {
        for (lv_style_t &st : s_style)
            lv_obj_remove_style(obj, &st, 0);
        lv_obj_add_style(obj, &s_style[(int)role], 0);
    }

    lv_obj_t *label(lv_obj_t *parent, const lv_font_t *font, Role role, const char *text)
    {
        lv_obj_t *l = lv_label_create(parent);
        lv_obj_set_style_text_font(l, font, 0);
        setRole(l, role);
        lv_label_set_text(l, text);
        return l;
    }

    lv_obj_t *image(lv_obj_t *parent, const lv_img_dsc_t *src, Role role)
    {
        lv_obj_t *i = lv_img_create(parent);
        if (src)
            lv_img_set_src(i, src);
        setRole(i, role);
        return i;
    }

    // ---------- Hintergrund aus dem LittleFS

    static lv_img_dsc_t s_bg;
    static uint8_t *s_bgData;
    static lv_obj_t *s_bgObjs[4];
    static int s_bgCount = 0;

    lv_obj_t *background(lv_obj_t *parent)
    {
        lv_obj_t *i = lv_img_create(parent);
        if (s_bgData)
            lv_img_set_src(i, &s_bg);
        if (s_bgCount < 4)
            s_bgObjs[s_bgCount++] = i;
        return i;
    }

    bool setBackground(const char *name)
    {
        constexpr size_t SIZE = SCREEN_W * SCREEN_H * 2; // RGB565
        char path[48];
        snprintf(path, sizeof(path), "/bg/%s.bin", name);
        File f = LittleFS.open(path, "r");
        if (!f || f.size() != SIZE)
        {
            Serial.printf("Hintergrund %s fehlt oder hat falsche Groesse\n", path);
            return false;
        }
        if (!s_bgData)
            s_bgData = (uint8_t *)heap_caps_malloc(SIZE, MALLOC_CAP_SPIRAM);
        if (!s_bgData)
            return false;
        f.read(s_bgData, SIZE);
        f.close();

        s_bg.header.cf = LV_IMG_CF_TRUE_COLOR;
        s_bg.header.w = SCREEN_W;
        s_bg.header.h = SCREEN_H;
        s_bg.data_size = SIZE;
        s_bg.data = s_bgData;
        lv_img_cache_invalidate_src(&s_bg);
        for (int i = 0; i < s_bgCount; i++)
        {
            lv_img_set_src(s_bgObjs[i], &s_bg);
            lv_obj_invalidate(s_bgObjs[i]);
        }
        return true;
    }

    lv_obj_t *box(lv_obj_t *parent)
    {
        lv_obj_t *o = lv_obj_create(parent);
        lv_obj_remove_style_all(o);
        lv_obj_clear_flag(o, LV_OBJ_FLAG_SCROLLABLE | LV_OBJ_FLAG_CLICKABLE);
        return o;
    }

    void divider(lv_obj_t *parent, lv_coord_t cx, lv_coord_t y, lv_coord_t halfWidth)
    {
        static const lv_point_t DIAMOND[] = {{0, 4}, {4, 0}, {8, 4}, {4, 8}, {0, 4}};
        // lv_line merkt sich nur den Zeiger, deshalb eigene Punkte pro Aufruf
        auto *left = new lv_point_t[2]{{(lv_coord_t)(cx - halfWidth), y}, {(lv_coord_t)(cx - 10), y}};
        auto *right = new lv_point_t[2]{{(lv_coord_t)(cx + 10), y}, {(lv_coord_t)(cx + halfWidth), y}};

        for (lv_point_t *pts : {left, right})
        {
            lv_obj_t *l = lv_line_create(parent);
            lv_line_set_points(l, pts, 2);
            setRole(l, Role::ACCENT);
            lv_obj_set_style_line_opa(l, LV_OPA_30, 0);
            lv_obj_set_style_line_width(l, 1, 0);
        }
        lv_obj_t *d = lv_line_create(parent);
        lv_line_set_points(d, DIAMOND, 5);
        lv_obj_set_pos(d, cx - 4, y - 4);
        setRole(d, Role::ACCENT);
        lv_obj_set_style_line_opa(d, LV_OPA_70, 0);
        lv_obj_set_style_line_width(d, 1, 0);
    }

    extern "C" const lv_img_dsc_t *const img_wx_sm_list[10];
    extern "C" const lv_img_dsc_t *const img_wx_lg_list[10];

    const lv_img_dsc_t *weatherIcon(model::Sky sky, bool isDay, bool large)
    {
        // Reihenfolge wie SKY_ICONS in tools/gen_assets.py: model::Sky, dann Nacht klar, Nacht teils bewölkt
        int idx = (int)sky;
        if (!isDay && sky == model::Sky::CLEAR)
            idx = 8;
        else if (!isDay && sky == model::Sky::PARTLY_CLOUDY)
            idx = 9;
        return (large ? img_wx_lg_list : img_wx_sm_list)[idx];
    }

    using lang::text;
    const lv_img_dsc_t *skyText(model::Sky sky) { return text(TXT_SKY_0 + (int)sky); }
    const lv_img_dsc_t *weekday(int wday) { return text(TXT_WDAY_0 + constrain(wday, 0, 6)); }
    const lv_img_dsc_t *hijriMonth(int month) { return text(TXT_HMONTH_0 + constrain(month, 1, 12) - 1); }
    const lv_img_dsc_t *hijriMonthSmall(int month) { return text(TXT_HMONTH_SM_0 + constrain(month, 1, 12) - 1); }
    const lv_img_dsc_t *weekdayShort(int wday) { return text(TXT_WSHORT_0 + constrain(wday, 0, 6)); }
    const lv_img_dsc_t *gregMonth(int month) { return text(TXT_GMONTH_0 + constrain(month, 1, 12) - 1); }

    const lv_img_dsc_t *prayerName(model::Prayer p, bool large)
    {
        const int i = p < model::PRAYER_COUNT ? p : 0;
        return text((large ? TXT_PRAYER_LG_0 : TXT_PRAYER_0) + i);
    }

    void alignStart(lv_obj_t *obj, lv_coord_t x, lv_coord_t y)
    {
        if (lang::rtl())
            lv_obj_align(obj, LV_ALIGN_TOP_RIGHT, -x, y);
        else
            lv_obj_align(obj, LV_ALIGN_TOP_LEFT, x, y);
    }
}

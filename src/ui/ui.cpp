#include "ui.h"
#include "calendar_screen.h"
#include "clock_screen.h"
#include "night_screen.h"
#include "prayer_screen.h"
#include "settings_screen.h"
#include "theme.h"
#include "weather_screen.h"

namespace ui
{
    using namespace theme;

    static lv_obj_t *s_tiles;
    static lv_obj_t *s_page[PAGE_COUNT];
    static lv_obj_t *s_dot[PAGE_COUNT];
    static Page s_shown[PAGE_COUNT]; // sichtbare Seiten in Reihenfolge
    static int s_shownCount = 0;

    static void updateDots()
    {
        lv_obj_t *active = lv_tileview_get_tile_act(s_tiles);
        for (int i = 0; i < PAGE_COUNT; i++)
        {
            const bool used = i < s_shownCount;
            if (!used)
            {
                lv_obj_add_flag(s_dot[i], LV_OBJ_FLAG_HIDDEN);
                continue;
            }
            lv_obj_clear_flag(s_dot[i], LV_OBJ_FLAG_HIDDEN);
            lv_obj_align(s_dot[i], LV_ALIGN_BOTTOM_MID, i * 14 - (s_shownCount - 1) * 7, -6);
            const bool on = s_page[s_shown[i]] == active;
            setRole(s_dot[i], on ? Role::ACCENT : Role::MUTED);
            lv_obj_set_style_bg_opa(s_dot[i], on ? LV_OPA_COVER : LV_OPA_50, 0);
        }
    }

    void begin(const char *city)
    {
        lv_obj_t *scr = lv_scr_act();
        lv_obj_clear_flag(scr, LV_OBJ_FLAG_SCROLLABLE);
        lv_obj_set_style_bg_color(scr, black(), 0);
        background(scr); // bleibt stehen, nur die Inhalte wischen darüber

        s_tiles = lv_tileview_create(scr);
        lv_obj_set_size(s_tiles, SCREEN_W, SCREEN_H);
        lv_obj_set_style_bg_opa(s_tiles, LV_OPA_TRANSP, 0);
        lv_obj_set_scrollbar_mode(s_tiles, LV_SCROLLBAR_MODE_OFF);
        for (int i = 0; i < PAGE_COUNT; i++)
        {
            s_page[i] = lv_tileview_add_tile(s_tiles, i, 0, LV_DIR_HOR);
            lv_obj_set_style_bg_opa(s_page[i], LV_OPA_TRANSP, 0);
            lv_obj_clear_flag(s_page[i], LV_OBJ_FLAG_SCROLLABLE);
        }
        lv_obj_add_event_cb(s_tiles, [](lv_event_t *) { updateDots(); }, LV_EVENT_VALUE_CHANGED, nullptr);

        // Seitenpunkte unten, auf der obersten Ebene (vor den Overlays erzeugt, liegen also darunter)
        for (int i = 0; i < PAGE_COUNT; i++)
        {
            s_dot[i] = box(lv_layer_top());
            lv_obj_set_size(s_dot[i], 6, 6);
            lv_obj_set_style_radius(s_dot[i], LV_RADIUS_CIRCLE, 0);
        }

        clock_screen::create(s_page[PAGE_CLOCK]);
        prayer_screen::create(s_page[PAGE_PRAYER], city);
        weather_screen::create(s_page[PAGE_WEATHER]);
        calendar_screen::create(s_page[PAGE_CALENDAR]);
        settings_screen::create(s_page[PAGE_SETTINGS]);
        night_screen::create(s_page[PAGE_NIGHT]);

        const uint8_t order[4] = {PAGE_CLOCK, PAGE_PRAYER, PAGE_WEATHER, PAGE_CALENDAR};
        const bool visible[4] = {true, true, true, true};
        setPages(order, visible, true);
        showPage(PAGE_PRAYER);
    }

    void setPages(const uint8_t order[4], const bool visible[4], bool night)
    {
        lv_obj_t *active = lv_tileview_get_tile_act(s_tiles);

        // sichtbare Seiten in der gewünschten Reihenfolge, Einstellungen immer zuletzt
        s_shownCount = 0;
        for (int i = 0; i < 4; i++)
        {
            if (order[i] >= 4 || !visible[order[i]])
                continue;
            if (order[i] == PAGE_PRAYER && night)
                s_shown[s_shownCount++] = PAGE_NIGHT;
            s_shown[s_shownCount++] = (Page)order[i];
        }
        s_shown[s_shownCount++] = PAGE_SETTINGS;

        // Ausgeblendete Seiten unterhalb ablegen: LVGL bestimmt die aktive Seite nach dem Wischen
        // anhand der Position und würde sonst eine unsichtbare Seite an gleicher Stelle wählen.
        for (int p = 0; p < PAGE_COUNT; p++)
        {
            lv_obj_add_flag(s_page[p], LV_OBJ_FLAG_HIDDEN);
            lv_obj_set_pos(s_page[p], 0, 2 * SCREEN_H);
        }
        for (int i = 0; i < s_shownCount; i++)
        {
            lv_obj_t *tile = s_page[s_shown[i]];
            lv_obj_clear_flag(tile, LV_OBJ_FLAG_HIDDEN);
            lv_obj_set_pos(tile, i * SCREEN_W, 0);
            // Wischrichtungen: am Rand nur nach innen
            lv_dir_t dir = LV_DIR_HOR;
            if (s_shownCount == 1)
                dir = LV_DIR_NONE;
            else if (i == 0)
                dir = LV_DIR_RIGHT;
            else if (i == s_shownCount - 1)
                dir = LV_DIR_LEFT;
            ((lv_tileview_tile_t *)tile)->dir = dir;
        }

        // aktive Seite behalten, wenn sie noch sichtbar ist, sonst Gebetszeiten bzw. die erste
        if (active && !lv_obj_has_flag(active, LV_OBJ_FLAG_HIDDEN))
            lv_obj_set_tile(s_tiles, active, LV_ANIM_OFF);
        else if (!lv_obj_has_flag(s_page[PAGE_PRAYER], LV_OBJ_FLAG_HIDDEN))
            lv_obj_set_tile(s_tiles, s_page[PAGE_PRAYER], LV_ANIM_OFF);
        else
            lv_obj_set_tile(s_tiles, s_page[s_shown[0]], LV_ANIM_OFF);
        updateDots();
    }

    void showPage(Page p)
    {
        if (lv_obj_has_flag(s_page[p], LV_OBJ_FLAG_HIDDEN))
            return;
        lv_obj_set_tile(s_tiles, s_page[p], LV_ANIM_OFF);
        updateDots();
    }

    uint8_t *snapshot(uint32_t &size, uint16_t &w, uint16_t &h)
    {
        // lv_snapshot erfasst nur den Bildschirm, nicht lv_layer_top (Overlays, Seitenpunkte):
        // deren Objekte werden dafür kurz auf den Bildschirm umgehängt.
        lv_obj_t *top = lv_layer_top(), *scr = lv_scr_act();
        lv_obj_t *moved[16];
        uint32_t n = 0;
        while (lv_obj_get_child_cnt(top) && n < 16)
        {
            moved[n] = lv_obj_get_child(top, 0);
            lv_obj_set_parent(moved[n++], scr);
        }
        size = lv_snapshot_buf_size_needed(scr, LV_IMG_CF_TRUE_COLOR);
        uint8_t *buf = (uint8_t *)ps_malloc(size);
        lv_img_dsc_t img;
        if (buf && lv_snapshot_take_to_buf(scr, LV_IMG_CF_TRUE_COLOR, &img, buf, size) == LV_RES_OK)
        {
            w = img.header.w;
            h = img.header.h;
        }
        else
        {
            free(buf);
            buf = nullptr;
        }
        for (uint32_t i = 0; i < n; i++)
            lv_obj_set_parent(moved[i], top);
        return buf;
    }
}

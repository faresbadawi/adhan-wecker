#include "splash.h"
#include "theme.h"
#include <LittleFS.h>
#include <esp_heap_caps.h>

extern "C"
{
    LV_IMG_DECLARE(img_moon_orn);
    LV_IMG_DECLARE(img_splash_name);
    LV_IMG_DECLARE(img_splash_latin);
}

namespace splash
{
    using namespace theme;

    // Widmung (Ihda): ein eigenes Vollbild /ihda.bin (480x320 RGB565, hohes Byte zuerst), das nur auf
    // dieser einen Uhr liegt. Es erscheint nach dem Startbild für einige Sekunden; Tippen blendet es aus.
    // Updates fassen die Datei nicht an.
    static void showDedication(uint32_t after)
    {
        constexpr size_t SIZE = SCREEN_W * SCREEN_H * 2;
        constexpr uint32_t HOLD_MS = 12000;
        File f = LittleFS.open(DEDICATION_PATH, "r");
        if (!f || f.size() != SIZE)
            return;
        uint8_t *buf = (uint8_t *)heap_caps_malloc(SIZE + sizeof(lv_img_dsc_t), MALLOC_CAP_SPIRAM);
        if (!buf)
            return;
        lv_img_dsc_t *dsc = (lv_img_dsc_t *)buf;
        uint8_t *px = buf + sizeof(lv_img_dsc_t);
        f.read(px, SIZE);
        f.close();
        memset(dsc, 0, sizeof(*dsc));
        dsc->header.cf = LV_IMG_CF_TRUE_COLOR;
        dsc->header.w = SCREEN_W;
        dsc->header.h = SCREEN_H;
        dsc->data_size = SIZE;
        dsc->data = px;

        lv_obj_t *img = lv_img_create(lv_layer_top());
        lv_img_set_src(img, dsc);
        lv_obj_set_pos(img, 0, 0);
        lv_obj_add_flag(img, LV_OBJ_FLAG_CLICKABLE);
        lv_obj_add_event_cb(img, [](lv_event_t *e) { lv_obj_del_async(lv_event_get_target(e)); }, LV_EVENT_CLICKED, nullptr);
        lv_obj_add_event_cb(img, [](lv_event_t *e) { heap_caps_free(lv_event_get_user_data(e)); }, LV_EVENT_DELETE, buf);
        lv_obj_fade_out(img, 800, after + HOLD_MS);
        lv_obj_del_delayed(img, after + HOLD_MS + 900);
    }

    void show(uint32_t ms)
    {
        showDedication(ms); // liegt unter dem Startbild und wird sichtbar, wenn es ausblendet
        lv_obj_t *root = box(lv_layer_top());
        lv_obj_set_size(root, SCREEN_W, SCREEN_H);
        lv_obj_add_flag(root, LV_OBJ_FLAG_CLICKABLE); // Berührungen gehen nicht an die Seiten darunter
        background(root);

        // Achtstern-Ornament hinter dem Namen, leicht gedämpft
        lv_obj_t *orn = image(root, &img_moon_orn, Role::ACCENT);
        lv_obj_set_style_img_opa(orn, LV_OPA_50, 0);
        lv_obj_align(orn, LV_ALIGN_TOP_MID, 0, 18);

        lv_obj_t *name = image(root, &img_splash_name, Role::MAIN);
        lv_obj_align_to(name, orn, LV_ALIGN_CENTER, 0, 4);

        lv_obj_t *latin = image(root, &img_splash_latin, Role::ACCENT);
        lv_obj_align(latin, LV_ALIGN_TOP_MID, 0, 232);

        lv_obj_t *sub = image(root, lang::text(TXT_SPLASH_SUB), Role::MUTED);
        lv_obj_align(sub, LV_ALIGN_TOP_MID, 0, 270);

        lv_obj_fade_in(name, 700, 0);
        lv_obj_fade_out(root, 600, ms);
        lv_obj_del_delayed(root, ms + 700);
    }
}

#include "splash.h"
#include "theme.h"

extern "C"
{
    LV_IMG_DECLARE(img_moon_orn);
    LV_IMG_DECLARE(img_splash_name);
    LV_IMG_DECLARE(img_splash_latin);
}

namespace splash
{
    using namespace theme;

    void show(uint32_t ms)
    {
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

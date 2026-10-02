#include "ui.h"
#include "home_screen.h"
#include "theme.h"
#include "weather_screen.h"

namespace ui
{
    using namespace theme;

    static lv_obj_t *s_tiles;
    static lv_obj_t *s_page[2];
    static lv_obj_t *s_dot[2];
    static lv_obj_t *s_wifiIcon, *s_wifiPopup, *s_wifiText;
    static const char *s_apName = "";
    static model::WifiInfo s_wifi;

    static void updateDots()
    {
        lv_obj_t *active = lv_tileview_get_tile_act(s_tiles);
        for (int i = 0; i < 2; i++)
        {
            const bool on = s_page[i] == active;
            lv_obj_set_style_bg_color(s_dot[i], on ? gold() : muted(), 0);
            lv_obj_set_style_bg_opa(s_dot[i], on ? LV_OPA_COVER : LV_OPA_40, 0);
        }
    }

    static lv_obj_t *transparentTile(lv_obj_t *tv, uint8_t col, lv_dir_t dir)
    {
        lv_obj_t *t = lv_tileview_add_tile(tv, col, 0, dir);
        lv_obj_set_style_bg_opa(t, LV_OPA_TRANSP, 0);
        lv_obj_clear_flag(t, LV_OBJ_FLAG_SCROLLABLE);
        return t;
    }

    // ---------- WLAN-Symbol mit Info beim Antippen

    static void refreshWifiText()
    {
        if (s_wifi.connected)
            lv_label_set_text_fmt(s_wifiText, "WLAN verbunden\n%s", s_wifi.ssid);
        else if (s_wifi.portalActive)
            lv_label_set_text_fmt(s_wifiText,
                                  "WLAN einrichten\n"
                                  "1. Handy mit dem WLAN \"%s\" verbinden\n"
                                  "2. Im Browser 192.168.4.1 öffnen\n"
                                  "3. Heimnetz wählen, Passwort eingeben",
                                  s_apName);
        else
            lv_label_set_text(s_wifiText, "Keine WLAN-Verbindung\nVerbinde ...");
    }

    static void toggleWifiPopup(lv_event_t *)
    {
        if (lv_obj_has_flag(s_wifiPopup, LV_OBJ_FLAG_HIDDEN))
        {
            refreshWifiText();
            lv_obj_clear_flag(s_wifiPopup, LV_OBJ_FLAG_HIDDEN);
        }
        else
        {
            lv_obj_add_flag(s_wifiPopup, LV_OBJ_FLAG_HIDDEN);
        }
    }

    static void createWifi(lv_obj_t *layer)
    {
        // große Trefferfläche in der Ecke
        lv_obj_t *hit = box(layer);
        lv_obj_add_flag(hit, LV_OBJ_FLAG_CLICKABLE);
        lv_obj_set_size(hit, 48, 44);
        lv_obj_align(hit, LV_ALIGN_TOP_RIGHT, 0, 0);
        lv_obj_add_event_cb(hit, toggleWifiPopup, LV_EVENT_CLICKED, nullptr);

        s_wifiIcon = label(hit, &font_icons_20, muted(), ICON_WIFI_OFF);
        lv_obj_align(s_wifiIcon, LV_ALIGN_TOP_RIGHT, -MARGIN + 8, 10);

        s_wifiPopup = box(layer);
        lv_obj_add_flag(s_wifiPopup, LV_OBJ_FLAG_CLICKABLE);
        lv_obj_add_flag(s_wifiPopup, LV_OBJ_FLAG_HIDDEN);
        lv_obj_set_size(s_wifiPopup, 330, LV_SIZE_CONTENT);
        lv_obj_align(s_wifiPopup, LV_ALIGN_TOP_RIGHT, -12, 40);
        lv_obj_set_style_bg_color(s_wifiPopup, black(), 0);
        lv_obj_set_style_bg_opa(s_wifiPopup, LV_OPA_90, 0);
        lv_obj_set_style_radius(s_wifiPopup, 12, 0);
        lv_obj_set_style_border_color(s_wifiPopup, gold(), 0);
        lv_obj_set_style_border_opa(s_wifiPopup, LV_OPA_50, 0);
        lv_obj_set_style_border_width(s_wifiPopup, 1, 0);
        lv_obj_set_style_pad_all(s_wifiPopup, 16, 0);
        lv_obj_add_event_cb(s_wifiPopup, toggleWifiPopup, LV_EVENT_CLICKED, nullptr);

        s_wifiText = label(s_wifiPopup, &font_josefin_15, white(), "");
        lv_obj_set_width(s_wifiText, LV_PCT(100));
        lv_obj_set_style_text_line_space(s_wifiText, 6, 0);
    }

    // ---------- Aufbau

    void begin(const char *location, const char *apName, azan_screen::Callback onMute, azan_screen::Callback onSkip)
    {
        s_apName = apName;
        lv_obj_t *scr = lv_scr_act();
        lv_obj_clear_flag(scr, LV_OBJ_FLAG_SCROLLABLE);
        lv_obj_set_style_bg_color(scr, black(), 0);

        // Hintergrund bleibt stehen, nur die Inhalte wischen darüber
        lv_obj_t *bg = lv_img_create(scr);
        lv_img_set_src(bg, &img_bg_pattern);

        s_tiles = lv_tileview_create(scr);
        lv_obj_set_size(s_tiles, SCREEN_W, SCREEN_H);
        lv_obj_set_style_bg_opa(s_tiles, LV_OPA_TRANSP, 0);
        lv_obj_set_scrollbar_mode(s_tiles, LV_SCROLLBAR_MODE_OFF);
        s_page[PAGE_HOME] = transparentTile(s_tiles, 0, LV_DIR_RIGHT);
        s_page[PAGE_WEATHER] = transparentTile(s_tiles, 1, LV_DIR_LEFT);
        lv_obj_add_event_cb(s_tiles, [](lv_event_t *) { updateDots(); }, LV_EVENT_VALUE_CHANGED, nullptr);

        home::create(s_page[PAGE_HOME]);
        weather_screen::create(s_page[PAGE_WEATHER], location);

        // Oberste Ebene: Seitenpunkte, WLAN, darüber das Azan-Overlay
        lv_obj_t *layer = lv_layer_top();
        for (int i = 0; i < 2; i++)
        {
            s_dot[i] = box(layer);
            lv_obj_set_size(s_dot[i], 6, 6);
            lv_obj_set_style_radius(s_dot[i], LV_RADIUS_CIRCLE, 0);
            lv_obj_align(s_dot[i], LV_ALIGN_BOTTOM_MID, i == 0 ? -7 : 7, -6);
        }
        updateDots();
        createWifi(layer);
        azan_screen::create(onMute, onSkip);
    }

    void showPage(Page p)
    {
        lv_obj_set_tile(s_tiles, s_page[p], LV_ANIM_OFF);
        updateDots();
    }

    void setWifi(const model::WifiInfo &w)
    {
        const bool portalOpened = w.portalActive && !s_wifi.portalActive;
        s_wifi = w;

        static const char *BARS[] = {ICON_WIFI_1, ICON_WIFI_1, ICON_WIFI_2, ICON_WIFI_3, ICON_WIFI_4};
        lv_label_set_text(s_wifiIcon, w.connected ? BARS[w.bars] : ICON_WIFI_OFF);
        lv_obj_set_style_text_color(s_wifiIcon, w.connected ? white() : muted(), 0);

        // Einrichtung nötig: Hinweis einmal von selbst zeigen
        if (portalOpened && lv_obj_has_flag(s_wifiPopup, LV_OBJ_FLAG_HIDDEN))
            toggleWifiPopup(nullptr);
        else if (!lv_obj_has_flag(s_wifiPopup, LV_OBJ_FLAG_HIDDEN))
            refreshWifiText();
    }
}

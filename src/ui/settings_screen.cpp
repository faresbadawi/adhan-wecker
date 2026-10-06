#include "settings_screen.h"
#include "theme.h"

extern "C"
{
    extern const lv_img_dsc_t *const img_wifi_list[2];
}

namespace settings_screen
{
    using namespace theme;

    static constexpr lv_coord_t QR_SIZE = 140;
    static constexpr lv_coord_t COL_X = 250; // rechte Spalte (Netzwerk)

    static lv_obj_t *s_wifiIcon, *s_ssid, *s_signal, *s_offline;
    static int s_shownSignal = -1;
    static lv_obj_t *s_qr, *s_url, *s_scan;
    static char s_shownUrl[40] = "-";

    // Kleine Karte mit Rahmen in der Akzentfarbe
    static lv_obj_t *card(lv_obj_t *parent, lv_coord_t x, lv_coord_t w)
    {
        lv_obj_t *c = box(parent);
        lv_obj_set_pos(c, x, 60);
        lv_obj_set_size(c, w, 236);
        lv_obj_set_style_radius(c, 12, 0);
        setRole(c, Role::ACCENT);
        lv_obj_set_style_bg_color(c, black(), 0);
        lv_obj_set_style_bg_opa(c, LV_OPA_60, 0);
        lv_obj_set_style_border_opa(c, LV_OPA_70, 0);
        lv_obj_set_style_border_width(c, 2, 0);
        return c;
    }

    void create(lv_obj_t *parent)
    {
        lv_obj_align(image(parent, lang::text(TXT_SETTINGS), Role::ACCENT), LV_ALIGN_TOP_MID, 0, 8);

        // Rechts: Netzwerk
        lv_obj_t *net = card(parent, COL_X, SCREEN_W - MARGIN - COL_X);
        alignStart(image(net, lang::text(TXT_NETWORK), Role::MUTED), 14, 10);
        s_wifiIcon = image(net, img_wifi_list[0], Role::ACCENT);
        alignStart(s_wifiIcon, 14, 50);
        s_ssid = label(net, &font_josefin_20, Role::MAIN, "");
        lv_label_set_long_mode(s_ssid, LV_LABEL_LONG_DOT);
        lv_obj_set_width(s_ssid, 146);
        lv_obj_set_style_text_align(s_ssid, lang::rtl() ? LV_TEXT_ALIGN_RIGHT : LV_TEXT_ALIGN_LEFT, 0);
        alignStart(s_ssid, 46, 52);
        s_signal = image(net, lang::text(TXT_SIG_STRONG), Role::MUTED);
        alignStart(s_signal, 46, 82);
        s_offline = image(net, lang::text(TXT_OFFLINE), Role::MAIN);
        alignStart(s_offline, 46, 48);

        alignStart(image(net, lang::text(TXT_WEB), Role::MUTED), 14, 128);
        s_url = label(net, &font_josefin_20, Role::MAIN, "");
        alignStart(s_url, 14, 160);
        lv_obj_t *host = label(net, &font_josefin_17, Role::MUTED, "azan-clock.local");
        alignStart(host, 14, 188);

        // Links: QR-Code zur Weboberfläche
        lv_obj_t *qrCard = card(parent, MARGIN, COL_X - MARGIN - 12);
        s_qr = lv_qrcode_create(qrCard, QR_SIZE, lv_color_black(), lv_color_white());
        lv_obj_set_style_border_color(s_qr, lv_color_white(), 0);
        lv_obj_set_style_border_width(s_qr, 6, 0); // heller Rand, damit Kameras den Code finden
        lv_obj_align(s_qr, LV_ALIGN_TOP_MID, 0, 18);
        s_scan = image(qrCard, lang::text(TXT_SCAN), Role::MUTED);
        lv_obj_align(s_scan, LV_ALIGN_BOTTOM_MID, 0, -14);
    }

    void setWifi(const model::WifiInfo &w, const char *url)
    {
        const bool online = w.connected;
        lv_img_set_src(s_wifiIcon, img_wifi_list[online ? 1 : 0]);
        setRole(s_wifiIcon, online ? Role::ACCENT : Role::MUTED);

        if (online)
        {
            lv_label_set_text(s_ssid, w.ssid);
            const int signal = w.bars >= 3 ? TXT_SIG_STRONG : w.bars == 2 ? TXT_SIG_MEDIUM : TXT_SIG_WEAK;
            if (signal != s_shownSignal)
            {
                s_shownSignal = signal;
                lv_img_set_src(s_signal, lang::text(signal));
                alignStart(s_signal, 46, 82);
            }
            lv_obj_clear_flag(s_ssid, LV_OBJ_FLAG_HIDDEN);
            lv_obj_clear_flag(s_signal, LV_OBJ_FLAG_HIDDEN);
            lv_obj_add_flag(s_offline, LV_OBJ_FLAG_HIDDEN);
        }
        else
        {
            lv_obj_add_flag(s_ssid, LV_OBJ_FLAG_HIDDEN);
            lv_obj_add_flag(s_signal, LV_OBJ_FLAG_HIDDEN);
            lv_obj_clear_flag(s_offline, LV_OBJ_FLAG_HIDDEN);
        }

        // QR-Code nur bei geänderter Adresse neu erzeugen
        if (strcmp(s_shownUrl, url) != 0)
        {
            strlcpy(s_shownUrl, url, sizeof(s_shownUrl));
            const bool haveUrl = url[0] != 0;
            if (haveUrl)
                lv_qrcode_update(s_qr, url, strlen(url));
            lv_label_set_text(s_url, haveUrl ? url : "-");
            if (haveUrl)
            {
                lv_obj_clear_flag(s_qr, LV_OBJ_FLAG_HIDDEN);
                lv_obj_clear_flag(s_scan, LV_OBJ_FLAG_HIDDEN);
            }
            else
            {
                lv_obj_add_flag(s_qr, LV_OBJ_FLAG_HIDDEN);
                lv_obj_add_flag(s_scan, LV_OBJ_FLAG_HIDDEN);
            }
        }
    }
}

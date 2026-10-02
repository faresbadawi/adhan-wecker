#include "prayer_screen.h"
#include "theme.h"
#include "ui.h"

extern "C"
{
    LV_IMG_DECLARE(img_ar_txt_title);
    LV_IMG_DECLARE(img_ar_txt_next);
    LV_IMG_DECLARE(img_ar_txt_loading);
    LV_IMG_DECLARE(img_ar_txt_wifi_title);
    LV_IMG_DECLARE(img_ar_txt_wifi_1);
    LV_IMG_DECLARE(img_ar_txt_wifi_2);
    LV_IMG_DECLARE(img_ar_txt_wifi_3);
    LV_IMG_DECLARE(img_ar_txt_azan_now);
    LV_IMG_DECLARE(img_ar_txt_azan_stop);
    extern const lv_img_dsc_t *const img_wifi_list[5];
    LV_IMG_DECLARE(img_alarm);
}

namespace prayer_screen
{
    using namespace theme;

    static constexpr int CELLS = sizeof(model::DAILY_PRAYERS) / sizeof(model::DAILY_PRAYERS[0]);
    static constexpr lv_coord_t CELL_W = 86, CELL_H = 64, ROW_Y = 238;

    static lv_obj_t *s_clock, *s_date;
    static lv_obj_t *s_content, *s_loading;
    static lv_obj_t *s_nextName, *s_countdown;
    static lv_obj_t *s_cell[CELLS], *s_cellTime[CELLS], *s_cellName[CELLS];
    static lv_obj_t *s_wifi;
    static lv_obj_t *s_azan, *s_azanName;
    static void (*s_onAzanTap)() = nullptr;
    static lv_obj_t *s_wxIcon, *s_wxTemp, *s_city;
    static lv_obj_t *s_wifiIcon;
    static lv_obj_t *s_alarmRow, *s_alarmTime;
    static void createWifiOverlay(lv_obj_t *scr)
    {
        s_wifi = box(scr);
        lv_obj_set_size(s_wifi, SCREEN_W, SCREEN_H);
        lv_obj_set_style_bg_color(s_wifi, black(), 0);
        lv_obj_set_style_bg_opa(s_wifi, LV_OPA_COVER, 0);
        lv_obj_add_flag(s_wifi, LV_OBJ_FLAG_HIDDEN);

        lv_obj_t *card = box(s_wifi);
        lv_obj_set_size(card, 400, 230);
        lv_obj_center(card);
        lv_obj_set_style_radius(card, 14, 0);
        setRole(card, Role::ACCENT);
        lv_obj_set_style_bg_color(card, black(), 0);
        lv_obj_set_style_border_opa(card, LV_OPA_60, 0);
        lv_obj_set_style_border_width(card, 1, 0);

        lv_obj_align(image(card, &img_ar_txt_wifi_title, Role::ACCENT), LV_ALIGN_TOP_MID, 0, 16);
        divider(card, 200, 66, 150);
        // rechtsbündig, wie arabischer Text
        lv_obj_align(image(card, &img_ar_txt_wifi_1, Role::MAIN), LV_ALIGN_TOP_RIGHT, -24, 86);
        lv_obj_t *step2 = image(card, &img_ar_txt_wifi_2, Role::MAIN);
        lv_obj_align(step2, LV_ALIGN_TOP_RIGHT, -24, 128);
        // IP in lateinischer Schrift, sonst setzt Amiri arabische Trennzeichen
        lv_obj_t *ip = label(card, &font_josefin_18, Role::MAIN, "192.168.4.1");
        lv_obj_align_to(ip, step2, LV_ALIGN_OUT_LEFT_MID, -8, 2);
        lv_obj_align(image(card, &img_ar_txt_wifi_3, Role::MAIN), LV_ALIGN_TOP_RIGHT, -24, 170);
    }

    // Vollflächig und klickbar: ein Tippen irgendwo beendet den Azan
    static void createAzanOverlay(lv_obj_t *scr)
    {
        s_azan = box(scr);
        lv_obj_add_flag(s_azan, LV_OBJ_FLAG_CLICKABLE);
        lv_obj_add_flag(s_azan, LV_OBJ_FLAG_HIDDEN);
        lv_obj_set_size(s_azan, SCREEN_W, SCREEN_H);
        lv_obj_add_event_cb(s_azan, [](lv_event_t *) { if (s_onAzanTap) s_onAzanTap(); }, LV_EVENT_CLICKED, nullptr);
        background(s_azan);

        lv_obj_t *card = box(s_azan);
        lv_obj_set_size(card, 380, 220);
        lv_obj_center(card);
        lv_obj_set_style_radius(card, 14, 0);
        setRole(card, Role::ACCENT);
        lv_obj_set_style_bg_color(card, black(), 0);
        lv_obj_set_style_bg_opa(card, LV_OPA_70, 0);
        lv_obj_set_style_border_opa(card, LV_OPA_70, 0);
        lv_obj_set_style_border_width(card, 1, 0);

        lv_obj_align(image(card, &img_ar_txt_azan_now, Role::MAIN), LV_ALIGN_TOP_MID, 0, 26);
        s_azanName = image(card, nullptr, Role::ACCENT);
        lv_obj_align(s_azanName, LV_ALIGN_TOP_MID, 0, 72);
        divider(card, 190, 140, 140);
        lv_obj_align(image(card, &img_ar_txt_azan_stop, Role::MUTED), LV_ALIGN_TOP_MID, 0, 160);
    }

    void create(lv_obj_t *scr, const char *city)
    {

        // Oben links: Uhr und Datum
        s_clock = label(scr, &font_clock_64, Role::MAIN, "--:--");
        lv_obj_set_pos(s_clock, MARGIN, 14);
        s_date = label(scr, &font_josefin_15, Role::MUTED, "");
        lv_obj_set_pos(s_date, MARGIN + 2, 80);

        // WLAN-Symbol oben neben der Uhr; Antippen führt zur Einstellungsseite (QR-Code, Netzwerk)
        lv_obj_t *hit = box(scr);
        lv_obj_add_flag(hit, LV_OBJ_FLAG_CLICKABLE);
        lv_obj_set_pos(hit, 196, 14);
        lv_obj_set_size(hit, 44, 40);
        lv_obj_add_event_cb(hit, [](lv_event_t *) { ui::showPage(ui::PAGE_SETTINGS); }, LV_EVENT_CLICKED, nullptr);
        s_wifiIcon = image(hit, img_wifi_list[0], Role::MUTED);
        lv_obj_align(s_wifiIcon, LV_ALIGN_TOP_LEFT, 4, 8);

        // Nächster Wecker (nur sichtbar, wenn einer aktiv ist)
        s_alarmRow = box(scr);
        lv_obj_set_size(s_alarmRow, LV_SIZE_CONTENT, LV_SIZE_CONTENT);
        lv_obj_set_flex_flow(s_alarmRow, LV_FLEX_FLOW_ROW);
        lv_obj_set_flex_align(s_alarmRow, LV_FLEX_ALIGN_START, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER);
        lv_obj_set_style_pad_column(s_alarmRow, 4, 0);
        lv_obj_set_pos(s_alarmRow, 196 + 8, 50);
        image(s_alarmRow, &img_alarm, Role::ACCENT);
        s_alarmTime = label(s_alarmRow, &font_josefin_15, Role::MUTED, "");
        lv_obj_add_flag(s_alarmRow, LV_OBJ_FLAG_HIDDEN);

        // Oben rechts: Titel und Stadt
        lv_obj_t *title = image(scr, &img_ar_txt_title, Role::ACCENT);
        lv_obj_align(title, LV_ALIGN_TOP_RIGHT, -MARGIN, 20);

        // Oben rechts unter dem Titel: Wetter klein (Symbol + Temperatur + Stadt)
        lv_obj_t *wx = box(scr);
        lv_obj_set_size(wx, LV_SIZE_CONTENT, LV_SIZE_CONTENT);
        lv_obj_set_flex_flow(wx, LV_FLEX_FLOW_ROW);
        lv_obj_set_flex_align(wx, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER);
        lv_obj_set_style_pad_column(wx, 8, 0);
        lv_obj_align(wx, LV_ALIGN_TOP_RIGHT, -MARGIN, 58);
        s_city = label(wx, &font_josefin_15, Role::MUTED, city);
        lv_obj_set_style_pad_right(s_city, 6, 0);
        s_wxTemp = label(wx, &font_temp_30, Role::MAIN, "");
        s_wxIcon = image(wx, nullptr, Role::ACCENT);

        divider(scr, SCREEN_W / 2, 108, SCREEN_W / 2 - MARGIN);

        s_loading = image(scr, &img_ar_txt_loading, Role::MUTED);
        lv_obj_align(s_loading, LV_ALIGN_TOP_MID, 0, 170);

        // Inhalt, erst sichtbar wenn Zeiten vorliegen
        s_content = box(scr);
        lv_obj_set_size(s_content, SCREEN_W, SCREEN_H);
        lv_obj_add_flag(s_content, LV_OBJ_FLAG_HIDDEN);

        lv_obj_align(image(s_content, &img_ar_txt_next, Role::MUTED), LV_ALIGN_TOP_MID, 0, 118);
        s_nextName = image(s_content, nullptr, Role::ACCENT);
        lv_obj_align(s_nextName, LV_ALIGN_TOP_MID, 0, 138);
        s_countdown = label(s_content, &font_count_52, Role::MAIN, "--:--:--");
        lv_obj_align(s_countdown, LV_ALIGN_TOP_MID, 0, 180);

        // Fünf Gebete von rechts nach links: الفجر ganz rechts
        const lv_coord_t x0 = (SCREEN_W - CELLS * CELL_W) / 2;
        for (int i = 0; i < CELLS; i++)
        {
            const model::Prayer p = model::DAILY_PRAYERS[i];
            lv_obj_t *c = box(s_content);
            lv_obj_set_pos(c, x0 + (CELLS - 1 - i) * CELL_W + 3, ROW_Y);
            lv_obj_set_size(c, CELL_W - 6, CELL_H);
            lv_obj_set_style_radius(c, 10, 0);
            setRole(c, Role::ACCENT); // Rahmen und Hinterlegung
            lv_obj_set_style_border_opa(c, LV_OPA_70, 0);
            s_cell[i] = c;

            s_cellName[i] = image(c, arabicName(p, false), Role::ACCENT);
            lv_obj_align(s_cellName[i], LV_ALIGN_TOP_MID, 0, 6);
            s_cellTime[i] = label(c, &font_josefin_22, Role::MAIN, "--:--");
            lv_obj_align(s_cellTime[i], LV_ALIGN_TOP_MID, 0, 32);
        }

        // Overlays über allen Seiten
        createWifiOverlay(lv_layer_top());
        createAzanOverlay(lv_layer_top()); // ganz oben
    }

    void setClock(const struct tm &t)
    {
        static int lastMin = -1, lastDay = -1;
        if (t.tm_min != lastMin)
        {
            lastMin = t.tm_min;
            lv_label_set_text_fmt(s_clock, "%02d:%02d", t.tm_hour, t.tm_min);
        }
        if (t.tm_mday != lastDay)
        {
            lastDay = t.tm_mday;
            lv_label_set_text_fmt(s_date, "%02d.%02d.%04d", t.tm_mday, t.tm_mon + 1, t.tm_year + 1900);
        }
    }

    void setPrayers(const model::PrayerDay &day)
    {
        if (!day.valid)
        {
            lv_obj_add_flag(s_content, LV_OBJ_FLAG_HIDDEN);
            lv_obj_clear_flag(s_loading, LV_OBJ_FLAG_HIDDEN);
            return;
        }
        for (int i = 0; i < CELLS; i++)
        {
            const uint16_t m = day.minutes[model::DAILY_PRAYERS[i]];
            lv_label_set_text_fmt(s_cellTime[i], "%02d:%02d", m / 60, m % 60);
        }
        lv_obj_add_flag(s_loading, LV_OBJ_FLAG_HIDDEN);
        lv_obj_clear_flag(s_content, LV_OBJ_FLAG_HIDDEN);
    }

    void setNext(model::Prayer p, int32_t secondsLeft)
    {
        static int last = -1;
        if (p != last)
        {
            last = p;
            lv_img_set_src(s_nextName, arabicName(p, true));
            lv_obj_align(s_nextName, LV_ALIGN_TOP_MID, 0, 138);
            for (int i = 0; i < CELLS; i++)
            {
                const bool on = model::DAILY_PRAYERS[i] == p;
                lv_obj_set_style_border_width(s_cell[i], on ? 1 : 0, 0);
                lv_obj_set_style_bg_opa(s_cell[i], on ? LV_OPA_10 : LV_OPA_TRANSP, 0);
                setRole(s_cellTime[i], on ? Role::ACCENT : Role::MAIN);
            }
        }
        if (secondsLeft < 0)
            secondsLeft = 0;
        lv_label_set_text_fmt(s_countdown, "%02ld:%02ld:%02ld", (long)(secondsLeft / 3600),
                              (long)(secondsLeft / 60 % 60), (long)(secondsLeft % 60));
    }

    void showWifiSetup(bool show)
    {
        if (show)
            lv_obj_clear_flag(s_wifi, LV_OBJ_FLAG_HIDDEN);
        else
            lv_obj_add_flag(s_wifi, LV_OBJ_FLAG_HIDDEN);
    }

    void setAzanCallback(void (*onTap)()) { s_onAzanTap = onTap; }

    void showAzan(bool show, model::Prayer p)
    {
        if (show)
        {
            lv_img_set_src(s_azanName, arabicName(p, true));
            lv_obj_align(s_azanName, LV_ALIGN_TOP_MID, 0, 72);
            lv_obj_clear_flag(s_azan, LV_OBJ_FLAG_HIDDEN);
        }
        else
        {
            lv_obj_add_flag(s_azan, LV_OBJ_FLAG_HIDDEN);
        }
    }

    void setWeather(const model::Weather &w)
    {
        if (!w.valid)
            return;
        lv_img_set_src(s_wxIcon, weatherIcon(w.sky, w.isDay, false));
        lv_label_set_text_fmt(s_wxTemp, "%d°C", (int)lroundf(w.temp));
    }

    void setCity(const char *city) { lv_label_set_text(s_city, city); }

    void setWifi(const model::WifiInfo &w)
    {
        lv_img_set_src(s_wifiIcon, img_wifi_list[w.connected ? constrain(w.bars, 1, 4) : 0]);
        setRole(s_wifiIcon, w.connected ? Role::MUTED : Role::ACCENT); // ohne Verbindung auffälliger
    }


    void setAlarm(int minutes)
    {
        if (minutes < 0)
        {
            lv_obj_add_flag(s_alarmRow, LV_OBJ_FLAG_HIDDEN);
            return;
        }
        lv_label_set_text_fmt(s_alarmTime, "%02d:%02d", minutes / 60, minutes % 60);
        lv_obj_clear_flag(s_alarmRow, LV_OBJ_FLAG_HIDDEN);
    }

}

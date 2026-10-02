// Hauptseite: Uhrzeit, Wetter klein, nächstes Gebet mit Countdown und die fünf Gebetszeiten, auf Arabisch.
#pragma once
#include <lvgl.h>
#include <time.h>
#include "model.h"

namespace prayer_screen
{
    void create(lv_obj_t *parent, const char *city);

    void setClock(const struct tm &t);
    void setPrayers(const model::PrayerDay &day); // ungültig -> "Lade Zeiten"
    void setNext(model::Prayer p, int32_t secondsLeft);
    void setWeather(const model::Weather &w);
    void setCity(const char *city);

    // WLAN-Symbol mit Signalstärke (Antippen öffnet die Einstellungsseite)
    void setWifi(const model::WifiInfo &w);

    // Nächster Wecker (Minuten seit Mitternacht), -1 = keiner aktiv
    void setAlarm(int minutes);

    // Hinweis zur WLAN-Einrichtung (Zugangspunkt offen)
    void showWifiSetup(bool show);

    // Azan-Anzeige; Tippen irgendwo auf den Bildschirm ruft onTap auf (Azan beenden).
    void setAzanCallback(void (*onTap)());
    void showAzan(bool show, model::Prayer p);
}

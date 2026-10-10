// Uhrzeit: NTP-Synchronisation in der Zeitzone des eingestellten Ortes (Standard Europe/Berlin), im Demo-Modus simulierte Uhr.
#pragma once
#include <time.h>

namespace timemgr
{
    void begin(bool demo);

    // Regelmäßig aus loop() aufrufen: startet die NTP-Synchronisation nach dem WLAN-Verbinden.
    void update();

    // Aktuelle Ortszeit. false, solange noch keine gültige Zeit vorliegt.
    bool now(struct tm &out);

    // Nur Demo: Uhr auf eine Uhrzeit (Sekunden seit Mitternacht) des Demo-Tages setzen.
    void demoSetTimeOfDay(int seconds);
    // Zeitzone aus den Einstellungen übernehmen (nach jeder Änderung aufrufen; ohne Änderung ohne Wirkung)
    void applyTimezone();
}

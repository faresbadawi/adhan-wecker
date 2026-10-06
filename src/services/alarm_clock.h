// Eigene Wecker: klingelt zur eingestellten Zeit an den gewählten Wochentagen.
// Ton: alarm.mp3 (SD-Karte /azan oder LittleFS), wird bis zum Stoppen wiederholt.
// Stoppen beendet den Wecker bis zum nächsten Termin, Schlummern lässt ihn nach einigen Minuten wieder klingeln.
#pragma once
#include <time.h>
#include "services/settings.h"

namespace alarmclock
{
    // Jede Sekunde aufrufen. azanActive: läuft gerade ein Azan, wartet der Wecker.
    void update(const struct tm &now, const settings::Settings &st, bool azanActive);

    // Beendet den Wecker (auch einen geschlummerten) bis zum nächsten Termin
    void stop();
    // Ton aus, nach minutes Minuten klingelt derselbe Wecker erneut
    void snooze(int minutes);
    bool ringing();
    int ringingIndex(); // Nummer des klingelnden Weckers, -1 wenn keiner

    // Nächste aktive Weckzeit ab jetzt (Minuten seit Mitternacht), -1 wenn keiner aktiv ist.
    // Ein geschlummerter Wecker zählt mit seiner Wiederholzeit.
    int nextAlarmMinutes(const struct tm &now, const settings::Settings &st);
}

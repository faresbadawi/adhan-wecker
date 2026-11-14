// Gebetszeiten von Moscheen auf Mawaqit (https://mawaqit.net).
// Es gibt keine offene Schnittstelle (die Suche ist seit 06.10.2026 den Mawaqit-Apps vorbehalten);
// genutzt wird nur die öffentliche Seite einer Moschee mit ihren Daten ("confData").
#pragma once
#include <Arduino.h>

namespace mawaqit
{
    // Angaben zu einer Moschee aus ihrer öffentlichen Seite
    struct Info
    {
        String slug;     // Kennung für mawaqit.net/<sprache>/<slug>
        String name;     // Anzeigename, z. B. "Kocatepe Camii"
        String country;  // Ländercode, z. B. "TR"
        String timezone; // z. B. "Europe/Istanbul"
        float latitude = 0, longitude = 0;
    };

    // Moschee über ihre Kennung (slug) oder ihre Nummer aus dem App-Link (mawaqit.net/xx/id/<nummer>) finden.
    // Liefert false, wenn es die Seite nicht gibt oder sie keinen Gebetskalender enthält.
    bool resolve(const char *slug, const char *id, Info &out);

    // Gebetszeiten eines Monats (1..12) der Moschee mit diesem Slug.
    // minutes[Tag-1][0..5] = Fajr, Sonnenaufgang, Dhuhr, Asr, Maghrib, Isha (Minuten seit Mitternacht).
    // days = Anzahl der Tage im Kalender. Darf nicht aus dem LVGL-Task aufgerufen werden (dauert Sekunden).
    bool fetchMonth(const char *slug, int month, uint16_t minutes[31][6], int &days);

    // Anmeldung mit dem Mawaqit-Konto des Nutzers (E-Mail und Passwort): liefert seinen Zugangsschlüssel.
    // Die Uhr speichert weder Passwort noch Schlüssel; die App behält den Schlüssel.
    // code: HTTP-Status von Mawaqit (401 = falsche Anmeldung, 0 = keine Verbindung).
    bool login(const char *user, const char *pass, String &token, int &code);

    // Moscheesuche mit dem Zugangsschlüssel: Suchwort (Name, Ort, Postleitzahl) oder Standort.
    // body: Antwort von Mawaqit (JSON-Liste); code wie bei login.
    bool search(const char *token, const char *word, float lat, float lon, bool byPlace, String &body, int &code);
}

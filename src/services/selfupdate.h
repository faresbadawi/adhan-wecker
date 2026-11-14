// Selbst-Updates aus dem Internet: Die Uhr lädt ein signiertes Verzeichnis (manifest.json + manifest.sig)
// von GitHub Pages, prüft die Unterschrift mit dem eingebauten öffentlichen Schlüssel und installiert
// eine neuere Firmware samt geänderten App-Dateien. Eigene Dateien (Hintergrund, eigene Azane, Weckton)
// und alle Einstellungen bleiben erhalten, weil nur die im Verzeichnis genannten Dateien ersetzt werden.
// Automatisch: einmal täglich nachts, wenn kein Gebet und kein Wecker kurz bevorsteht.
#pragma once
#include <Arduino.h>

namespace selfupdate
{
    enum class State : uint8_t
    {
        IDLE,        // noch nicht geprüft
        CHECKING,    // Verzeichnis wird geladen
        UP_TO_DATE,  // neueste Version installiert
        AVAILABLE,   // neuere Version gefunden
        INSTALLING,  // lädt und installiert (progress)
        DONE,        // installiert, Neustart folgt
        FAILED,      // Fehler (error)
    };

    struct Status
    {
        State state = State::IDLE;
        uint8_t progress = 0;   // 0..100 beim Installieren
        int latestBuild = 0;    // Nummer der neuesten Version (0 = unbekannt)
        char latestVersion[16] = "";
        char error[48] = "";
        uint32_t checkedAgoSec = 0; // seit der letzten Prüfung (0 = nie)
    };

    void begin();
    Status status();

    bool autoUpdate();         // täglich nachts selbst installieren (Standard: an)
    void setAutoUpdate(bool on);

    void requestCheck();       // im Hintergrund prüfen
    void requestInstall();     // prüfen und, wenn neuer, sofort installieren
}

// Zentrale: Die Uhr meldet sich alle 10 Minuten bei der Übersichtsseite des Herausgebers
// (Name, Stadt, Land, Version) und erfährt dabei, ob sie ein Update installieren soll.
// Die Adresse der Zentrale steht im signierten Update-Verzeichnis ("fleet"), nicht in der Firmware.
// Abschaltbar in der App (Gerät → Zentrale); es werden keine Koordinaten übertragen.
#pragma once
#include <Arduino.h>

namespace fleet
{
    void begin();

    bool enabled();            // Standard: an
    void setEnabled(bool on);

    String name();             // Anzeigename, Standard "Bilal-XXXX" (aus der Gerätenummer)
    void setName(const char *name);
    String id();               // feste Gerätenummer (12 Hex-Zeichen)

    // Adresse der Zentrale aus dem geprüften Update-Verzeichnis übernehmen
    void setUrl(const char *url);

    uint32_t lastContactAgoSec(); // 0 = noch nie erreicht
}

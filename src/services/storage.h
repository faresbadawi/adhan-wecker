// Speicher: SD-Karte und interner Flash (LittleFS) für Audiodateien,
// NVS (Preferences) für kleine Daten wie den Gebetszeiten-Cache.
#pragma once
#include <FS.h>

namespace storage
{
    // Bindet SD-Karte (falls eingelegt) und LittleFS ein.
    void begin();

    bool sdAvailable();
    bool flashAvailable();

    // Sucht eine Datei zuerst auf der SD-Karte (dirSd), dann im Flash (dirFlash).
    // Gibt das Dateisystem zurück und schreibt den vollständigen Pfad nach `path`, sonst nullptr.
    fs::FS *find(const char *dirSd, const char *dirFlash, const char *name, char *path, size_t pathLen);

    // Kleine Binärdaten dauerhaft im NVS speichern/laden.
    bool saveBlob(const char *key, const void *data, size_t len);
    bool loadBlob(const char *key, void *data, size_t len);
}

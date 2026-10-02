// MP3-Wiedergabe über I2S -> ES8311 -> Verstärker -> Lautsprecher.
// Dekodiert in einem eigenen Task auf Kern 0, damit die Oberfläche flüssig bleibt.
// Alle Funktionen dürfen aus dem Haupt-Task aufgerufen werden.
#pragma once
#include <FS.h>

namespace audio
{
    // Nach touch::begin() aufrufen (nutzt denselben I2C-Bus).
    bool begin(uint8_t decoderVolume, uint8_t codecVolume);

    // Startet die Wiedergabe; eine laufende Wiedergabe wird ersetzt.
    void play(fs::FS &fs, const char *path);
    void stop();
    void setVolume(uint8_t volume); // 0..21

    bool isPlaying();

    uint32_t elapsedSeconds();
    uint32_t durationSeconds(); // 0, solange unbekannt
}
